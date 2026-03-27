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

// ─── NOAA Storm Events via Zoho Creator (auth-protected) ─────────────────────
app.get("/api/noaa/stormevents", requireAuth, async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: "lat and lon required" });

  try {
    // Resolve county and state via FCC
    const fipsRes = await fetch(
      `https://geo.fcc.gov/api/census/block/find?latitude=${lat}&longitude=${lon}&format=json`
    );
    const fipsData = await fipsRes.json();
    const countyName = fipsData?.County?.name?.toUpperCase().replace(' COUNTY', '').trim();    const stateName = fipsData?.State?.name?.toUpperCase();

    if (!countyName || !stateName) {
      return res.status(404).json({ error: "Could not resolve county" });
    }

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

    // Query Zoho Creator for hail events in this county/state
   const hailRes = await fetch(
`https://creator.zoho.com/api/v2/trinity5/swi-storm-events/report/All_Storm_Events?criteria=county%3D%22${countyName}%22%20AND%20state%3D%22${stateName}%22%20AND%20event_type%3D%22Hail%22&limit=200`,  { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
);
    const hailData = await hailRes.json();

    // Query for other severe weather events
    const otherRes = await fetch(
  `https://creator.zoho.com/api/v2/trinity5/swi-storm-events/report/All_Storm_Events?criteria=county%3D%22${countyName}%22%20AND%20state%3D%22${stateName}%22%20AND%20event_type!%3D%22Hail%22&limit=200`,
  { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
);
    const otherData = await otherRes.json();

    const normalize = (records) => (records || []).map(r => ({
      date: r.event_date,
      type: r.event_type,
      magnitude: r.magnitude,
      magnitudeType: r.magnitude_type,
      location: r.location,
      county: r.county,
      state: r.state,
      injuries: r.injuries,
      deaths: r.deaths,
      propertyDamage: r.property_damage,
      narrative: r.narrative,
      source: r.source,
    }));

    const hailEvents = normalize(hailData?.data);
    const otherEvents = normalize(otherData?.data);

    res.json({
      county: fipsData?.County?.name,
      state: fipsData?.State?.name,
      hailCount: hailEvents.length,
      otherCount: otherEvents.length,
      hailEvents,
      otherEvents,
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── NEXRAD Level-3 Hail Detection (SWDI) (auth-protected) ──────────────────
app.get("/api/nexrad", requireAuth, async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) return res.status(400).json({ error: "lat and lon required" });

  try {
    const endYear = new Date().getFullYear();
    const startYear = endYear - 10;
    const bbox = [
      (parseFloat(lon) - 0.5).toFixed(4),
      (parseFloat(lat) - 0.5).toFixed(4),
      (parseFloat(lon) + 0.5).toFixed(4),
      (parseFloat(lat) + 0.5).toFixed(4),
    ].join(",");

    // Query NOAA SWDI for NEXRAD Level-3 hail signatures
    // nx3hail = radar-detected hail, includes max size and probability
// SWDI max window is 744 hours (~31 days) — fetch month by month
    const monthFetches = [];
    for (let y = startYear; y <= endYear; y++) {
      for (let m = 1; m <= 12; m++) {
        const mm = String(m).padStart(2, "0");
        const lastDay = new Date(y, m, 0).getDate();
        const url =
          `https://www.ncei.noaa.gov/swdiws/csv/nx3hail/` +
          `${y}${mm}01:${y}${mm}${lastDay}` +
          `?bbox=${bbox}&limit=10000`;
        monthFetches.push(
          fetch(url, { headers: { "User-Agent": "SevereWeatherIntelligence/1.0 (trinitypllc.com)" } })
            .then((r) => r.ok ? r.text() : Promise.resolve(""))
            .catch(() => "")
        );
      }
    }

// Batch requests 6 at a time to avoid SWDI rate limiting
    const yearCsvs = [];
    for (let i = 0; i < monthFetches.length; i += 6) {
      const batch = await Promise.all(monthFetches.slice(i, i + 6));
      yearCsvs.push(...batch);
    }
    const nonEmpty = yearCsvs.filter(c => c.trim().length > 0 && c.includes("ZTIME"));
    console.log(`NEXRAD: ${monthFetches.length} requests, ${nonEmpty.length} non-empty responses`);
    console.log(`NEXRAD nonEmpty[0] length:`, nonEmpty[0]?.length);
    console.log(`NEXRAD nonEmpty[0] preview:`, JSON.stringify(nonEmpty[0]?.slice(0, 200)));
    
    let headers = null;
    const records = [];
    nonEmpty.forEach((csv) => {
      if (!csv.trim()) return;
      const lines = csv.trim().split("\n");
      if (!headers) headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
      lines.slice(1).forEach((line) => {
        const vals = line.split(",").map((v) => v.trim().replace(/"/g, ""));
        const obj = {};
        headers.forEach((h, i) => (obj[h] = vals[i]));
        if (obj.ZTIME && obj.MAXSIZE && parseFloat(obj.MAXSIZE) > 0) records.push(obj);
      });
    });

    const hits = records.map((r) => ({
      date: r.ZTIME?.slice(0, 10),
      time: r.ZTIME?.slice(11, 16),
      maxSizeIn: parseFloat(r.MAXSIZE).toFixed(2),
      probHail: r.PROB ? parseInt(r.PROB) : null,
      probSevere: r.SEVPROB ? parseInt(r.SEVPROB) : null,
      radar: r.NEXRAD || null,
      lat: r.LAT ? parseFloat(r.LAT) : null,
      lon: r.LON ? parseFloat(r.LON) : null,
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
