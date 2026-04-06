// ─────────────────────────────────────────────────────────────────────────────
// MULTI-SOURCE DOL STORM ANALYSIS ENGINE
// ─────────────────────────────────────────────────────────────────────────────

const EARTH_RADIUS_MILES = 3958.8;

function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_MILES * 2 * Math.asin(Math.sqrt(a));
}

function computeConfidence(nearestMi, stationCount, windValues) {
  const distFactor = Math.exp(-nearestMi / 8);
  const countFactor = 1 - Math.exp(-stationCount / 2);
  let spreadFactor = 1;
  if (windValues.length > 1) {
    const mean = windValues.reduce((s, v) => s + v, 0) / windValues.length;
    if (mean > 0) {
      const variance = windValues.reduce((s, v) => s + (v - mean) ** 2, 0) / windValues.length;
      const stdDev = Math.sqrt(variance);
      spreadFactor = Math.max(0, 1 - stdDev / mean);
    }
  }
  const raw = distFactor * 0.6 + countFactor * 0.25 + spreadFactor * 0.15;
  const confidence = Math.min(Math.max(raw, 0.05), 0.97);
  let confidenceLabel;
  if (confidence >= 0.75) confidenceLabel = "HIGH";
  else if (confidence >= 0.55) confidenceLabel = "MODERATE";
  else if (confidence >= 0.35) confidenceLabel = "LOW";
  else confidenceLabel = "VERY LOW";
  return { confidence: parseFloat(confidence.toFixed(3)), confidenceLabel };
}

// ─────────────────────────────────────────────────────────────────────────────
// NCAR HAIL MELTING CHART — Knight (1981)
// surfaceSize = aloftSize × e^(−k × freezeLevelFt), k = 0.000055
// ─────────────────────────────────────────────────────────────────────────────
export function meltingChartEstimate(hailSizeAloftIn, freezeLevelFt) {
  if (!hailSizeAloftIn || !freezeLevelFt) return null;
  const k = 0.000055;
  const surface = hailSizeAloftIn * Math.exp(-k * freezeLevelFt);
  return parseFloat(Math.max(surface, 0).toFixed(2));
}

