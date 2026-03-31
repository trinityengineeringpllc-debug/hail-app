require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const authRoutes = require("./routes/auth");

const app = express();

// ─── MongoDB ──────────────────────────────────────────────────────────────────
if (!process.env.MONGODB_URI) {
  console.error("ERROR: MONGODB_URI is not set in .env");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err.message);
    // Don't exit — Render will keep the process alive; fix Atlas IP whitelist
  });

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(
  cors({
    origin: (origin, cb) => {
      // Reflect the request origin back — required for credentials: true cross-origin
      cb(null, origin || "*");
    },
    credentials: true,
  })
);

// ─── Auth routes ──────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);

// Keep old /api/login + /api/session + /api/logout paths working
// so existing frontend calls don't break during transition
app.post("/api/login", (req, res) => res.redirect(307, "/api/auth/login"));
app.post("/api/logout", (req, res) => res.redirect(307, "/api/auth/logout"));
app.get("/api/session", (req, res) => res.redirect(307, "/api/auth/session"));

// ─── Auth middleware for protected routes ────────────────────────────────────
const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  // Check Authorization header first (mobile/PWA), then cookie (desktop)
  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.startsWith("Bearer "))
    ? authHeader.slice(7)
    : req.cookies?.hail_auth;

  if (!token) {
    return res.status(401).json({ sessionExpired: true, error: { message: "Not authenticated." } });
  }
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ sessionExpired: true, error: { message: "Session expired." } });
  }
}

