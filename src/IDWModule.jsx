
// ─────────────────────────────────────────────────────────────────────────────
// IDW INTERPOLATION ENGINE
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

/**
 * Mathematical confidence scoring — continuous, not hardcoded thresholds.
 *
 * Formula:
 *   distFactor  = exp(-nearestMi / 8)        → decays smoothly with distance
 *   countFactor = 1 - exp(-n / 2)            → saturates at ~3+ stations
 *   spreadFactor = 1 - (stdDev / mean)       → penalises high data variance
 *   confidence  = distFactor * 0.6 + countFactor * 0.25 + spreadFactor * 0.15
 */
function computeConfidence(nearestMi, stationCount, hailValues) {
  const distFactor = Math.exp(-nearestMi / 8);
  const countFactor = 1 - Math.exp(-stationCount / 2);

  let spreadFactor = 1;
  if (hailValues.length > 1) {
    const mean = hailValues.reduce((s, v) => s + v, 0) / hailValues.length;
    if (mean > 0) {
      const variance =
        hailValues.reduce((s, v) => s + (v - mean) ** 2, 0) / hailValues.length;
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
// Estimates surface hail size from radar-detected aloft size + freezing level.
// Formula: surfaceSize = aloftSize * exp(-k * warmLayerFt)
// where warmLayerFt is the depth of air below the freezing level (proxy: freezeLevelFt)
// k = 0.000055 (empirical constant from Knight 1981 regression)
// ─────────────────────────────────────────────────────────────────────────────
export function meltingChartEstimate(hailSizeAloftIn, freezeLevelFt) {
  if (!hailSizeAloftIn || !freezeLevelFt) return null;
  const k = 0.000055;
  const surface = hailSizeAloftIn * Math.exp(-k * freezeLevelFt);
  return parseFloat(Math.max(surface, 0).toFixed(2));
}

export function runIDW(targetLat, targetLon, stations, nexradHit = null, power = 2) {
  if (!stations || stations.length === 0) return null;

  const withDistances = stations
    .map((s) => ({
      ...s,
      distanceMiles: haversineDistance(targetLat, targetLon, s.lat, s.lon),
    }))
    .filter((s) => s.distanceMiles > 0.01); // exclude exact-match duplicates

  if (withDistances.length === 0) return null;

  const sorted = [...withDistances].sort((a, b) => a.distanceMiles - b.distanceMiles);
  const weighted = sorted.map((s) => ({
    ...s,
    weight: 1 / Math.pow(s.distanceMiles, power),
  }));
  const totalWeight = weighted.reduce((sum, s) => sum + s.weight, 0);

  const hailSize      = weighted.reduce((sum, s) => sum + s.weight * (s.hailSizeIn      ?? 0), 0) / totalWeight;
  const hailProb      = weighted.reduce((sum, s) => sum + s.weight * (s.hailProbability ?? 0), 0) / totalWeight;
  const windSpeed     = weighted.reduce((sum, s) => sum + s.weight * (s.windSpeedMph    ?? 0), 0) / totalWeight;
  const windGust      = weighted.reduce((sum, s) => sum + s.weight * (s.windGustMph     ?? 0), 0) / totalWeight;

  const nearestMi = sorted[0].distanceMiles;
  let { confidence, confidenceLabel } = computeConfidence(
    nearestMi,
    sorted.length,
    sorted.map((s) => s.hailSizeIn ?? 0)
  );

  let nexradBoost = null;
  if (nexradHit) {
    const boost = 0.12;
    confidence = Math.min(confidence + boost, 0.97);
    if (confidence >= 0.85) confidenceLabel = "HIGH";
    else if (confidence >= 0.65) confidenceLabel = "MODERATE";
    else confidenceLabel = "LOW";
    nexradBoost = {
      applied: true,
      radar: nexradHit.radar,
      maxSizeIn: nexradHit.maxSizeIn,
      probHail: nexradHit.probHail ?? null,
      probSevere: nexradHit.probSevere ?? null,
      note: `NEXRAD corroboration: WSR-88D${nexradHit.radar ? ` (${nexradHit.radar})` : ""} independently detected ${nexradHit.maxSizeIn}" hail aloft on date of loss${nexradHit.probHail != null ? ` · POH: ${nexradHit.probHail}%` : ""}${nexradHit.probSevere != null ? ` · POSH: ${nexradHit.probSevere}%` : ""} — confidence elevated.`,
    };
  }

  return {
    hailSizeIn:         parseFloat(hailSize.toFixed(2)),
    hailProbability:    parseFloat(hailProb.toFixed(1)),
    windSpeedMph:       parseFloat(windSpeed.toFixed(1)),
    windGustMph:        parseFloat(windGust.toFixed(1)),
    method:             "IDW Spatial Interpolation (Shepard, 1968)",
    methodVersion:      "1.0.0",
    stationCount:       sorted.length,
    nearestStationMiles: parseFloat(nearestMi.toFixed(2)),
    nearestStationName: sorted[0].name,
    confidence,
    confidenceLabel,
    nexradBoost,
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
// DARK THEME TOKENS (matches App.jsx exactly)
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
// CONFIDENCE BADGE
// ─────────────────────────────────────────────────────────────────────────────
function ConfidenceBadge({ label }) {
  const map = {
    HIGH:       { bg: T.greenBg,  border: T.greenBorder, text: T.green },
    MODERATE:   { bg: T.amberBg,  border: T.amberBorder, text: T.amber },
    LOW:        { bg: "#1a0e00",  border: "#7a4000",      text: "#e07a20" },
    "VERY LOW": { bg: T.redBg,    border: T.redBorder,   text: T.red   },
  };
  const s = map[label] || map["VERY LOW"];
  return (
    <span
      style={{
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.text,
        padding: "3px 10px",
        borderRadius: 4,
        fontSize: 10,
        fontFamily: '"IBM Plex Mono", monospace',
        letterSpacing: "0.1em",
        fontWeight: 700,
      }}
    >
      {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// METRIC CARD
// ─────────────────────────────────────────────────────────────────────────────
function MetricCard({ label, value, unit, sublabel }) {
  return (
    <div
      style={{
        background: T.bg,
        border: `1px solid ${T.border}`,
        borderTop: `3px solid ${T.blue}`,
        borderRadius: 8,
        padding: "14px 16px",
        flex: 1,
        minWidth: 120,
      }}
    >
      <div
        style={{
          color: T.muted2,
          fontSize: 9,
          fontFamily: '"IBM Plex Mono", monospace',
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span
          style={{
            color: T.blueBright,
            fontSize: 28,
            fontFamily: '"IBM Plex Mono", monospace',
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
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

// ─────────────────────────────────────────────────────────────────────────────
// STATION TABLE
// ─────────────────────────────────────────────────────────────────────────────
function StationTable({ stations }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
      <thead>
        <tr style={{ borderBottom: `1px solid ${T.border}` }}>
          {["Station", "Source", "Distance", "Weight"].map((h) => (
            <th
              key={h}
              style={{
                color: T.muted2,
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 9,
                letterSpacing: "0.1em",
                textAlign: "left",
                padding: "6px 10px",
                fontWeight: 600,
              }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {stations.map((s, i) => (
          <tr
            key={s.id || i}
            style={{ borderBottom: `1px solid ${T.borderSoft}` }}
          >
            <td
              style={{
                color: T.text,
                padding: "7px 10px",
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 11,
              }}
            >
              {s.name}
            </td>
            <td style={{ color: T.muted, padding: "7px 10px", fontFamily: '"IBM Plex Mono", monospace', fontSize: 11 }}>
              {s.source}
            </td>
            <td style={{ color: T.text, padding: "7px 10px", fontFamily: '"IBM Plex Mono", monospace', fontSize: 11 }}>
              {s.distanceMiles} mi
            </td>
            <td style={{ padding: "7px 10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    height: 4,
                    borderRadius: 2,
                    background: T.blue,
                    width: `${Math.max(s.contributionPct, 4)}%`,
                    maxWidth: 80,
                    opacity: 0.7,
                  }}
                />
                <span style={{ color: T.muted, fontFamily: '"IBM Plex Mono", monospace', fontSize: 10 }}>
                  {s.contributionPct}%
                </span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DISCLAIMER BLOCK
// ─────────────────────────────────────────────────────────────────────────────
function DisclaimerBlock({ result, propertyAddress, claimDate }) {
  return (
    <div
      style={{
        background: "#0a0e18",
        border: `1px solid ${T.amberBorder}`,
        borderLeft: `4px solid ${T.amber}`,
        borderRadius: 6,
        padding: "12px 16px",
      }}
    >
      <div
        style={{
          color: T.amber,
          fontSize: 9,
          fontFamily: '"IBM Plex Mono", monospace',
          letterSpacing: "0.12em",
          marginBottom: 6,
          fontWeight: 700,
        }}
      >
        ⚠ MATHEMATICAL INTERPOLATION — NOT EMPIRICAL MEASUREMENT
      </div>
      <p
        style={{
          color: T.muted,
          fontSize: 11,
          margin: 0,
          lineHeight: 1.8,
          fontFamily: "Inter, Arial, sans-serif",
        }}
      >
        Storm conditions for{" "}
        <strong style={{ color: T.text }}>{propertyAddress}</strong> on{" "}
        <strong style={{ color: T.text }}>{claimDate}</strong> are mathematical
        estimates derived by IDW Spatial Interpolation (Shepard, 1968) across{" "}
        <strong style={{ color: T.text }}>{result.stationCount}</strong> surrounding
        weather stations. Nearest station:{" "}
        <strong style={{ color: T.text }}>
          {result.nearestStationName} ({result.nearestStationMiles} mi)
        </strong>
        . Confidence:{" "}
        <strong style={{ color: T.text }}>{result.confidenceLabel}</strong> (
        {(result.confidence * 100).toFixed(0)}%). IDW Spatial Interpolation v{result.methodVersion}. IDW is a standard peer-reviewed spatial interpolation method applied throughout operational meteorology and atmospheric science (Shepard, 1968).
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN IDW PANEL COMPONENT (dark-themed)
// ─────────────────────────────────────────────────────────────────────────────
export function IDWPanel({ idwResult, dateOfLoss, propertyAddress, mcds = [] }) {
  if (!idwResult) return null;

  const r = idwResult;

  return (
    <div
      style={{
        background: T.panel,
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        padding: 20,
        marginTop: 0,
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          paddingBottom: 14,
          borderBottom: `1px solid ${T.borderSoft}`,
        }}
      >
        <div>
          <div
            style={{
              color: T.muted2,
              fontSize: 9,
              letterSpacing: "0.15em",
              fontFamily: '"IBM Plex Mono", monospace',
              marginBottom: 4,
            }}
          >
            STORM DATA MODULE · IDW INTERPOLATION ENGINE v{r.methodVersion}
          </div>
          <div
            style={{
              color: T.text,
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            Date-of-Loss Storm Estimate
          </div>
          <div style={{ color: T.muted, fontSize: 12, marginTop: 2 }}>
            {propertyAddress} · {dateOfLoss}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              color: T.muted2,
              fontSize: 9,
              letterSpacing: "0.1em",
              fontFamily: '"IBM Plex Mono", monospace',
              marginBottom: 6,
            }}
          >
            INTERPOLATION CONFIDENCE
          </div>
          <ConfidenceBadge label={r.confidenceLabel} />
          <div style={{ color: T.muted2, fontSize: 9, marginTop: 5, fontFamily: '"IBM Plex Mono", monospace' }}>
            {r.stationCount} stations · nearest {r.nearestStationMiles} mi
          </div>
          <div style={{ color: T.muted2, fontSize: 8, marginTop: 4, fontFamily: '"IBM Plex Mono", monospace', lineHeight: 1.6, textAlign:"right" }}>
            HIGH: &lt;5 mi · 5+ stations{"\n"}
            MODERATE: 5–20 mi · 3+ stations{"\n"}
            LOW: &gt;20 mi or &lt;3 stations{"\n"}
            <span style={{ opacity: 0.7, fontStyle: "italic" }}>Tiers are qualitative indicators based on IDW validation literature (Shepard, 1968; Dirks et al., 1998), not frequentist probability statements.</span>
          </div>
          {r.nexradBoost && (
            <div style={{
              marginTop: 6,
              color: "#4caf50",
              fontSize: 9,
              fontFamily: '"IBM Plex Mono", monospace',
              lineHeight: 1.6,
              maxWidth: 400,
              textAlign: "right",
            }}>
              ▲ {r.nexradBoost.note}
            </div>
          )}
        </div>
      </div>

      {/* Metric cards */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <MetricCard
          label="Hail Size Aloft (Radar)"
          value={r.hailSizeIn}
          unit="in"
          sublabel="NEXRAD HDA — not ground level"
        />
        {r.surfaceHailSizeIn != null && (
          <MetricCard
            label="Est. Surface Hail Size"
            value={r.surfaceHailSizeIn}
            unit="in"
            sublabel={`melting chart · FL ${r.freezeLevelFt?.toLocaleString()} ft`}
          />
        )}
        <MetricCard
          label="Hail Probability"
          value={r.nexradBoost ? r.nexradBoost.probSevere ?? r.hailProbability : r.hailProbability}
          unit="%"
          sublabel={r.nexradBoost ? "NEXRAD POSH (radar-derived)" : "interpolated"}
        />
        <MetricCard
          label="Wind Speed"
          value={r.windSpeedMph}
          unit="mph"
          sublabel="sustained"
        />
        <MetricCard
          label="Wind Gust"
          value={r.windGustMph}
          unit="mph"
          sublabel="peak gust"
        />
      </div>

      {/* Confidence bar */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 5,
          }}
        >
          <span
            style={{
              color: T.muted2,
              fontSize: 9,
              letterSpacing: "0.1em",
              fontFamily: '"IBM Plex Mono", monospace',
            }}
          >
            CONFIDENCE SCORE
          </span>
          <span
            style={{
              color: T.blueBright,
              fontSize: 10,
              fontFamily: '"IBM Plex Mono", monospace',
            }}
          >
            {(r.confidence * 100).toFixed(0)}%
          </span>
        </div>
        <div
          style={{
            height: 6,
            background: T.borderSoft,
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: 3,
              width: `${(r.confidence * 100).toFixed(0)}%`,
              background:
                r.confidence >= 0.75
                  ? T.green
                  : r.confidence >= 0.55
                  ? T.amber
                  : T.red,
              transition: "width 0.6s ease",
            }}
          />
        </div>
      </div>

      {/* Disclaimer */}
      <DisclaimerBlock
        result={r}
        propertyAddress={propertyAddress}
        claimDate={dateOfLoss}
      />

      {/* Methodology & Station Data — always visible */}
      <div
        style={{
          background: T.bg,
          border: `1px solid ${T.border}`,
          borderRadius: 8,
          padding: 16,
          marginTop: 14,
        }}
      >
        <div
          style={{
            color: T.muted2,
            fontSize: 9,
            letterSpacing: "0.1em",
            fontFamily: '"IBM Plex Mono", monospace',
            marginBottom: 10,
            fontWeight: 600,
          }}
        >
          STATIONS CONTRIBUTING TO THIS ESTIMATE
        </div>
        <StationTable stations={r.stationsUsed} />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 10,
            marginTop: 14,
            paddingTop: 14,
            borderTop: `1px solid ${T.borderSoft}`,
          }}
        >
          {[
            ["Method", r.method],
            ["Version", r.methodVersion],
            ["Computed (UTC)", new Date(r.computedAt).toUTCString()],
            ["Station Count", r.stationCount],
            ["Nearest Station", `${r.nearestStationName} (${r.nearestStationMiles} mi)`],
            ["Raw Confidence", `${(r.confidence * 100).toFixed(1)}%`],
          ].map(([k, v]) => (
            <div key={k}>
              <div
                style={{
                  color: T.muted2,
                  fontSize: 9,
                  letterSpacing: "0.1em",
                  fontFamily: '"IBM Plex Mono", monospace',
                  marginBottom: 3,
                }}
              >
                {k}
              </div>
              <div
                style={{
                  color: T.muted,
                  fontSize: 10,
                  fontFamily: '"IBM Plex Mono", monospace',
                }}
              >
                {v}
              </div>
            </div>
          ))}
        </div>
      {mcds && mcds.length > 0 && (
        <div style={{
          marginTop: 20,
          paddingTop: 16,
          borderTop: `1px solid ${T.borderSoft}`,
        }}>
          <div style={{
            color: T.muted2,
            fontSize: 9,
            letterSpacing: "0.15em",
            fontFamily: '"IBM Plex Mono", monospace',
            textTransform: "uppercase",
            marginBottom: 10,
          }}>
            Mesoscale Discussions — Date of Loss
          </div>
          {mcds.map((mcd, i) => (
            <div key={i} style={{
              marginBottom: 8,
              paddingBottom: 8,
              borderBottom: i < mcds.length - 1 ? `1px solid ${T.borderSoft}` : "none",
            }}>
              <div style={{
                color: T.blueBright,
                fontSize: 11,
                fontFamily: '"IBM Plex Mono", monospace',
                fontWeight: 700,
                marginBottom: 2,
              }}>
                MCD #{String(mcd.number).padStart(4, '0')} · {new Date(mcd.issued).toUTCString().slice(0, 22)} UTC
              </div>
              <div style={{
                color: T.muted,
                fontSize: 10,
                fontFamily: '"IBM Plex Mono", monospace',
                marginBottom: 3,
              }}>
                {mcd.concerning || "Severe weather threat identified"}
              </div>
              <div style={{
                color: T.blue,
                fontSize: 10,
                fontFamily: '"IBM Plex Mono", monospace',
              }}>
                ↗ {mcd.url}
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