// ─────────────────────────────────────────────────────────────────────────────
// runIDW — wind interpolation only.
// ASOS instrumentation does not detect hail. Hail probability is derived
// exclusively from NEXRAD POSH per FMH-11 Part C §2.18.
// ─────────────────────────────────────────────────────────────────────────────
export function runIDW(targetLat, targetLon, stations, power = 2) {
  if (!stations || stations.length === 0) return null;

  const withDistances = stations
    .map((s) => ({
      ...s,
      distanceMiles: haversineDistance(targetLat, targetLon, s.lat, s.lon),
    }))
    .filter((s) => s.distanceMiles > 0.01);

  if (withDistances.length === 0) return null;

  const sorted = [...withDistances].sort((a, b) => a.distanceMiles - b.distanceMiles);
  const weighted = sorted.map((s) => ({
    ...s,
    weight: 1 / Math.pow(s.distanceMiles, power),
  }));
  const totalWeight = weighted.reduce((sum, s) => sum + s.weight, 0);

  const windSpeed = weighted.reduce((sum, s) => sum + s.weight * (s.windSpeedMph ?? 0), 0) / totalWeight;
  const windGust  = weighted.reduce((sum, s) => sum + s.weight * (s.windGustMph  ?? 0), 0) / totalWeight;

  const nearestMi = sorted[0].distanceMiles;
  const { confidence, confidenceLabel } = computeConfidence(
    nearestMi,
    sorted.length,
    sorted.map((s) => s.windSpeedMph ?? 0)
  );

  return {
    windSpeedMph:         parseFloat(windSpeed.toFixed(1)),
    windGustMph:          parseFloat(windGust.toFixed(1)),
    method:               "IDW Spatial Interpolation (Shepard, 1968)",
    methodVersion:        "1.0.0",
    stationCount:         sorted.length,
    nearestStationMiles:  parseFloat(nearestMi.toFixed(2)),
    nearestStationName:   sorted[0].name,
    confidence,
    confidenceLabel,
    stationsUsed: weighted.map((s) => ({
      id:              s.id,
      name:            s.name,
      source:          s.source,
      distanceMiles:   parseFloat(s.distanceMiles.toFixed(2)),
      contributionPct: parseFloat(((s.weight / totalWeight) * 100).toFixed(1)),
    })),
    computedAt: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DARK THEME TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  bg:          "#03070f",
  panel:       "#050b14",
  border:      "#17325f",
  borderSoft:  "#102240",
  text:        "#eef3ff",
  muted:       "#7ea2df",
  muted2:      "#4d6797",
  blue:        "#76a8ff",
  blueBright:  "#8db7ff",
  button:      "#5e86f0",
  white:       "#ffffff",
  green:       "#4caf7e",
  greenBg:     "#0a1f15",
  greenBorder: "#1e5c38",
  amber:       "#f0b432",
  amberBg:     "#1a1200",
  amberBorder: "#7a5500",
  red:         "#ff6b6b",
  redBg:       "#1a0505",
  redBorder:   "#7a2020",
};

// ─────────────────────────────────────────────────────────────────────────────
// SHARED UI ATOMS
// ─────────────────────────────────────────────────────────────────────────────
function ConfidenceBadge({ label }) {
  const map = {
    HIGH:       { bg: T.greenBg,  border: T.greenBorder, text: T.green },
    MODERATE:   { bg: T.amberBg,  border: T.amberBorder, text: T.amber },
    LOW:        { bg: "#1a0e00",  border: "#7a4000",      text: "#e07a20" },
    "VERY LOW": { bg: T.redBg,    border: T.redBorder,    text: T.red   },
  };
  const s = map[label] || map["VERY LOW"];
  return (
    <span style={{
      background: s.bg, border: `1px solid ${s.border}`, color: s.text,
      padding: "3px 10px", borderRadius: 4, fontSize: 10,
      fontFamily: '"IBM Plex Mono", monospace', letterSpacing: "0.1em", fontWeight: 700,
    }}>
      {label}
    </span>
  );
}

function MetricCard({ label, value, unit, sublabel }) {
  return (
    <div style={{
      background: T.bg, border: `1px solid ${T.border}`,
      borderTop: `3px solid ${T.blue}`, borderRadius: 8,
      padding: "14px 16px", flex: 1, minWidth: 120,
    }}>
      <div style={{
        color: T.muted2, fontSize: 9, fontFamily: '"IBM Plex Mono", monospace',
        letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8,
      }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ color: T.blueBright, fontSize: 28, fontFamily: '"IBM Plex Mono", monospace', fontWeight: 700, lineHeight: 1 }}>
          {value ?? "—"}
        </span>
        <span style={{ color: T.muted2, fontSize: 11, fontFamily: '"IBM Plex Mono", monospace' }}>
          {unit}
        </span>
      </div>
      {sublabel && (
        <div style={{ color: T.muted2, fontSize: 10, marginTop: 5, fontFamily: '"IBM Plex Mono", monospace' }}>
          {sublabel}
        </div>
      )}
    </div>
  );
}