// ─── Anthropic proxy (auth-protected) ────────────────────────────────────────
app.post("/api/anthropic", requireAuth, async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: { message: "ANTHROPIC_API_KEY not configured" } });
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "web-search-2025-03-05",
      },
      body: JSON.stringify(req.body),
    });

    const text = await upstream.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res
        .status(502)
        .json({ error: { message: `Unexpected response: ${text.slice(0, 200)}` } });
    }

    // Anthropic's own 401 (bad API key) → return as 502 so frontend doesn't
    // mistake it for a session expiry
    const statusCode = upstream.status === 401 ? 502 : upstream.status;
    res.status(statusCode).json(data);
  } catch (err) {
    res.status(500).json({ error: { message: err.message || "Proxy error" } });
  }
});
// ─── NOAA Storm Events + SWDI Hail (auth-protected) ─────────────────────────
app.get("/api/noaa/events", requireAuth, async (req, res) => {
  const { lat, lon, startDate, endDate } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: "lat and lon required" });

  try {
    // Step 1: Resolve county FIPS via FCC API
    const fipsRes = await fetch(
      `https://geo.fcc.gov/api/census/block/find?latitude=${lat}&longitude=${lon}&format=json`
    );
    const fipsData = await fipsRes.json();
    const fips = fipsData?.County?.FIPS;
    const countyName = fipsData?.County?.name;
    const stateName = fipsData?.State?.name;
    const stateCode = fipsData?.State?.code;

    if (!fips) return res.status(404).json({ error: "Could not resolve county FIPS" });

    const startYear = startDate ? startDate.slice(0, 4) : new Date().getFullYear() - 10;
    const endYear = endDate ? endDate.slice(0, 4) : new Date().getFullYear();
    const startFmt = `${startYear}0101`;
    const endFmt = `${endYear}1231`;

    // Step 2: Query SWDI for NEXRAD hail signatures at this location
    // This gives us radar-derived hail data — same source as commercial products
    const swdiUrl = `https://www.ncei.noaa.gov/access/swdi/services/json/` +
      `nhail?` +
      `bbox=${parseFloat(lon) - 0.3},${parseFloat(lat) - 0.3},` +
      `${parseFloat(lon) + 0.3},${parseFloat(lat) + 0.3}&` +
      `starttime=${startYear}-01-01T00:00:00&` +
      `endtime=${endYear}-12-31T23:59:59&` +
      `limit=1000`;

    // Step 3: Query IEM for all severe weather LSRs in parallel
    const [swdiRes, hailRes, windRes, torRes] = await Promise.all([
      fetch(swdiUrl, {
        headers: { "User-Agent": "SevereWeatherIntelligence/1.0 (trinitypllc.com)" }
      }),
      fetch(
        `https://mesonet.agron.iastate.edu/geojson/lsr.php?sts=${startFmt}0000&ets=${endFmt}2359&type=H&lon=${lon}&lat=${lat}&radius=25`,
        { headers: { "User-Agent": "SevereWeatherIntelligence/1.0 (trinitypllc.com)" } }
      ),
      fetch(
        `https://mesonet.agron.iastate.edu/geojson/lsr.php?sts=${startFmt}0000&ets=${endFmt}2359&type=G&lon=${lon}&lat=${lat}&radius=25`,
        { headers: { "User-Agent": "SevereWeatherIntelligence/1.0 (trinitypllc.com)" } }
      ),
      fetch(
        `https://mesonet.agron.iastate.edu/geojson/lsr.php?sts=${startFmt}0000&ets=${endFmt}2359&type=T&lon=${lon}&lat=${lat}&radius=25`,
        { headers: { "User-Agent": "SevereWeatherIntelligence/1.0 (trinitypllc.com)" } }
      ),
    ]);

    const [swdiData, hailData, windData, torData] = await Promise.all([
      swdiRes.json().catch(() => ({ features: [] })),
      hailRes.json().catch(() => ({ features: [] })),
      windRes.json().catch(() => ({ features: [] })),
      torRes.json().catch(() => ({ features: [] })),
    ]);

    // Normalize SWDI NEXRAD hail signatures
    const nexradHail = (swdiData?.features || []).map((f) => ({
      type: "Hail",
      date: f.properties?.ZTIME?.slice(0, 10),
      time: f.properties?.ZTIME?.slice(11, 16),
      magnitude: f.properties?.MAXSIZE,
      magnitudeUnit: "IN",
      probability: f.properties?.PROB,
      city: countyName,
      county: countyName,
      state: stateName,
      lat: f.geometry?.coordinates?.[1],
      lon: f.geometry?.coordinates?.[0],
      source: "NEXRAD/SWDI",
      remark: `NEXRAD hail signature. Max size: ${f.properties?.MAXSIZE}" Probability: ${f.properties?.PROB}%`,
    }));

    // Normalize LSR events
    const normalizeFeatures = (features, type) =>
      (features || []).map((f) => ({
        type,
        date: f.properties?.utc_valid?.slice(0, 10),
        time: f.properties?.utc_valid?.slice(11, 16),
        magnitude: f.properties?.magnitude,
        magnitudeUnit: f.properties?.magnitude_f || (type === "Hail" ? "IN" : "MPH"),
        city: f.properties?.city,
        county: f.properties?.county,
        state: f.properties?.state,
        remark: f.properties?.remark,
        source: f.properties?.source,
        lat: f.geometry?.coordinates?.[1],
        lon: f.geometry?.coordinates?.[0],
      }));

    const lsrEvents = [
      ...normalizeFeatures(hailData?.features, "Hail"),
      ...normalizeFeatures(windData?.features, "Wind"),
      ...normalizeFeatures(torData?.features, "Tornado"),
    ];

    // Combine all events, sorted by date descending
    const allEvents = [...nexradHail, ...lsrEvents]
      .sort((a, b) => (a.date > b.date ? -1 : 1));

    res.json({
      fips,
      county: countyName,
      state: stateName,
      stateCode,
      dateRange: { start: `${startYear}-01-01`, end: `${endYear}-12-31` },
      totalEvents: allEvents.length,
      nexradHailCount: nexradHail.length,
      lsrHailCount: hailData?.features?.length || 0,
      windCount: windData?.features?.length || 0,
      tornadoCount: torData?.features?.length || 0,
      events: allEvents,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── IEM/SPC Local Storm Reports (auth-protected) ────────────────────────────
app.get("/api/lsr", requireAuth, async (req, res) => {
  const { lat, lon, startDate, endDate, radius = 25 } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: "lat and lon required" });

  try {
    const start = (startDate || `${new Date().getFullYear() - 5}-01-01`).replace(/-/g, "");
    const end = (endDate || `${new Date().getFullYear()}-12-31`).replace(/-/g, "");

    // IEM LSR API — returns spotter-confirmed hail reports near a point
    const url = `https://mesonet.agron.iastate.edu/geojson/lsr.php?sts=${start}0000&ets=${end}2359&wfos=&type=H&lon=${lon}&lat=${lat}&radius=${radius}`;

    const iemRes = await fetch(url, {
      headers: { "User-Agent": "SevereWeatherIntelligence/1.0 (trinitypllc.com)" }
    });

    if (!iemRes.ok) throw new Error(`IEM API returned ${iemRes.status}`);

    const data = await iemRes.json();

    // Normalize to a clean array
    const reports = (data?.features || []).map((f) => ({
      date: f.properties?.utc_valid?.slice(0, 10),
      time: f.properties?.utc_valid?.slice(11, 16),
      magnitude: f.properties?.magnitude,
      magnitudeUnit: f.properties?.magnitude_f || "IN",
      city: f.properties?.city,
      county: f.properties?.county,
      state: f.properties?.state,
      remark: f.properties?.remark,
      source: f.properties?.source,
      lat: f.geometry?.coordinates?.[1],
      lon: f.geometry?.coordinates?.[0],
      distanceMi: null, // calculated client-side if needed
    }));

    res.json({ count: reports.length, reports });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Visual Crossing station observations (auth-protected) ───────────────────
app.get("/api/stations", requireAuth, async (req, res) => {
  const apiKey = process.env.VISUAL_CROSSING_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "VISUAL_CROSSING_API_KEY not configured" });

  const { lat, lon, date } = req.query;
  if (!lat || !lon || !date) return res.status(400).json({ error: "lat, lon, and date required" });

  try {
    // Visual Crossing historical weather — returns obs from nearby stations
    const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${lat},${lon}/${date}/${date}?unitGroup=us&include=obs,stations&key=${apiKey}&contentType=json`;

    const vcRes = await fetch(url);
    if (!vcRes.ok) {
      const errText = await vcRes.text();
      throw new Error(`Visual Crossing error ${vcRes.status}: ${errText.slice(0, 200)}`);
    }

    const vcData = await vcRes.json();
    const day = vcData?.days?.[0];
    const stationsRaw = vcData?.stations || {};

    // Normalize stations into IDW-ready format
    const stations = Object.entries(stationsRaw).map(([id, s]) => ({
      id,
      name: s.name,
      lat: s.latitude,
      lon: s.longitude,
      distanceMi: s.distance ? (s.distance * 0.000621371).toFixed(1) : null,
      source: "Visual Crossing / ASOS",
      // Weather obs for this date
      windSpeedMph: s.wspd ?? day?.windspeed ?? 0,
      windGustMph: s.wgust ?? day?.windgust ?? 0,
      tempF: s.temp ?? null,
      precip: s.precip ?? day?.precip ?? 0,
      conditions: s.conditions || day?.conditions || "",
      // Hail not directly in VC — will be enriched by LSR data
      hailSizeIn: 0,
      hailProbability: 0,
    }));

    res.json({
      date,
      location: { lat, lon },
      conditions: day?.conditions,
      precip: day?.precip,
      windspeed: day?.windspeed,
      windgust: day?.windgust,
      stations,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── NEXRAD Level-3 Hail Detection via Zoho Creator (auth-protected) ─────────
app.get("/api/nexrad", requireAuth, async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: "lat and lon required" });

  try {
    const endYear = new Date().getFullYear();
    const startYear = endYear - 10;

    // Compute tile key from property lat/lon
    const tileLat = Math.floor(parseFloat(lat));
    const tileLon = Math.floor(parseFloat(lon));
    const tileKey = `${tileLat},${tileLon}`;

    // Get Zoho access token
    const tokenRes = await fetch("https://accounts.zoho.com/oauth/v2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: process.env.ZOHO_REFRESH_TOKEN,
        client_id: process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        grant_type: "refresh_token",
      }),
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) throw new Error("Failed to get Zoho access token");

    console.log(`NEXRAD tile key: ${tileKey}`);
    // Query Zoho by exact tile match
    const criteria = encodeURIComponent(`tile1 == "${tileKey}"`);
    const zohoRes = await fetch(
      `https://creator.zoho.com/api/v2/trinity5/swi-storm-events/report/All_Nexrad_Hail_Events?criteria=${criteria}&limit=1000`,
      { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
    );
    const zohoData = await zohoRes.json();
    console.log(`NEXRAD Zoho response:`, JSON.stringify(zohoData).slice(0, 300));

    const records = zohoData?.data || [];

    // Filter precisely to 0.5° bbox in Node
    const latMin = parseFloat(lat) - 0.5;
    const latMax = parseFloat(lat) + 0.5;
    const lonMin = parseFloat(lon) - 0.5;
    const lonMax = parseFloat(lon) + 0.5;

    const filtered = records.filter(r => {
      const rLat = parseFloat(r.lat);
      const rLon = parseFloat(r.lon);
      return rLat >= latMin && rLat <= latMax && rLon >= lonMin && rLon <= lonMax;
    });

    const hits = filtered.map((r) => ({
      date: r.event_date,
      maxSizeIn: parseFloat(r.max_size).toFixed(2),
      probHail: r.prob_hail ? parseInt(r.prob_hail) : null,
      probSevere: r.prob_severe ? parseInt(r.prob_severe) : null,
      radar: r.radar || null,
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon),
      source: "NEXRAD Level-3 HDA / NOAA SWDI",
    }));

    // Deduplicate by date — keep max size per day
    const byDate = {};
    hits.forEach((h) => {
      if (!byDate[h.date] || parseFloat(h.maxSizeIn) > parseFloat(byDate[h.date].maxSizeIn)) {
        byDate[h.date] = h;
      }
    });

    const deduplicated = Object.values(byDate).sort((a, b) =>
      a.date > b.date ? -1 : 1
    );

    res.json({
      count: deduplicated.length,
      dateRange: { start: `${startYear}-01-01`, end: `${endYear}-12-31` },
      hits: deduplicated,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ─── Health ───────────────────────────────────────────────────────────────────
app.get("/health", (req, res) => res.json({ status: "ok" }));

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);

  // Keep-alive ping every 14 minutes to prevent Render free tier sleep
  if (process.env.NODE_ENV === "production" && process.env.RENDER_EXTERNAL_URL) {
    setInterval(() => {
      fetch(`${process.env.RENDER_EXTERNAL_URL}/health`)
        .then(() => console.log("Keep-alive ping sent"))
        .catch(() => {});
    }, 14 * 60 * 1000);
  }
});
