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
// ─── NOAA NCEI Storm Events (auth-protected) ─────────────────────────────────
app.get("/api/noaa/events", requireAuth, async (req, res) => {
  const token = process.env.NOAA_TOKEN;
  if (!token) return res.status(500).json({ error: "NOAA_TOKEN not configured" });

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

    if (!fips) return res.status(404).json({ error: "Could not resolve county FIPS" });

    // Step 2: Query NOAA CDO for storm events using location by FIPS
    const startYear = startDate ? startDate.slice(0, 4) : new Date().getFullYear() - 5;
    const endYear = endDate ? endDate.slice(0, 4) : new Date().getFullYear();
    const start = `${startYear}-01-01`;
    const end = `${endYear}-12-31`;

    // Use NOAA CDO v2 data endpoint with proper Accept header for JSON
    const cdoRes = await fetch(
      `https://www.ncdc.noaa.gov/cdo-web/api/v2/data?` +
      `datasetid=GHCND&` +
      `locationid=FIPS:${fips}&` +
      `startdate=${start}&` +
      `enddate=${end}&` +
      `datatypeid=PRCP,SNOW,TMAX,TMIN&` +
      `limit=100&` +
      `units=standard`,
      {
        headers: {
          token,
          Accept: "application/json",
        },
      }
    );

    if (!cdoRes.ok) {
      throw new Error(`NOAA CDO returned ${cdoRes.status}`);
    }

    const cdoData = await cdoRes.json();

    // Step 3: Also query IEM for hail-specific LSR events in this county
    const startFmt = start.replace(/-/g, "");
    const endFmt = end.replace(/-/g, "");
    const lsrRes = await fetch(
      `https://mesonet.agron.iastate.edu/geojson/lsr.php?` +
      `sts=${startFmt}0000&ets=${endFmt}2359&type=H&` +
      `lon=${lon}&lat=${lat}&radius=30`,
      { headers: { "User-Agent": "SevereWeatherIntelligence/1.0 (trinitypllc.com)" } }
    );
    const lsrData = await lsrRes.json();

    const hailReports = (lsrData?.features || []).map((f) => ({
      date: f.properties?.utc_valid?.slice(0, 10),
      magnitude: f.properties?.magnitude,
      city: f.properties?.city,
      county: f.properties?.county,
      state: f.properties?.state,
      remark: f.properties?.remark,
      source: f.properties?.source,
      lat: f.geometry?.coordinates?.[1],
      lon: f.geometry?.coordinates?.[0],
    }));

    res.json({
      fips,
      county: countyName,
      state: stateName,
      dateRange: { start, end },
      hailReports,
      stationData: cdoData?.results || [],
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