function StationTable({ stations }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
      <thead>
        <tr style={{ borderBottom: `1px solid ${T.border}` }}>
          {["Station", "Source", "Distance", "Weight"].map((h) => (
            <th key={h} style={{
              color: T.muted2, fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 9, letterSpacing: "0.1em", textAlign: "left",
              padding: "6px 10px", fontWeight: 600,
            }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {stations.map((s, i) => (
          <tr key={s.id || i} style={{ borderBottom: `1px solid ${T.borderSoft}` }}>
            <td style={{ color: T.text, padding: "7px 10px", fontFamily: '"IBM Plex Mono", monospace', fontSize: 11 }}>{s.name}</td>
            <td style={{ color: T.muted, padding: "7px 10px", fontFamily: '"IBM Plex Mono", monospace', fontSize: 11 }}>{s.source}</td>
            <td style={{ color: T.text, padding: "7px 10px", fontFamily: '"IBM Plex Mono", monospace', fontSize: 11 }}>{s.distanceMiles} mi</td>
            <td style={{ padding: "7px 10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ height: 4, borderRadius: 2, background: T.blue, width: `${Math.max(s.contributionPct, 4)}%`, maxWidth: 80, opacity: 0.7 }} />
                <span style={{ color: T.muted, fontFamily: '"IBM Plex Mono", monospace', fontSize: 10 }}>{s.contributionPct}%</span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED STYLE HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const sectionWrap = { marginBottom: 20 };

const methodNote = {
  background: "#0a0e18",
  border: "1px solid #7a5500",
  borderLeft: "4px solid #f0b432",
  borderRadius: 6,
  padding: "10px 14px",
  color: "#7ea2df",
  fontSize: 10,
  lineHeight: 1.8,
  fontFamily: "Inter, Arial, sans-serif",
  marginTop: 10,
};

function SectionHeader({ label, citation }) {
  return (
    <div style={{ marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${T.borderSoft}` }}>
      <div style={{ color: T.muted2, fontSize: 9, letterSpacing: "0.15em", fontFamily: '"IBM Plex Mono", monospace', textTransform: "uppercase", fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ color: T.muted2, fontSize: 9, fontFamily: '"IBM Plex Mono", monospace', fontStyle: "italic", marginTop: 2 }}>
        {citation}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — NEXRAD HAIL ANALYSIS
// Source: NWS WSR-88D · FMH-11 Part C §2.18
// ─────────────────────────────────────────────────────────────────────────────
function NexradHailSection({ nexradHit, beamGeometry }) {
  if (!nexradHit) {
    return (
      <div style={sectionWrap}>
        <SectionHeader label="NEXRAD HAIL ANALYSIS" citation="NWS WSR-88D · FMH-11 Part C §2.18" />
        <div style={{
          background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8,
          padding: "16px", color: T.muted, fontSize: 12, lineHeight: 1.8,
          fontFamily: "Inter, Arial, sans-serif",
        }}>
          <span style={{ color: "#ff9c4d", marginRight: 8, fontWeight: 700 }}>◆ NULL RESULT</span>
          No WSR-88D hail detection within search radius for this date of loss. This is a null result — not a zero probability statement. Absence of radar detection does not confirm absence of hail; beam geometry limitations may apply at extended range.
        </div>
      </div>
    );
  }

  const posh = nexradHit.probSevere ?? null;
  const poh  = nexradHit.probHail   ?? null;
  const maxSizeAloft = parseFloat(nexradHit.maxSizeIn);

  return (
    <div style={sectionWrap}>
      <SectionHeader label="NEXRAD HAIL ANALYSIS" citation="NWS WSR-88D · FMH-11 Part C §2.18" />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <MetricCard
          label="Hail Probability (POSH)"
          value={posh ?? "—"}
          unit={posh != null ? "%" : ""}
          sublabel='prob. severe hail ≥ 0.75" at surface'
        />
        <MetricCard
          label="Hail Probability (POH)"
          value={poh ?? "—"}
          unit={poh != null ? "%" : ""}
          sublabel="prob. any hail at surface"
        />
        <MetricCard
          label="Max Size Aloft"
          value={maxSizeAloft}
          unit="in"
          sublabel="WSR-88D HDA — not ground level"
        />
        <MetricCard
          label="Detecting Radar"
          value={nexradHit.radar ?? "—"}
          unit=""
          sublabel="NWS WSR-88D site"
        />
      </div>

      {beamGeometry && (
        <div style={{
          background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8,
          padding: "12px 16px", marginBottom: 12,
          fontFamily: '"IBM Plex Mono", monospace',
        }}>
          <div style={{ color: T.muted2, fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>
            BEAM GEOMETRY · FMH-11 PART C
          </div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {[
              ["Radar Site",  beamGeometry.radarId],
              ["Distance",    `${beamGeometry.distMi} mi`],
              ["Beam Bottom", `${beamGeometry.beamBottom} ft AGL`],
              ["Beam Center", `${beamGeometry.beamCenter} ft AGL`],
              ["Beam Width",  `${beamGeometry.beamWidth} ft`],
              ["Reliability", beamGeometry.reliability.toUpperCase()],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ color: T.muted2, fontSize: 8, marginBottom: 3 }}>{k}</div>
                <div style={{ color: k === "Reliability" ? beamGeometry.color : T.text, fontWeight: 700, fontSize: 11 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={methodNote}>
        <span style={{ color: T.amber, fontWeight: 700 }}>◆ METHODOLOGY</span> · POSH and POH values are NWS operational products derived from the WSR-88D Hail Detection Algorithm (HDA). POSH represents the probability of severe hail (≥0.75") at the surface, accounting for reflectivity thresholds and freezing level height. POH represents probability of any hail occurrence. These are published NWS products derived from nationally calibrated algorithms — not proprietary estimates. Per FMH-11 Part C §2.18. Max size represents detection aloft; surface size is estimated below via Knight (1981).
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — EST. SURFACE HAIL SIZE
// Source: Knight (1981) NCAR Hail Melting Chart · U. of Wyoming Radiosonde
// ─────────────────────────────────────────────────────────────────────────────
function SurfaceHailSection({ nexradHit, freezeLevelFt }) {
  if (!nexradHit || !freezeLevelFt) return null;
  const aloftSize   = parseFloat(nexradHit.maxSizeIn);
  const surfaceSize = meltingChartEstimate(aloftSize, freezeLevelFt);
  if (surfaceSize == null) return null;

  return (
    <div style={sectionWrap}>
      <SectionHeader
        label="EST. SURFACE HAIL SIZE"
        citation="Knight (1981) NCAR Hail Melting Chart · U. of Wyoming Radiosonde Archive"
      />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <MetricCard label="Radar Size (Aloft)"   value={aloftSize}                    unit="in"  sublabel="WSR-88D HDA detection" />
        <MetricCard label="Freezing Level"        value={freezeLevelFt?.toLocaleString()} unit="ft"  sublabel="radiosonde 0°C interpolation" />
        <MetricCard label="Est. Surface Size"     value={surfaceSize}                  unit="in"  sublabel="after melting descent" />
      </div>
      <div style={methodNote}>
        <span style={{ color: T.amber, fontWeight: 700 }}>◆ METHODOLOGY</span> · Surface hail size estimated using exponential decay model: surfaceSize = aloftSize × e^(−k × freezeLevelFt), where k = 0.000055, per Knight (1981) empirical regression from NCAR hail melting data. Freezing level derived from University of Wyoming upper-air sounding archive, interpolated linearly to 0°C isotherm. This estimate represents expected hail size at ground level after thermal descent through the warm layer below the freezing level. Actual surface size may vary with local atmospheric conditions.
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 — WIND INTERPOLATION
// Source: IDW Haversine (Shepard, 1968) · ASOS / Visual Crossing
// ─────────────────────────────────────────────────────────────────────────────
function WindInterpolationSection({ idwResult }) {
  if (!idwResult) return null;
  const r = idwResult;

  return (
    <div style={sectionWrap}>
      <SectionHeader
        label="WIND INTERPOLATION"
        citation="IDW Spatial Interpolation (Shepard, 1968) · ASOS / Visual Crossing"
      />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <MetricCard label="Wind Speed"       value={r.windSpeedMph}           unit="mph" sublabel="sustained" />
        <MetricCard label="Wind Gust"        value={r.windGustMph}            unit="mph" sublabel="peak gust" />
        <MetricCard label="Station Count"    value={r.stationCount}           unit=""    sublabel="contributing ASOS" />
        <MetricCard label="Nearest Station"  value={`${r.nearestStationMiles} mi`} unit="" sublabel={r.nearestStationName} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: T.muted2, fontSize: 9, letterSpacing: "0.1em", fontFamily: '"IBM Plex Mono", monospace' }}>
              IDW CONFIDENCE
            </span>
            <ConfidenceBadge label={r.confidenceLabel} />
          </div>
          <span style={{ color: T.blueBright, fontSize: 10, fontFamily: '"IBM Plex Mono", monospace' }}>
            {(r.confidence * 100).toFixed(0)}%
          </span>
        </div>
        <div style={{ height: 6, background: T.borderSoft, borderRadius: 3, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 3,
            width: `${(r.confidence * 100).toFixed(0)}%`,
            background: r.confidence >= 0.75 ? T.green : r.confidence >= 0.55 ? T.amber : T.red,
            transition: "width 0.6s ease",
          }} />
        </div>
        <div style={{ color: T.muted2, fontSize: 8, marginTop: 4, fontFamily: '"IBM Plex Mono", monospace', fontStyle: "italic" }}>
          Tiers are qualitative indicators per IDW validation literature (Shepard, 1968; Dirks et al., 1998) — not frequentist probability statements.
        </div>
      </div>

      <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: 16, marginBottom: 10 }}>
        <div style={{ color: T.muted2, fontSize: 9, letterSpacing: "0.1em", fontFamily: '"IBM Plex Mono", monospace', marginBottom: 10, fontWeight: 600 }}>
          STATIONS CONTRIBUTING TO WIND ESTIMATE
        </div>
        <StationTable stations={r.stationsUsed} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.borderSoft}` }}>
          {[
            ["Method",          r.method],
            ["Version",         r.methodVersion],
            ["Computed (UTC)",  new Date(r.computedAt).toUTCString()],
            ["Station Count",   r.stationCount],
            ["Nearest Station", `${r.nearestStationName} (${r.nearestStationMiles} mi)`],
            ["Raw Confidence",  `${(r.confidence * 100).toFixed(1)}%`],
          ].map(([k, v]) => (
            <div key={k}>
              <div style={{ color: T.muted2, fontSize: 9, letterSpacing: "0.1em", fontFamily: '"IBM Plex Mono", monospace', marginBottom: 3 }}>{k}</div>
              <div style={{ color: T.muted, fontSize: 10, fontFamily: '"IBM Plex Mono", monospace' }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={methodNote}>
        <span style={{ color: T.amber, fontWeight: 700 }}>◆ METHODOLOGY</span> · Wind speed and gust derived by IDW Spatial Interpolation (Shepard, 1968) across {r.stationCount} ASOS surface stations. Station weights = 1/d² (Haversine distance). ASOS instrumentation does not detect hail occurrence and is not used for hail probability — hail probability is derived exclusively from NEXRAD POSH per FMH-11 Part C §2.18. Confidence score reflects station proximity and wind data consistency only. Visual Crossing / ASOS observations are federally quality-controlled using range, temporal consistency, and neighbor comparison checks per ASOS standards (Dirks et al., 1998).
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 — CORROBORATION SUMMARY
// Source: NOAA Storm Events Database · IEM LSR · NEXRAD SWDI
// ─────────────────────────────────────────────────────────────────────────────
function CorroborationSection({ nexradHit, corroboration, dateOfLoss }) {
  const lines = [];

  if (corroboration?.stormEventsHailCount > 0) {
    lines.push({ icon: "✓", color: T.green,  text: `${corroboration.stormEventsHailCount} NOAA Storm Events Database hail record(s) confirmed for this county on ${dateOfLoss}.` });
  } else {
    lines.push({ icon: "○", color: T.muted2, text: `No NOAA Storm Events Database hail records for this county on ${dateOfLoss}.` });
  }

  if (corroboration?.lsrCount > 0) {
    lines.push({ icon: "✓", color: T.green,  text: `${corroboration.lsrCount} IEM Local Storm Report(s) from trained spotters within 25 miles on date of loss.` });
  } else {
    lines.push({ icon: "○", color: T.muted2, text: `No IEM Local Storm Reports within 25 miles on date of loss.` });
  }

  if (nexradHit) {
    lines.push({ icon: "✓", color: T.green,  text: `NEXRAD WSR-88D (${nexradHit.radar || "site unknown"}) independently detected ${nexradHit.maxSizeIn}" hail aloft on date of loss — providing independent radar corroboration per FMH-11 Part C §2.18.` });
  } else {
    lines.push({ icon: "◯", color: "#ff9c4d", text: `No NEXRAD WSR-88D detection within search radius on date of loss. Null result — does not confirm absence of hail; beam geometry limitations may apply at extended range.` });
  }

  return (
    <div style={sectionWrap}>
      <SectionHeader label="CORROBORATION SUMMARY" citation="NOAA Storm Events Database · IEM LSR · NEXRAD SWDI" />
      <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "14px 16px" }}>
        {lines.map((line, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "flex-start", gap: 10,
            paddingBottom: i < lines.length - 1 ? 10 : 0,
            marginBottom:  i < lines.length - 1 ? 10 : 0,
            borderBottom:  i < lines.length - 1 ? `1px solid ${T.borderSoft}` : "none",
          }}>
            <span style={{ color: line.color, fontWeight: 700, fontSize: 14, lineHeight: 1.4, flexShrink: 0 }}>{line.icon}</span>
            <span style={{ color: T.muted, fontSize: 12, lineHeight: 1.8, fontFamily: "Inter, Arial, sans-serif" }}>{line.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 — SPC MESOSCALE DISCUSSIONS
// ─────────────────────────────────────────────────────────────────────────────
function MCDSection({ mcds }) {
  if (!mcds || mcds.length === 0) return null;
  return (
    <div style={sectionWrap}>
      <SectionHeader label="MESOSCALE DISCUSSIONS — DATE OF LOSS" citation="NOAA Storm Prediction Center" />
      <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, padding: "14px 16px" }}>
        {mcds.map((mcd, i) => (
          <div key={i} style={{
            marginBottom: i < mcds.length - 1 ? 12 : 0,
            paddingBottom: i < mcds.length - 1 ? 12 : 0,
            borderBottom: i < mcds.length - 1 ? `1px solid ${T.borderSoft}` : "none",
          }}>
            <div style={{ color: T.blueBright, fontSize: 11, fontFamily: '"IBM Plex Mono", monospace', fontWeight: 700, marginBottom: 2 }}>
              MCD #{String(mcd.number).padStart(4, "0")} · {new Date(mcd.issued).toUTCString().slice(0, 22)} UTC
            </div>
            <div style={{ color: T.muted, fontSize: 10, fontFamily: '"IBM Plex Mono", monospace', marginBottom: 3 }}>
              {mcd.concerning || "Severe weather threat identified"}
            </div>
            <div style={{ color: T.blue, fontSize: 10, fontFamily: '"IBM Plex Mono", monospace' }}>
              ↗ {mcd.url}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT — DOLStormPanel
// Replaces IDWPanel. IDWPanel alias preserved so App.jsx import is unchanged.
// ─────────────────────────────────────────────────────────────────────────────
export function DOLStormPanel({
  idwResult,
  nexradHit,
  beamGeometry,
  freezeLevelFt,
  corroboration,
  dateOfLoss,
  propertyAddress,
  mcds = [],
}) {
  return (
    <div style={{
      background: T.panel, border: `1px solid ${T.border}`,
      borderRadius: 12, padding: 20, marginTop: 0,
    }}>
      <div style={{ marginBottom: 20, paddingBottom: 14, borderBottom: `1px solid ${T.borderSoft}` }}>
        <div style={{ color: T.muted2, fontSize: 9, letterSpacing: "0.15em", fontFamily: '"IBM Plex Mono", monospace', marginBottom: 4 }}>
          STORM DATA MODULE · MULTI-SOURCE DOL ANALYSIS v2.0
        </div>
        <div style={{ color: T.text, fontWeight: 700, fontSize: 15 }}>Date-of-Loss Storm Analysis</div>
        <div style={{ color: T.muted, fontSize: 12, marginTop: 2 }}>{propertyAddress} · {dateOfLoss}</div>
      </div>

      <NexradHailSection  nexradHit={nexradHit}  beamGeometry={beamGeometry} />
      <SurfaceHailSection nexradHit={nexradHit}  freezeLevelFt={freezeLevelFt} />
      <WindInterpolationSection idwResult={idwResult} />
      <CorroborationSection nexradHit={nexradHit} corroboration={corroboration} dateOfLoss={dateOfLoss} />
      <MCDSection mcds={mcds} />
    </div>
  );
}

export { DOLStormPanel as IDWPanel };
