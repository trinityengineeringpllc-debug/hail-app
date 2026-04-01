import { useEffect, useMemo, useRef, useState } from "react";

const API = import.meta.env.VITE_RENDER_URL || "";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import {
  LoginScreen,
  SignupScreen,
  ForgotPasswordScreen,
  OtpVerifyScreen,
  NewPasswordScreen,
} from "./AuthScreens";
import { runIDW, IDWPanel } from "./IDWModule";
import DatePicker from "./DatePicker";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const CURRENT_YEAR = new Date().getFullYear();
const PAGE_W = 794;
const PAGE_H = 1123;

const theme = {
  bg: "#03070f",
  pageBg: "#03070f",
  headerBg: "#07101d",
  panel: "#050b14",
  border: "#17325f",
  borderSoft: "#102240",
  text: "#eef3ff",
  muted: "#7ea2df",
  muted2: "#4d6797",
  blue: "#76a8ff",
  blueBright: "#8db7ff",
  button: "#5e86f0",
  buttonText: "#f8fbff",
  riskBg: "#572a00",
  riskBorder: "#b65c00",
  riskText: "#ffb04d",
  dangerText: "#ff8b47",
  purpleText: "#b395ff",
  white: "#ffffff",
};

const HAIL_COLUMNS = [
  { key: "date", label: "Date", width: "0.85fr" },
  { key: "size", label: "Size", width: "2.9fr" },
  { key: "location", label: "Location", width: "1.95fr" },
  { key: "damage", label: "Property Dmg", width: "1fr" },
  { key: "inj", label: "Injuries", width: "0.7fr" },
  { key: "dea", label: "Deaths", width: "0.7fr" },
];

const OTHER_COLUMNS = [
  { key: "date", label: "Date", width: "0.9fr" },
  { key: "type", label: "Type", width: "1.85fr" },
  { key: "location", label: "Location", width: "2.0fr" },
  { key: "desc", label: "Description", width: "2.8fr" },
  { key: "damage", label: "Damage", width: "1.65fr" },
];

const systemPrompt = `You are a forensic weather analyst for Trinity Engineering, PLLC.
You will be given confirmed severe weather data from multiple sources for a specific property.
Your job is to analyze all provided data AND supplement it with web search to find any additional
confirmed storm events not captured in the structured data.

DATA TIERS — label each event with its source tier:
- Tier 1 (Empirical): LSR spotter-confirmed reports from NOAA/IEM — highest forensic value
- Tier 2 (Official): NOAA Storm Events Database county records — official but county-level
- Tier 3 (Supplemental): Web search findings from news, NWS reports, SPC archives — use to fill gaps only

CRITICAL RULES:
- The tier2_noaa_storm_events_hail array contains CONFIRMED hail events directly from the NOAA Storm Events Database. You MUST include ALL of these in the hailEvents array of your response. Do not omit any of them.
- Each item in tier2_noaa_storm_events_hail must become a hailEvent entry with proper date, size, location and source fields.
- Hail sizes must include coin references: 0.75"=penny, 0.88"=nickel, 1.00"=quarter, 1.25"=half-dollar, 1.50"=ping pong ball, 1.75"=golf ball, 2.00"=egg
- Use web search only to find events not already in the provided data.
- Never contradict or omit provided empirical data.
- Property damage values formatted as "$X,XXX" or "N/A"

Return ONLY valid JSON with this exact structure:
{
  "location": {
    "address": "...",
    "county": "...",
    "state": "...",
    "lat": "...",
    "lon": "..."
  },
  "summary": "2-3 sentence forensic summary of severe weather history based on all data tiers",
  "riskLevel": "Low" | "Moderate" | "High" | "Very High",
  "hailEvents": [
    {
      "date": "YYYY-MM-DD",
      "size": "X.XX inches (coin-size description)",
      "location": "city/area",
      "injuries": 0,
      "deaths": 0,
      "propertyDamage": "$X,XXX or N/A",
      "source": "NOAA/IEM LSR" | "NOAA Storm Events" | "NWS/SPC Report"
    }
  ],
  "otherEvents": [
    {
      "date": "YYYY-MM-DD",
      "type": "Tornado | Thunderstorm Wind | Flash Flood | etc",
      "description": "description of event",
      "damage": "$X,XXX or N/A"
    }
  ],
  "stats": {
    "totalHailEvents": 0,
    "largestHailSize": "X.XX inches",
    "avgEventsPerYear": "X.X",
    "mostActiveMonth": "Month",
    "yearsSearched": "YYYY-YYYY"
  },
  "sources": ["url1", "url2"],
  "stations": []
}

STATIONS ARRAY — only populate when a Date of Loss is provided:
Using the Visual Crossing station observations provided, populate up to 6 stations:
{
  "id": "station id",
  "name": "station name",
  "source": "Visual Crossing / ASOS",
  "lat": 00.0000,
  "lon": -00.0000,
  "hailSizeIn": 0.00,
  "hailProbability": 0,
  "windSpeedMph": 0,
  "windGustMph": 0
}
Cross-reference each station with any Tier 1 LSR hail reports within 10 miles on the same date.
If LSR confirms hail near a station, set hailSizeIn to that magnitude and hailProbability to 85.
If no LSR hail near a station, set hailSizeIn to 0 and hailProbability to 5.
Return empty array [] when no Date of Loss is provided.`;


const monoCellStyle = {
  fontFamily: '"IBM Plex Mono", monospace',
  color: theme.text,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

const emptyRowStyle = {
  padding: "18px",
  color: theme.muted,
  fontFamily: '"IBM Plex Mono", monospace',
  fontSize: 13,
};

const FIRST_PAGE_CONTENT_HEIGHT = PAGE_H - 92 - 18 - 18;
const CONT_PAGE_CONTENT_HEIGHT = PAGE_H - 20 - 18;
const SECTION_GAP = 18;
const EMPTY_TABLE_BODY_HEIGHT = 62;
const FOOTER_EXTRA_GAP = 20;

function ensureFonts() {
  if (!document.getElementById("swi-fonts")) {
    const link = document.createElement("link");
    link.id = "swi-fonts";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&family=Montserrat:wght@600;700;800&display=swap";
    document.head.appendChild(link);
  }
}

async function parseResponseJson(response, label = "API") {
  const text = await response.text();

  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`${label} returned invalid JSON: ${text.slice(0, 180)}`);
  }

  return data;
}

function extractJsonPayload(data) {
  const textBlocks = (data?.content || []).filter((b) => b.type === "text");
  const raw = textBlocks
    .map((b) => b.text)
    .join("\n")
    .replace(/```json|```/gi, "")
    .trim();

  if (!raw) return null;

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  const candidate = raw.slice(start, end + 1);

  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  return String(dateStr).trim();
}

function normalizeResult(result, address) {
  if (!result) return null;

  const years = result?.stats?.yearsSearched || `${CURRENT_YEAR - 10}-${CURRENT_YEAR}`;

  return {
    location: {
      address: result?.location?.address || address || "N/A",
      county: result?.location?.county || "Unknown County",
      state: result?.location?.state || "Unknown State",
      lat: result?.location?.lat || "",
      lon: result?.location?.lon || "",
    },
    summary: result?.summary || "No summary was returned. Please rerun the query.",
    riskLevel: result?.riskLevel || "Moderate",
    hailEvents: Array.isArray(result?.hailEvents) ? result.hailEvents : [],
    otherEvents: Array.isArray(result?.otherEvents) ? result.otherEvents : [],
    stats: {
      totalHailEvents: result?.stats?.totalHailEvents ?? 0,
      largestHailSize: result?.stats?.largestHailSize || "N/A",
      avgEventsPerYear: result?.stats?.avgEventsPerYear || "0.0",
      mostActiveMonth: result?.stats?.mostActiveMonth || "N/A",
      yearsSearched: years,
      nexradHits: result?.stats?.nexradHits ?? "—",
    },
    sources: Array.isArray(result?.sources) ? result.sources : [],
  };
}

function getRiskStyle(risk) {
  switch (risk) {
    case "Low":
      return { bg: "#102713", border: "#2f7a36", text: "#8ef49c" };
    case "Moderate":
      return { bg: "#433000", border: "#b98700", text: "#ffd25a" };
    case "High":
      return { bg: theme.riskBg, border: theme.riskBorder, text: theme.riskText };
    case "Very High":
      return { bg: "#4a0f0f", border: "#af3030", text: "#ff8177" };
    default:
      return { bg: theme.riskBg, border: theme.riskBorder, text: theme.riskText };
  }
}

function getHeight(node) {
  return node?.offsetHeight || 0;
}

function buildMeasuredPages(data, metrics) {
  if (!data || !metrics) return [];

  const pages = [];

  function createPage({ showTopHeader = false, showIntro = false } = {}) {
    const capacity = showTopHeader ? FIRST_PAGE_CONTENT_HEIGHT : CONT_PAGE_CONTENT_HEIGHT;
    const introHeight = showIntro ? metrics.introHeight : 0;

    return {
      showTopHeader,
      showIntro,
      sections: [],
      showFooter: false,
      remaining: capacity - introHeight,
    };
  }

  function pushNewPage(opts = {}) {
    const page = createPage(opts);
    pages.push(page);
    return page;
  }

  let currentPage = pushNewPage({ showTopHeader: true, showIntro: true });

  function ensureRoom(requiredHeight) {
    if (currentPage.remaining >= requiredHeight) return;
    currentPage = pushNewPage({ showTopHeader: false, showIntro: false });
  }

  function addMeasuredTableSections(type, rows, baseHeight, rowHeights, firstTitle, continuedTitle) {
    if (!rows.length) {
      const required = baseHeight + EMPTY_TABLE_BODY_HEIGHT + SECTION_GAP;
      ensureRoom(required);

      currentPage.sections.push({
        type,
        title: firstTitle,
        rows: [],
      });

      currentPage.remaining -= required;
      return;
    }

    let rowIndex = 0;
    let firstSection = true;

    while (rowIndex < rows.length) {
      const title = firstSection ? firstTitle : continuedTitle;
      const firstRowHeight = rowHeights[rowIndex] || 60;

      ensureRoom(baseHeight + firstRowHeight + SECTION_GAP);

      let used = baseHeight;
      const chunk = [];

      while (rowIndex < rows.length) {
        const rowHeight = rowHeights[rowIndex] || 60;

        if (chunk.length > 0 && used + rowHeight > currentPage.remaining) {
          break;
        }

        chunk.push(rows[rowIndex]);
        used += rowHeight;
        rowIndex += 1;
      }

      if (!chunk.length) {
        chunk.push(rows[rowIndex]);
        used += rowHeights[rowIndex] || 60;
        rowIndex += 1;
      }

      currentPage.sections.push({
        type,
        title,
        rows: chunk,
      });

      currentPage.remaining -= used + SECTION_GAP;
      firstSection = false;
    }
  }

  addMeasuredTableSections(
    "hail",
    data.hailEvents,
    metrics.hailBaseHeight,
    metrics.hailRowHeights,
    "Hail Events - Past 10 Years",
    "Hail Events - Continued"
  );

  addMeasuredTableSections(
    "other",
    data.otherEvents,
    metrics.otherBaseHeight,
    metrics.otherRowHeights,
    "Other Severe Weather Events",
    "Other Severe Weather Events - Continued"
  );

  const sourcesBodyHeight =
    data.sources.length > 0
      ? metrics.sourceRowHeights.reduce((sum, h) => sum + h, 0)
      : EMPTY_TABLE_BODY_HEIGHT;

  const sourcesHeight = metrics.sourcesBaseHeight + sourcesBodyHeight + SECTION_GAP;
  const footerReserve = metrics.footerHeight + FOOTER_EXTRA_GAP;

  if (currentPage.remaining < sourcesHeight + footerReserve) {
    currentPage = pushNewPage({ showTopHeader: false, showIntro: false });
  }

  currentPage.sections.push({
    type: "sources",
    title: "Data Sources",
    sources: data.sources,
  });
  currentPage.remaining -= sourcesHeight;
  currentPage.showFooter = true;

  return pages;
}

function LogoMark({ large = false }) {
  return (
    <img
      src="/swi-logo.png"
      alt="Severe Weather Intelligence"
      style={{
        height: large ? 72 : 48,
        width: "auto",
        objectFit: "contain",
        display: "block",
      }}
    />
  );
}

function FooterContent() {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
        <LogoMark large />
      </div>
      <div
        style={{
          color: theme.white,
          fontSize: 14,
        }}
      >
        ©2026 Trinity Engineering, PLLC All Rights Reserved
      </div>
    </>
  );
}

function TrinityFooter() {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 34,
        textAlign: "center",
      }}
    >
      <FooterContent />
    </div>
  );
}

function FooterMeasure() {
  return (
    <div style={{ textAlign: "center" }}>
      <FooterContent />
    </div>
  );
}

function AppHeader({ onLogout }) {
  const [showConfirm, setShowConfirm] = useState(false);
  return (
    <div
      style={{
        background: theme.headerBg,
        borderBottom: `1px solid ${theme.borderSoft}`,
        padding: "10px 24px 10px",
        position: "relative",
      }}
    >
      <style>{`
        .hail-header-inner {
          max-width: 1320px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }
        .hail-header-meta {
          color: ${theme.muted2};
          font-size: 10px;
          letter-spacing: 1.5px;
          align-self: flex-start;
          font-family: "IBM Plex Mono", monospace;
          line-height: 1.9;
          min-width: 140px;
          flex-shrink: 0;
        }
        .hail-header-center {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }
        .hail-header-swi {
          height: 54px;
          width: auto;
          object-fit: contain;
          display: block;
        }
        .hail-header-byrow {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 0;
        }
        .hail-header-by {
          font-family: "Montserrat", "Inter", sans-serif;
          font-weight: 700;
          font-size: 10px;
          letter-spacing: 0.28em;
          color: ${theme.muted2};
          text-transform: uppercase;
        }
        .hail-header-trinity {
          height: 70px;
          width: auto;
          object-fit: contain;
        }
        .hail-header-tagline {
          color: ${theme.muted2};
          font-size: 8.5px;
          letter-spacing: 0.20em;
          font-family: "IBM Plex Mono", monospace;
          text-transform: uppercase;
          margin-top: 1px;
        }
        .hail-header-actions {
          min-width: 130px;
          display: flex;
          justify-content: flex-end;
          align-self: flex-start;
          align-items: center;
          flex-shrink: 0;
        }

        @media (max-width: 768px) {
          .hail-header-inner { flex-direction: column; gap: 8px; }
          .hail-header-meta { display: none; }
          .hail-header-actions {
            position: absolute;
            top: 10px;
            right: 16px;
            min-width: unset;
            align-self: unset;
          }
          .hail-header-swi { height: 44px; }
          .hail-header-trinity { height: 40px; }
          .hail-header-tagline { font-size: 8.5px; letter-spacing: 0.14em; }
        }
        @media (max-width: 768px) {
          .hail-header-signout-label { display: none; }
          .hail-header-signout { padding: 8px 10px !important; }
        }
        @media (max-width: 480px) {
          .hail-header-swi { height: 36px; }
          .hail-header-trinity { height: 30px; }
          .hail-header-by { font-size: 8px; }
        }
      `}</style>

      <div className="hail-header-inner">
        {/* Left — data source badge */}
        <div className="hail-header-meta">
        <div>DATA SOURCE: NOAA NWS</div>
        <div>NCEI STORM EVENTS DB</div>
        <div>NEXRAD LEVEL-III HDA</div>
        </div>

        {/* Center — stacked logo block */}
        <div className="hail-header-center">
          <img src="/swi-logo.png" alt="Severe Weather Intelligence" className="hail-header-swi" />
          <div className="hail-header-byrow">
            <span className="hail-header-by">BY</span>
            <img src="/trinity-logo.png" alt="Trinity Engineering" className="hail-header-trinity" />
          </div>
        <div className="hail-header-tagline">NOAA Storm Events Database · NEXRAD Level-III HDA · 10-Year Lookback</div>
        </div>

        {/* Right — sign out */}
        <div className="hail-header-actions">
          <motion.button
            onClick={() => setShowConfirm(true)}
            whileHover={{
              scale: 1.04,
              backgroundColor: "rgba(94,134,240,0.12)",
              borderColor: theme.blue,
              boxShadow: "0 0 18px rgba(94,134,240,0.25)",
            }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 380, damping: 22 }}
            className="hail-header-signout"
            style={{
              background: "rgba(94,134,240,0.06)",
              color: theme.blue,
              border: `1px solid ${theme.border}`,
              borderRadius: 10,
              padding: "9px 18px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: '"IBM Plex Mono", monospace',
              letterSpacing: "0.08em",
              display: "flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span className="hail-header-signout-label">Sign Out</span>
          </motion.button>
        </div>
      </div>

      {/* Logout confirmation modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setShowConfirm(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 9999,
              background: "rgba(0,0,0,0.6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "20px",
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 12 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: theme.panel,
                border: `1px solid ${theme.border}`,
                borderRadius: 16,
                padding: "28px 28px 24px",
                maxWidth: 340,
                width: "100%",
                boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
                textAlign: "center",
              }}
            >
              {/* Icon */}
              <div style={{
                width: 44, height: 44, borderRadius: "50%",
                background: "rgba(94,134,240,0.1)",
                border: `1px solid ${theme.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px",
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={theme.blue} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </div>
              <div style={{ color: theme.text, fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Sign Out</div>
              <div style={{ color: theme.muted, fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
                Are you sure you want to sign out?
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <motion.button
                  onClick={() => setShowConfirm(false)}
                  whileHover={{ backgroundColor: "rgba(255,255,255,0.06)" }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    flex: 1, padding: "10px 0", borderRadius: 10,
                    background: "transparent",
                    border: `1px solid ${theme.borderSoft}`,
                    color: theme.muted, fontSize: 13, fontWeight: 600,
                    cursor: "pointer", fontFamily: '"IBM Plex Mono", monospace',
                  }}
                >Cancel</motion.button>
                <motion.button
                  onClick={() => { setShowConfirm(false); onLogout(); }}
                  whileHover={{ backgroundColor: "rgba(94,134,240,0.2)", boxShadow: "0 0 18px rgba(94,134,240,0.25)" }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    flex: 1, padding: "10px 0", borderRadius: 10,
                    background: "rgba(94,134,240,0.1)",
                    border: `1px solid ${theme.blue}`,
                    color: theme.blue, fontSize: 13, fontWeight: 700,
                    cursor: "pointer", fontFamily: '"IBM Plex Mono", monospace',
                  }}
                >Sign Out</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


function SectionLabel({ children }) {
  return (
    <div
      style={{
        color: theme.muted2,
        fontSize: 10,
        letterSpacing: 3.2,
        textTransform: "uppercase",
        fontFamily: '"IBM Plex Mono", monospace',
        marginBottom: 14,
      }}
    >
      {children}
    </div>
  );
}

function Panel({ children, style = {} }) {
  return (
    <div
      style={{
        background: theme.panel,
        border: `1px solid ${theme.border}`,
        borderRadius: 12,
        padding: 18,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Rotating gradient border RUN QUERY button ─────────────────────────────────
function GradientRunButton({ onClick, loading, className = "" }) {
  return (
    <>
      <style>{`
        @property --rg-angle {
          syntax: '<angle>';
          inherits: false;
          initial-value: 0deg;
        }
        @keyframes rg-spin {
          to { --rg-angle: 360deg; }
        }
        .rq-outer {
          position: relative;
          border-radius: 12px;
          background: conic-gradient(from var(--rg-angle), #5e86f0, #8db7ff, #b0c8ff, #1a2a60, #03070f 55%, #5e86f0);
          animation: rg-spin 2.8s linear infinite;
          padding: 2px;
          cursor: pointer;
          display: flex;
          align-items: stretch;
          height: 52px;
          min-height: 52px;
          transition: transform 0.12s, opacity 0.12s;
          user-select: none;
        }
        .rq-outer:active:not(.rq-loading) {
          transform: scale(0.97);
        }
        .rq-outer.rq-loading {
          animation: none;
          background: #2a3d80;
          opacity: 0.65;
          cursor: default;
        }
        .rq-inner {
          flex: 1;
          border-radius: 10px;
          background: #03070f;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 14px;
          letter-spacing: 0.14em;
          color: #f8fbff;
          font-family: "Inter", Arial, sans-serif;
          transition: background 0.15s;
          gap: 8px;
        }
        .rq-outer:hover:not(.rq-loading) .rq-inner {
          background: #060e1c;
        }
      `}</style>
      <div
        className={`rq-outer hail-search-btn${loading ? " rq-loading" : ""} ${className}`}
        onClick={loading ? undefined : onClick}
        role="button"
        tabIndex={loading ? -1 : 0}
        onKeyDown={(e) => { if (!loading && (e.key === "Enter" || e.key === " ")) onClick?.(); }}
      >
        <div className="rq-inner">
          {loading ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "rg-spin 1s linear infinite" }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              RUNNING…
            </>
          ) : "RUN QUERY"}
        </div>
      </div>
    </>
  );
}

// ── Slide-to-download PDF button ───────────────────────────────────────────────
function SlideDownloadButton({ onDownload, loading }) {
  // phase: "idle" | "loading" | "done"
  const [phase, setPhase] = useState("idle");
  const [isDragging, setIsDragging] = useState(false);
  // bump this to force-remount the drag handle so its internal x resets cleanly
  const [handleKey, setHandleKey] = useState(0);

  const DRAG_MAX = 162;
  const THRESHOLD = DRAG_MAX * 0.82;

  // Single motion value — drive it manually; no spring wrapper (avoids x conflict)
  const x = useMotionValue(0);
  const fillWidth = useTransform(x, (v) => Math.max(0, v + 50));

  // Detect loading: true → false (PDF finished)
  const prevLoadingRef = useRef(false);
  useEffect(() => {
    const wasLoading = prevLoadingRef.current;
    prevLoadingRef.current = loading;
    if (phase === "loading" && wasLoading && !loading) {
      setPhase("done");
      const t = setTimeout(() => {
        setPhase("idle");
        setHandleKey((k) => k + 1); // remount handle at x=0
      }, 1800);
      return () => clearTimeout(t);
    }
  }, [loading, phase]);

  const handleDragEnd = (_, info) => {
    setIsDragging(false);
    if (info.offset.x >= THRESHOLD) {
      // Lock at end, show loading overlay, fire download
      x.set(DRAG_MAX);
      setPhase("loading");
      onDownload();
    } else {
      // Spring back to start
      animate(x, 0, { type: "spring", stiffness: 380, damping: 36 });
    }
  };

  const showTrack = phase === "idle";

  return (
    <div style={{ position: "relative", height: 52, minWidth: 230, userSelect: "none" }}>
      {/* Track shell */}
      <div style={{
        position: "absolute", inset: 0, borderRadius: 12,
        background: "#01050b", border: `1px solid ${theme.border}`,
        overflow: "hidden",
      }}>
        {/* Blue fill that follows handle */}
        {showTrack && (
          <motion.div style={{
            position: "absolute", left: 0, top: 0, bottom: 0,
            width: fillWidth,
            background: "linear-gradient(90deg, rgba(94,134,240,0.28), rgba(94,134,240,0.06))",
            borderRadius: "12px 0 0 12px",
            pointerEvents: "none",
          }} />
        )}

        {/* Idle label */}
        {showTrack && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            paddingLeft: 54,
            color: theme.muted2, fontSize: 11, fontWeight: 700,
            letterSpacing: "0.14em", fontFamily: "Inter, Arial, sans-serif",
            pointerEvents: "none",
          }}>
            SLIDE TO DOWNLOAD ›
          </div>
        )}

        {/* Loading / done overlay */}
        <AnimatePresence>
          {!showTrack && (
            <motion.div
              key={phase}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              style={{
                position: "absolute", inset: 0, borderRadius: 12,
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: 8, color: "#fff", fontWeight: 700, fontSize: 13,
                letterSpacing: "0.08em", fontFamily: "Inter, Arial, sans-serif",
                background: phase === "done" ? theme.button : "#0e1d4a",
              }}
            >
              {phase === "done" ? (
                <motion.span
                  initial={{ scale: 0.65 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 420, damping: 22 }}
                  style={{ display: "flex", alignItems: "center", gap: 7 }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  PDF SAVED
                </motion.span>
              ) : (
                <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "rg-spin 1s linear infinite" }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  GENERATING…
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Drag handle — keyed so it fully remounts (x = 0) after reset */}
      <AnimatePresence>
        {showTrack && (
          <motion.div
            key={handleKey}
            drag="x"
            dragConstraints={{ left: 0, right: DRAG_MAX }}
            dragElastic={0.04}
            dragMomentum={false}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            style={{ x, position: "absolute", top: 4, left: 4, zIndex: 10, touchAction: "none" }}
          >
            <motion.div
              animate={{
                scale: isDragging ? 1.08 : 1,
                boxShadow: isDragging
                  ? "0 0 30px rgba(94,134,240,0.75)"
                  : "0 0 16px rgba(94,134,240,0.38)",
              }}
              transition={{ type: "spring", stiffness: 400, damping: 24 }}
              style={{
                width: 44, height: 44, borderRadius: 9,
                background: `linear-gradient(135deg, ${theme.blueBright}, ${theme.button})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: isDragging ? "grabbing" : "grab",
              }}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SearchPanel({ address, setAddress, dateOfLoss, setDateOfLoss, onLookup, loading }) {
  const fieldStyle = {
    background: "#01050b",
    color: theme.blueBright,
    border: `1px solid ${theme.border}`,
    borderRadius: 8,
    padding: "14px 18px",
    fontSize: 15,
    outline: "none",
    fontFamily: '"IBM Plex Mono", monospace',
    width: "100%",
    boxSizing: "border-box",
  };

  return (
    <Panel style={{ marginBottom: SECTION_GAP }}>
      <SectionLabel>Property Address Lookup</SectionLabel>

      <style>{`
        .hail-search-grid {
          display: grid;
          grid-template-columns: 1fr 200px 170px;
          gap: 14px;
          align-items: end;
        }
        @media (max-width: 768px) {
          .hail-search-grid {
            grid-template-columns: 1fr 1fr;
          }
          .hail-search-btn { grid-column: 1 / -1; }
        }
        @media (max-width: 480px) {
          .hail-search-grid {
            grid-template-columns: 1fr;
          }
          .hail-search-btn { grid-column: unset; }
        }
      `}</style>
      <div className="hail-search-grid">
        <div>
          <div
            style={{
              color: theme.muted2,
              fontSize: 9,
              letterSpacing: "0.15em",
              fontFamily: '"IBM Plex Mono", monospace',
              marginBottom: 4,
              textTransform: "uppercase",
            }}
          >
            Property Address
          </div>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onLookup()}
            placeholder="53 Angus Run, Seneca, SC"
            style={fieldStyle}
          />
        </div>

        {/* Date of Loss — custom calendar picker */}
        <div>
          <div
            style={{
              color: theme.muted2,
              fontSize: 9,
              letterSpacing: "0.15em",
              fontFamily: '"IBM Plex Mono", monospace',
              marginBottom: 4,
              textTransform: "uppercase",
            }}
          >
            Date of Loss (optional)
          </div>
          <DatePicker
            value={dateOfLoss}
            onChange={setDateOfLoss}
            placeholder="Select date…"
          />
        </div>

        {/* RUN QUERY button */}
        <GradientRunButton onClick={onLookup} loading={loading} />
      </div>

      {dateOfLoss && (
        <div
          style={{
            marginTop: 8,
            color: theme.blue,
            fontSize: 11,
            fontFamily: '"IBM Plex Mono", monospace',
            letterSpacing: "0.05em",
          }}
        >
          ◆ Date of Loss set — IDW storm interpolation will run after query
        </div>
      )}
    </Panel>
  );
}

function PdfPageShell({ children, showTopHeader = false, preview = false }) {
  return (
    <div
      style={{
        width: PAGE_W,
        // PDF capture needs exact page height; preview uses auto so no blank space
        height: preview ? "auto" : PAGE_H,
        minHeight: preview ? undefined : PAGE_H,
        background: theme.pageBg,
        color: theme.text,
        position: "relative",
        overflow: preview ? "visible" : "hidden",
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      {showTopHeader ? (
        <div
          style={{
            background: theme.headerBg,
            borderBottom: `1px solid ${theme.borderSoft}`,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            padding: "10px 16px 10px 14px",
          }}
        >
          {/* Left — data source badge */}
          <div
            style={{
              color: theme.muted2,
              fontSize: 8,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontFamily: '"IBM Plex Mono", monospace',
              lineHeight: 1.55,
              paddingTop: 2,
            }}
          >
            <div>DATA SOURCE: NOAA NWS</div>
            <div>NCEI STORM EVENTS DB</div>
          </div>

          {/* Center — stacked logo block matching app header */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            <img
              src="/swi-logo.png"
              alt="Severe Weather Intelligence"
              style={{ height: 52, width: "auto", objectFit: "contain" }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  fontFamily: "Montserrat, Arial, sans-serif",
                  fontWeight: 700,
                  fontSize: 9,
                  letterSpacing: "0.28em",
                  color: theme.muted2,
                  textTransform: "uppercase",
                }}
              >
                BY
              </span>
              <img
                src="/trinity-logo.png"
                alt="Trinity Engineering"
                style={{ height: 20, width: "auto", objectFit: "contain" }}
              />
            </div>
            <div
              style={{
                color: theme.muted2,
                fontSize: 7.5,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                fontFamily: '"IBM Plex Mono", monospace',
              }}
            >
              NOAA STORM EVENTS DATABASE · 10-YEAR LOOKBACK
            </div>
          </div>

          {/* Right — spacer to balance layout */}
          <div style={{ width: 110 }} />
        </div>
      ) : null}

      <div
        style={{
          padding: showTopHeader ? "18px 22px 18px 22px" : "20px 22px 18px 22px",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function AddressLookupBand({ address }) {
  return (
    <Panel style={{ marginBottom: SECTION_GAP, paddingBottom: 16 }}>
      <SectionLabel>Property Address Lookup</SectionLabel>
      <div
        style={{
          minHeight: 44,
          display: "flex",
          alignItems: "center",
          border: `1px solid ${theme.border}`,
          borderRadius: 8,
          background: "#01050b",
          color: theme.blueBright,
          padding: "0 16px",
          fontSize: 14,
          fontFamily: '"IBM Plex Mono", monospace',
        }}
      >
        {address || "N/A"}
      </div>
    </Panel>
  );
}

function SummaryCards({ data }) {
  const risk = getRiskStyle(data.riskLevel);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: SECTION_GAP,
        marginBottom: SECTION_GAP,
      }}
    >
      <Panel>
        <SectionLabel>Location Identified</SectionLabel>
        <div
          style={{
            color: theme.blueBright,
            fontWeight: 800,
            fontSize: 17,
            lineHeight: 1.25,
            marginBottom: 8,
          }}
        >
          {data.location.county}, {data.location.state}
        </div>
        <div
          style={{
            color: theme.muted,
            fontSize: 13,
            fontFamily: '"IBM Plex Mono", monospace',
          }}
        >
          {data.location.address}
        </div>
      </Panel>

      <div
        style={{
          background: risk.bg,
          border: `1px solid ${risk.border}`,
          borderRadius: 12,
          padding: 18,
        }}
      >
        <SectionLabel>Hail Risk Assessment</SectionLabel>
        <div
          style={{
            color: risk.text,
            fontWeight: 800,
            fontSize: 22,
            marginBottom: 8,
          }}
        >
          {data.riskLevel}
        </div>
        <div
          style={{
            color: "#d5b07a",
            fontSize: 13,
            fontFamily: '"IBM Plex Mono", monospace',
          }}
        >
          {data.stats.yearsSearched} · {data.stats.totalHailEvents} events found
        </div>
      </div>
    </div>
  );
}

function WeatherSummary({ text }) {
  return (
    <Panel style={{ marginBottom: SECTION_GAP }}>
      <SectionLabel>Weather Summary</SectionLabel>
      <div
        style={{
          color: theme.text,
          fontSize: 14,
          lineHeight: 1.9,
          whiteSpace: "pre-wrap",
        }}
      >
        {text}
      </div>
    </Panel>
  );
}

function StatsGrid({ stats }) {
const items = [
    { label: "Total Hail Events", value: stats.totalHailEvents },
    { label: "Largest Hail", value: stats.largestHailSize },
    { label: "Avg / Year", value: stats.avgEventsPerYear },
    { label: "Most Active Month", value: stats.mostActiveMonth },
    { label: "NEXRAD Hits", value: stats.nexradHits ?? "—" },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: 12,
        marginBottom: SECTION_GAP,
      }}
    >
      {items.map((item) => (
        <Panel key={item.label} style={{ padding: "14px 14px 16px 14px" }}>
          <div
            style={{
              color: theme.muted2,
              fontSize: 10,
              letterSpacing: 2.6,
              textTransform: "uppercase",
              fontFamily: '"IBM Plex Mono", monospace',
              textAlign: "center",
              marginBottom: 10,
            }}
          >
            {item.label}
          </div>
          <div
            style={{
              color: theme.blueBright,
              textAlign: "center",
              fontSize: 16,
              fontWeight: 800,
              lineHeight: 1.2,
            }}
          >
            {item.value}
          </div>
        </Panel>
      ))}
    </div>
  );
}

function ReportIntro({ data, address }) {
  return (
    <>
      <AddressLookupBand address={address} />
      <SummaryCards data={data} />
      <WeatherSummary text={data.summary} />
      <StatsGrid stats={data.stats} />
    </>
  );
}

function TableShell({ title, children, style = {} }) {
  return (
    <div
      style={{
        background: theme.panel,
        border: `1px solid ${theme.border}`,
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: SECTION_GAP,
        ...style,
      }}
    >
      <div
        style={{
          padding: "16px 18px 13px 18px",
          borderBottom: `1px solid ${theme.borderSoft}`,
          color: theme.muted2,
          fontSize: 10,
          letterSpacing: 3.2,
          textTransform: "uppercase",
          fontFamily: '"IBM Plex Mono", monospace',
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function TableHeader({ columns }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: columns.map((c) => c.width).join(" "),
        padding: "10px 18px",
        borderBottom: `1px solid ${theme.borderSoft}`,
        color: theme.muted,
        fontSize: 10,
        letterSpacing: 1.8,
        textTransform: "uppercase",
        fontFamily: '"IBM Plex Mono", monospace',
      }}
    >
      {columns.map((c) => (
        <div key={c.key}>{c.label}</div>
      ))}
    </div>
  );
}

function HailEventsTable({ rows, title = "Hail Events - Past 10 Years", style = {} }) {
  return (
    <TableShell title={title} style={style}>
      <TableHeader columns={HAIL_COLUMNS} />

      {rows.length === 0 ? (
        <div style={emptyRowStyle}>No hail events returned.</div>
      ) : (
        rows.map((row, idx) => (
          <div
            key={`${row.date}-${idx}`}
            style={{
              display: "grid",
              gridTemplateColumns: HAIL_COLUMNS.map((c) => c.width).join(" "),
              padding: "13px 18px",
              borderBottom: idx === rows.length - 1 ? "none" : `1px solid ${theme.borderSoft}`,
              fontSize: 13,
              lineHeight: 1.35,
            }}
          >
            <div style={monoCellStyle}>{formatDate(row.date)}</div>
            <div style={{ ...monoCellStyle, color: "#ffcb54", fontWeight: 700 }}>
              {row.size || "N/A"}
              {row.nexradCorroboration && (
                <div style={{ fontSize: 10, fontWeight: 400, marginTop: 3, color: row.nexradCorroboration.corroborated ? "#4caf50" : "#aaa" }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{width:10,height:10,marginRight:3,verticalAlign:'middle',display:'inline-block'}}>
                    <path d="M1 11 A9 9 0 0 1 19 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M3.5 11 A6.5 6.5 0 0 1 16.5 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M6 11 A4 4 0 0 1 14 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="10" cy="11" r="1.5"/>
                    <rect x="9" y="11" width="2" height="4" rx="0.5"/>
                    <rect x="4" y="15" width="12" height="2" rx="1"/>
                  </svg>
                  {` NEXRAD (WSR-88D) ${row.nexradCorroboration.maxSizeIn}" aloft`}
                  {row.nexradCorroboration.corroborated ? " ✓ Corroborated" : " (independent radar detection)"}
                  {row.nexradCorroboration.radar ? ` · ${row.nexradCorroboration.radar}` : ""}
                </div>
              )}
            </div>
            <div style={monoCellStyle}>{row.location || "N/A"}</div>
            <div style={{ ...monoCellStyle, color: theme.dangerText }}>
              {row.propertyDamage || "N/A"}
            </div>
            <div style={{ ...monoCellStyle, textAlign: "center" }}>{row.injuries ?? 0}</div>
            <div style={{ ...monoCellStyle, textAlign: "center" }}>{row.deaths ?? 0}</div>
          </div>
        ))
      )}
    </TableShell>
  );
}

function OtherEventsTable({ rows, title = "Other Severe Weather Events", style = {} }) {
  return (
    <TableShell title={title} style={style}>
      <TableHeader columns={OTHER_COLUMNS} />

      {rows.length === 0 ? (
        <div style={emptyRowStyle}>No additional severe weather events returned.</div>
      ) : (
        rows.map((row, idx) => (
          <div
            key={`${row.date}-${idx}`}
            style={{
              display: "grid",
              gridTemplateColumns: OTHER_COLUMNS.map((c) => c.width).join(" "),
              padding: "13px 18px",
              borderBottom: idx === rows.length - 1 ? "none" : `1px solid ${theme.borderSoft}`,
              fontSize: 13,
              lineHeight: 1.35,
            }}
          >
            <div style={monoCellStyle}>{formatDate(row.date)}</div>
            <div style={{ ...monoCellStyle, color: theme.purpleText, fontWeight: 700 }}>
              {row.type || "N/A"}
            </div>
            <div style={monoCellStyle}>{row.location || "N/A"}</div>
            <div style={monoCellStyle}>{row.description || "N/A"}</div>
            <div style={{ ...monoCellStyle, color: theme.dangerText }}>
              {row.damage || "N/A"}
            </div>
          </div>
        ))
      )}
    </TableShell>
  );
}

function SourcesBlock({ sources, style = {} }) {
  return (
    <TableShell title="Data Sources" style={style}>
      <div style={{ padding: "14px 18px 12px 18px" }}>
        {sources.length === 0 ? (
          <div style={emptyRowStyle}>No source links returned.</div>
        ) : (
          sources.map((s, i) => (
            <div
              key={`${s}-${i}`}
              style={{
                color: theme.blue,
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 12,
                lineHeight: 1.7,
                marginBottom: 6,
                wordBreak: "break-all",
              }}
            >
              ↗ {s}
            </div>
          ))
        )}
      </div>
    </TableShell>
  );
}

function ReportPage({ page, data, address, preview = false }) {
  return (
    <PdfPageShell showTopHeader={page.showTopHeader} preview={preview}>
      {page.showIntro ? <ReportIntro data={data} address={address} /> : null}

      {page.sections.map((section, idx) => {
        if (section.type === "hail") {
          return (
            <HailEventsTable
              key={`${section.type}-${idx}`}
              rows={section.rows}
              title={section.title}
            />
          );
        }

        if (section.type === "other") {
          return (
            <OtherEventsTable
              key={`${section.type}-${idx}`}
              rows={section.rows}
              title={section.title}
            />
          );
        }

        if (section.type === "sources") {
          return (
            <SourcesBlock
              key={`${section.type}-${idx}`}
              sources={section.sources}
            />
          );
        }

        return null;
      })}

      {/* Footer: only in PDF-capture mode, not in on-screen preview */}
      {page.showFooter && !preview ? <TrinityFooter /> : null}
      {/* In preview, render footer inline so it flows naturally after content */}
      {page.showFooter && preview ? (
        <div style={{ textAlign: "center", padding: "24px 0 18px" }}>
          <FooterContent />
        </div>
      ) : null}
    </PdfPageShell>
  );
}

function ReportPreview({ data, address, pages }) {
  return (
    <div>
      <div
        style={{
          color: theme.muted2,
          fontSize: 11,
          letterSpacing: 2.2,
          textTransform: "uppercase",
          fontFamily: '"IBM Plex Mono", monospace',
          marginBottom: 12,
        }}
      >
        Report preview
      </div>

      <div style={{ display: "grid", gap: 18 }}>
        {pages.map((page, idx) => (
          <div
            key={`preview-${idx}`}
            style={{
              width: "100%",
              overflowX: "auto",
              borderRadius: 14,
              border: `1px solid ${theme.borderSoft}`,
              background: "#01040a",
              padding: 10,
            }}
          >
            <div style={{ width: PAGE_W }}>
              {/* preview=true → auto height, no blank space, inline footer */}
              <ReportPage page={page} data={data} address={address} preview />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [address, setAddress] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const [dateOfLoss, setDateOfLoss] = useState("");
  const [idwResult, setIdwResult] = useState(null);

  const [authChecking, setAuthChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Auth screen routing: 'login' | 'signup' | 'forgot' | 'otp' | 'new-password'
  const [authScreen, setAuthScreen] = useState("login");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode]   = useState("");

  const [pages, setPages] = useState([]);
  const [layoutReady, setLayoutReady] = useState(false);

  const pageRefs = useRef([]);
  const idwPdfRef = useRef(null);

  const introMeasureRef = useRef(null);
  const hailBaseMeasureRef = useRef(null);
  const otherBaseMeasureRef = useRef(null);
  const sourcesBaseMeasureRef = useRef(null);
  const footerMeasureRef = useRef(null);

  const hailRowMeasureRefs = useRef([]);
  const otherRowMeasureRefs = useRef([]);
  const sourceRowMeasureRefs = useRef([]);

  useEffect(() => {
    ensureFonts();
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const storedToken = localStorage.getItem("hail_token");
        const res = await fetch(`${API}/api/auth/session`, {
          credentials: "include",
          headers: storedToken ? { Authorization: `Bearer ${storedToken}` } : {},
        });
        const data = await parseResponseJson(res, "Session API");
        if (data?.authenticated) {
          setAuthenticated(true);
          setCurrentUser(data.user || null);
        } else {
          setAuthenticated(false);
        }
      } catch {
        setAuthenticated(false);
      } finally {
        setAuthChecking(false);
      }
    };

    checkSession();
  }, []);

  const normalized = useMemo(() => normalizeResult(result, address), [result, address]);

  useEffect(() => {
    let cancelled = false;

    async function measureLayout() {
      if (!normalized) {
        if (!cancelled) {
          setPages([]);
          setLayoutReady(true);
        }
        return;
      }

      if (!cancelled) setLayoutReady(false);

      await document.fonts.ready;

      requestAnimationFrame(() => {
        if (cancelled) return;

        const metrics = {
          introHeight: getHeight(introMeasureRef.current),
          hailBaseHeight: getHeight(hailBaseMeasureRef.current),
          otherBaseHeight: getHeight(otherBaseMeasureRef.current),
          sourcesBaseHeight: getHeight(sourcesBaseMeasureRef.current),
          footerHeight: getHeight(footerMeasureRef.current),
          hailRowHeights: normalized.hailEvents.map((_, i) =>
            getHeight(hailRowMeasureRefs.current[i])
          ),
          otherRowHeights: normalized.otherEvents.map((_, i) =>
            getHeight(otherRowMeasureRefs.current[i])
          ),
          sourceRowHeights: normalized.sources.map((_, i) =>
            getHeight(sourceRowMeasureRefs.current[i])
          ),
        };

        const builtPages = buildMeasuredPages(normalized, metrics);
        setPages(builtPages);
        setLayoutReady(true);
      });
    }

    measureLayout();

    return () => {
      cancelled = true;
    };
  }, [normalized]);

  function handleAuthSuccess(user) {
    setCurrentUser(user || null);
    setAuthenticated(true);
  }

  async function handleLogout() {
    try {
      const storedToken = localStorage.getItem("hail_token");
      await fetch(`${API}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: storedToken ? { Authorization: `Bearer ${storedToken}` } : {},
      });
    } catch {
      // ignore
    }
    localStorage.removeItem("hail_token");
    setAuthenticated(false);
    setCurrentUser(null);
    setResult(null);
    setAddress("");
    setAuthScreen("login");
  }

  async function callAnthropic(messages, useTools = true) {
    const storedToken = localStorage.getItem("hail_token");
    const res = await fetch(`${API}/api/anthropic`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: useTools ? 4096 : 4096,
        system: systemPrompt,
        ...(useTools
          ? { tools: [{ type: "web_search_20250305", name: "web_search" }] }
          : {}),
        messages,
      }),
    });

    const text = await res.text();

    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`Unexpected server response: ${text.slice(0, 160)}`);
    }

    if (res.status === 401 && data?.sessionExpired) {
      setAuthenticated(false);
      throw new Error("Your session expired. Please sign in again.");
    }

    if (!res.ok) {
      throw new Error(data?.error?.message || data?.error || `HTTP ${res.status}`);
    }

    return data;
  }

async function handleLookup() {
  if (!address.trim()) return;

  setLoading(true);
  setError("");
  setResult(null);
  setIdwResult(null);

  try {
    const storedToken = localStorage.getItem("hail_token");
    const authHeaders = {
      "Content-Type": "application/json",
      ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
    };

    // ── Step 1: Geocode via Claude (fast, no tools) ──────────────────────────
    const geocodeMessages = [
      {
        role: "user",
        content: `Return ONLY a JSON object with lat and lon for this address: ${address}
Example: {"lat": "35.9029", "lon": "-77.5266"}
No prose. No markdown. Just the JSON.`,
      },
    ];

    const geoData = await callAnthropic(geocodeMessages, false);
    let lat, lon;

    try {
      const geoJson = extractJsonPayload(geoData);
      lat = parseFloat(geoJson?.lat);
      lon = parseFloat(geoJson?.lon);
    } catch {
      throw new Error("Could not geocode address. Please try a more specific address.");
    }

    if (isNaN(lat) || isNaN(lon)) {
      throw new Error("Could not geocode address. Please try a more specific address.");
    }

    const currentYear = new Date().getFullYear();
    const startDate = `${currentYear - 10}-01-01`;
    const endDate = `${currentYear}-12-31`;

    // ── Step 2: Fetch all three data sources in parallel ─────────────────────
const [noaaRes, lsrRes, stationsRes, stormEventsRes, nexradRes] = await Promise.all([
      fetch(
        `${API}/api/noaa/events?lat=${lat}&lon=${lon}&startDate=${startDate}&endDate=${endDate}`,
        { credentials: "include", headers: authHeaders }
      ),
      fetch(
        `${API}/api/lsr?lat=${lat}&lon=${lon}&startDate=${startDate}&endDate=${endDate}&radius=25`,
        { credentials: "include", headers: authHeaders }
      ),
      dateOfLoss
        ? fetch(
            `${API}/api/stations?lat=${lat}&lon=${lon}&date=${dateOfLoss}`,
            { credentials: "include", headers: authHeaders }
          )
: Promise.resolve(null),
    fetch(
   `${API}/api/noaa/stormevents?lat=${lat}&lon=${lon}&startDate=${startDate}&endDate=${endDate}`,
        { credentials: "include", headers: authHeaders }
      ),
      fetch(
  `${API}/api/nexrad?lat=${lat}&lon=${lon}`,
{ credentials: "include", headers: authHeaders, signal: AbortSignal.timeout(300000) }
),    ]);
  
const [noaaData, lsrData, stationsData, stormEventsData, nexradData] = await Promise.all([
      noaaRes.json(),
      lsrRes.json(),
      stationsRes ? stationsRes.json() : null,
      stormEventsRes.json(),
      nexradRes.json().catch((e) => { console.log('NEXRAD parse error:', e); return { hits: [] }; }),
    ]);

    // — NEXRAD corroboration index ————————————————————————————
const nexradByDate = {};
(nexradData?.hits || []).forEach((h) => {
  if (!h.date) return;
  // Dates from Zoho are already in DD-MMM-YYYY format — use directly as key
  const key = h.date;
  if (!nexradByDate[key] || parseFloat(h.maxSizeIn) > parseFloat(nexradByDate[key].maxSizeIn)) {
    nexradByDate[key] = h;
  }
});
    // ── Step 3: Haversine distance filter ────────────────────────────────────
    function haversineDistance(lat1, lon1, lat2, lon2) {
      const R = 3958.8;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    const nearbyEvents = (noaaData?.events || [])
      .filter((e) => {
        if (!e.lat || !e.lon) return true;
        return haversineDistance(lat, lon, e.lat, e.lon) <= 25;
      })
      .slice(0, 100);

    const nearbyLsr = (lsrData?.reports || [])
      .filter((r) => {
        if (!r.lat || !r.lon) return true;
        return haversineDistance(lat, lon, r.lat, r.lon) <= 25;
      })
      .slice(0, 50);

    // ── Step 4: Build prompt with all three tiers ─────────────────────────────
    const dataPayload = {
      property: {
        address,
        lat,
        lon,
        county: noaaData?.county,
        state: noaaData?.state,
      },
      dateOfLoss: dateOfLoss || null,
      lookbackYears: 10,
      dateRange: { start: startDate, end: endDate },
      tier1_lsr_hail_reports: nearbyLsr,
      tier2_storm_events: nearbyEvents,
      tier2_noaa_storm_events_hail: `${stormEventsData?.hailCount || 0} hail events confirmed in database — injected directly, do not regenerate`,
      tier2_noaa_storm_events_other: stormEventsData?.otherEvents || [],

      tier3_instructions: "Search the web for any additional hail or severe weather events near this property not already captured in Tier 1 or Tier 2 data. Search NOAA Storm Events, SPC storm reports, and NWS archives for this county.",
      stationObservations: stationsData || null,
    };

    const dateClause = dateOfLoss
      ? `\nDate of Loss: ${dateOfLoss}. Use the provided station observations to populate the stations array for IDW interpolation.`
      : "";

    const analysisMessages = [
      {
        role: "user",
  content: `You are a forensic weather analyst. Return a JSON report for this property.

PROPERTY: ${address}
COUNTY: ${stormEventsData?.county || noaaData?.county}, ${stormEventsData?.state || noaaData?.state}
COORDINATES: ${lat}, ${lon}
DATE OF LOSS: ${dateOfLoss || "Not provided"}

YOUR ONLY TASKS:
1. Write a 2-3 sentence forensic weather summary
2. Format the Visual Crossing stations below into the stations array for IDW interpolation
3. Return these exact sources: ["https://www.ncdc.noaa.gov/stormevents/", "https://www.visualcrossing.com", "https://mesonet.agron.iastate.edu/lsr/", "https://www.ncei.noaa.gov/swdiws/csv/nx3hail/", "https://www.ofcm.gov/publications/fmh/FMH11/FMH11D.pdf"]

DO NOT populate hailEvents — leave it as [].
DO NOT populate otherEvents — leave it as [].
DO NOT search the web.

VISUAL CROSSING STATION DATA:
${stationsData ? JSON.stringify(stationsData, null, 2) : "No date of loss provided — return empty stations array."}

Return ONLY valid JSON with summary, riskLevel, hailEvents:[], otherEvents:[], stats:{}, sources:[], stations:[].`,

      },
    ];

    // ── Step 5: Claude analyzes data + fills gaps with web search ─────────────
    let data = null;
    let messages = analysisMessages;

    for (let i = 0; i < 4; i++) {
      data = await callAnthropic(messages, true);

      if (data?.stop_reason === "tool_use") {
        messages = [...messages, { role: "assistant", content: data.content }];
        const toolResults = (data.content || [])
          .filter((b) => b.type === "tool_use")
          .map((b) => ({
            type: "tool_result",
            tool_use_id: b.id,
            content: b.content ?? "Search completed.",
          }));
        messages = [...messages, { role: "user", content: toolResults }];
      } else {
        break;
      }
    }

    let parsed = extractJsonPayload(data);

    // Repair pass if needed
    if (!parsed) {
      const repairMessages = [
        ...messages,
        { role: "assistant", content: data.content },
        {
          role: "user",
          content: "Return the exact same answer as valid JSON only. Start with { and end with }.",
        },
      ];
      const repaired = await callAnthropic(repairMessages, false);
      parsed = extractJsonPayload(repaired);
    }

    if (!parsed) {
parsed = { location: { address, lat: String(lat), lon: String(lon), county: stormEventsData?.county || noaaData?.county, state: stormEventsData?.state || noaaData?.state }, summary: "Weather analysis based on NOAA Storm Events Database records.", riskLevel: "Moderate", hailEvents: [], otherEvents: [], stats: { totalHailEvents: 0, largestHailSize: "0", avgEventsPerYear: "0", mostActiveMonth: "N/A", yearsSearched: `${new Date().getFullYear()-10}-${new Date().getFullYear()}` }, sources: ["https://www.ncdc.noaa.gov/stormevents/"], stations: [] };    }

    // Ensure lat/lon are set from our geocode
    if (parsed.location) {
      parsed.location.lat = String(lat);
      parsed.location.lon = String(lon);
    }

if (!parsed) {
  parsed = { location: { address, lat: String(lat), lon: String(lon), county: noaaData?.county, state: noaaData?.state }, summary: "", riskLevel: "Moderate", hailEvents: [], otherEvents: [], stats: { totalHailEvents: 0, largestHailSize: "0", avgEventsPerYear: "0", mostActiveMonth: "N/A", yearsSearched: `${new Date().getFullYear()-10}-${new Date().getFullYear()}` }, sources: [], stations: [] };
}
const directHailEvents = stormEventsData.hailEvents
  .filter(e => {
    const mag = parseFloat(e.magnitude);
    return mag > 0 && mag <= 6 && e.magnitudeType !== "EG";
  })
  .map(e => ({
    date: e.date,
    size: `${e.magnitude} inches${(() => { const s = parseFloat(e.magnitude); if (s >= 4.50) return ' (Softball)'; if (s >= 4.00) return ' (Grapefruit)'; if (s >= 2.75) return ' (Baseball)'; if (s >= 2.50) return ' (Tennis Ball)'; if (s >= 1.75) return ' (Golf Ball)'; if (s >= 1.50) return ' (Ping Pong Ball)'; if (s >= 1.25) return ' (Half Dollar)'; if (s >= 1.00) return ' (Quarter)'; if (s >= 0.88) return ' (Nickel)'; if (s >= 0.75) return ' (Penny)'; if (s >= 0.50) return ' (Marble)'; if (s >= 0.25) return ' (Pea)'; return ''; })()}`,    location: e.location || `${stormEventsData.county}, ${stormEventsData.state}`,
    injuries: e.injuries || 0,
    deaths: e.deaths || 0,
    propertyDamage: e.propertyDamage || "N/A",
    source: "NOAA Storm Events Database",
        nexradCorroboration: nexradByDate[e.date] ? {
          maxSizeIn: nexradByDate[e.date].maxSizeIn,
          probHail: nexradByDate[e.date].probHail,
          probSevere: nexradByDate[e.date].probSevere,
          radar: nexradByDate[e.date].radar,
          corroborated: Math.abs(parseFloat(nexradByDate[e.date].maxSizeIn) - parseFloat(e.magnitude)) <= 0.25,
        } : null,
      }));
  parsed.hailEvents = [
    ...directHailEvents,
    ...(parsed.hailEvents || []),
  ];
  parsed.otherEvents = (stormEventsData?.otherEvents || [])
  .filter(e => e.type && e.date && e.type !== "Hail")
  .map(e => ({
    date: e.date,
    type: e.type,
location: `${e.county || stormEventsData?.county}, ${e.state || stormEventsData?.state}`,
description: e.narrative ? e.narrative.slice(0, 150) : e.type,    damage: e.propertyDamage || "N/A",
  }));
  const nexradHitCount = Object.keys(nexradByDate).length;
  const nexradCorroboratedCount = parsed.hailEvents.filter(e => e.nexradCorroboration !== null).length;
  parsed.stats = {
    totalHailEvents: parsed.hailEvents.length,
    nexradHits: nexradHitCount,
avgEventsPerYear: (parsed.hailEvents.length / 10).toFixed(1),
mostActiveMonth: (() => {
  const counts = {};
  parsed.hailEvents.forEach(e => {
    const month = new Date(e.date).toLocaleString('default', { month: 'long' });
    counts[month] = (counts[month] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
})(),
  largestHailSize: directHailEvents.reduce((max, e) => {
  const size = parseFloat(e.size);
  return size > parseFloat(max) ? String(size) : max;
}, "0"),
riskLevel: (() => {
  const max = parseFloat(directHailEvents.reduce((m, e) => {
    const s = parseFloat(e.size);
    return s > parseFloat(m) ? String(s) : m;
  }, "0"));
  const count = directHailEvents.length;
  if (max >= 1.75 || count >= 10) return "High";
  if (max >= 1.00 || count >= 5) return "Moderate";
  if (max >= 0.75 || count >= 1) return "Low";
  return "None";
})(),
  };
parsed.riskLevel = parsed.stats.riskLevel;
if (nexradCorroboratedCount > 0) {
      parsed.summary += ` ${nexradCorroboratedCount} of ${parsed.hailEvents.length} recorded hail event${parsed.hailEvents.length !== 1 ? 's' : ''} were independently detected by NEXRAD WSR-88D radar, providing multi-source corroboration.`;
    }
    setResult(parsed);
    // ── Step 6: Run IDW if date of loss and stations returned ─────────────────
    if (dateOfLoss && Array.isArray(parsed?.stations) && parsed.stations.length >= 2) {
      const idw = runIDW(lat, lon, parsed.stations);
      setIdwResult(idw);
    }

  } catch (err) {
    setError(err.message || "Failed to retrieve weather data.");
  } finally {
    setLoading(false);
  }
}

  async function downloadPDF() {
    if (!normalized || !layoutReady || pages.length === 0) return;

    setPdfLoading(true);

    try {
      await document.fonts.ready;

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "a4",
      });

      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < pages.length; i += 1) {
        const node = pageRefs.current[i];
        if (!node) continue;

        const canvas = await html2canvas(node, {
          backgroundColor: theme.pageBg,
          scale: 2.2,
          useCORS: true,
          logging: false,
          windowWidth: PAGE_W,
          windowHeight: PAGE_H,
        });

        const img = canvas.toDataURL("image/png");

        if (i > 0) pdf.addPage();
        // Ensure dark background on every page before placing image
        pdf.setFillColor(3, 7, 15);
        pdf.rect(0, 0, pdfW, pdfH, "F");
        pdf.addImage(img, "PNG", 0, 0, pdfW, pdfH, undefined, "FAST");
      }

      // Add IDW page if date of loss was set and IDW computed
      if (idwResult && idwPdfRef.current) {
        const idwNode = idwPdfRef.current;
        const idwCanvas = await html2canvas(idwNode, {
          backgroundColor: theme.pageBg,
          scale: 2.2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          windowWidth: PAGE_W,
          windowHeight: PAGE_H,
          // Override scroll offsets so html2canvas finds the off-screen element
          scrollX: -window.scrollX,
          scrollY: -window.scrollY,
          x: 0,
          y: 0,
          width: PAGE_W,
          height: idwNode.scrollHeight || PAGE_H,
        });
        pdf.addPage();
        // Fill entire page with dark background so no white gap appears
        pdf.setFillColor(3, 7, 15); // theme.pageBg #03070f
        pdf.rect(0, 0, pdfW, pdfH, "F");
        const idwImg = idwCanvas.toDataURL("image/png");
        // Scale proportionally, anchored to top-left
        const idwRatio = idwCanvas.height / idwCanvas.width;
        const idwH = Math.min(pdfW * idwRatio, pdfH);
        pdf.addImage(idwImg, "PNG", 0, 0, pdfW, idwH, undefined, "FAST");
      }

      const countyName = String(normalized.location.county || "report")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();

      const fileName = `trinity-swi-report-${countyName}-${new Date().toISOString().slice(0, 10)}.pdf`;

      pdf.save(fileName);
    } catch (err) {
      setError(`PDF generation failed: ${err.message || err}`);
    } finally {
      setPdfLoading(false);
    }
  }

  if (authChecking) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: theme.bg,
          color: theme.text,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Inter, Arial, sans-serif",
        }}
      >
        Checking session...
      </div>
    );
  }

  if (!authenticated) {
    if (authScreen === "otp") {
      return (
        <OtpVerifyScreen
          email={resetEmail}
          onVerified={(code) => { setResetCode(code); setAuthScreen("new-password"); }}
          onGoLogin={() => setAuthScreen("login")}
          onResend={() => setAuthScreen("forgot")}
        />
      );
    }
    if (authScreen === "new-password") {
      return (
        <NewPasswordScreen
          email={resetEmail}
          code={resetCode}
          onResetSuccess={handleAuthSuccess}
        />
      );
    }
    if (authScreen === "signup") {
      return (
        <SignupScreen
          onSignupSuccess={handleAuthSuccess}
          onGoLogin={() => setAuthScreen("login")}
        />
      );
    }
    if (authScreen === "forgot") {
      return (
        <ForgotPasswordScreen
          onEmailSent={(email) => { setResetEmail(email); setAuthScreen("otp"); }}
          onGoLogin={() => setAuthScreen("login")}
        />
      );
    }
    return (
      <LoginScreen
        onLoginSuccess={handleAuthSuccess}
        onGoSignup={() => setAuthScreen("signup")}
        onGoForgot={() => setAuthScreen("forgot")}
      />
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme.bg,
        color: theme.text,
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      <AppHeader onLogout={handleLogout} />

      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "16px 16px 40px" }}>
        <SearchPanel
          address={address}
          setAddress={setAddress}
          dateOfLoss={dateOfLoss}
          setDateOfLoss={setDateOfLoss}
          onLookup={handleLookup}
          loading={loading}
        />

        {error ? (
          <div
            style={{
              marginBottom: 16,
              color: "#ff9c9c",
              background: "#220b12",
              border: "1px solid #5d1c2b",
              padding: "12px 14px",
              borderRadius: 10,
            }}
          >
            {error}
          </div>
        ) : null}

        {!normalized ? (
          <Panel>
            <SectionLabel>Status</SectionLabel>
            <div style={{ color: theme.muted, lineHeight: 1.8 }}>
              Enter a property address and run the query. The report preview and PDF export will appear after results are returned.
            </div>
          </Panel>
        ) : !layoutReady ? (
          <Panel>
            <SectionLabel>Layout</SectionLabel>
            <div style={{ color: theme.muted, lineHeight: 1.8 }}>
              Preparing the report layout...
            </div>
          </Panel>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                marginBottom: 16,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    color: theme.white,
                    fontWeight: 800,
                    fontSize: 18,
                    marginBottom: 4,
                  }}
                >
                  Report ready
                </div>
                <div
                  style={{
                    color: theme.muted,
                    fontSize: 13,
                  }}
                >
                  {normalized.location.address}
                </div>
              </div>

              <SlideDownloadButton onDownload={downloadPDF} loading={pdfLoading} />
            </div>

            <div className="hail-report-scroll">
              <ReportPreview
                data={normalized}
                address={address}
                pages={pages}
              />
            </div>

            {/* IDW Storm Interpolation Panel — only shows when Date of Loss is set */}
            {idwResult && (
              <div style={{ marginTop: 20 }}>
                <div
                  style={{
                    color: "#4d6797",
                    fontSize: 9,
                    letterSpacing: "0.15em",
                    fontFamily: '"IBM Plex Mono", monospace',
                    marginBottom: 10,
                    textTransform: "uppercase",
                  }}
                >
                  IDW Storm Interpolation · Date of Loss Analysis
                </div>
                <IDWPanel
                  idwResult={idwResult}
                  dateOfLoss={dateOfLoss}
                  propertyAddress={normalized.location.address}
                />
              </div>
            )}

            {/* Date of Loss set but not enough stations returned */}
            {dateOfLoss && !idwResult && normalized && (
              <div
                style={{
                  marginTop: 20,
                  background: "#050b14",
                  border: "1px solid #17325f",
                  borderRadius: 10,
                  padding: "14px 18px",
                  color: "#4d6797",
                  fontSize: 12,
                  fontFamily: '"IBM Plex Mono", monospace',
                }}
              >
                ◇ IDW interpolation requires ≥ 2 nearby stations for {dateOfLoss}. No station data was returned for this date.
              </div>
            )}
          </>
        )}
      </div>

      {normalized ? (
        <>
          <div
            style={{
              position: "absolute",
              left: -30000,
              top: 0,
              width: PAGE_W,
              pointerEvents: "none",
              opacity: 0,
            }}
          >
            <div ref={introMeasureRef} style={{ width: PAGE_W }}>
              <ReportIntro data={normalized} address={address} />
            </div>

            <div ref={hailBaseMeasureRef} style={{ width: PAGE_W }}>
              <HailEventsTable rows={[]} title="Hail Events - Past 10 Years" style={{ marginBottom: 0 }} />
            </div>

            {normalized.hailEvents.map((row, i) => (
              <div
                key={`measure-hail-row-${i}`}
                ref={(el) => {
                  hailRowMeasureRefs.current[i] = el;
                }}
                style={{
                  display: "grid",
                  gridTemplateColumns: HAIL_COLUMNS.map((c) => c.width).join(" "),
                  padding: "13px 18px",
                  fontSize: 13,
                  lineHeight: 1.35,
                  width: PAGE_W - 44,
                }}
              >
                <div style={monoCellStyle}>{formatDate(row.date)}</div>
                <div style={{ ...monoCellStyle, color: "#ffcb54", fontWeight: 700 }}>
                  {row.size || "N/A"}
                </div>
                <div style={monoCellStyle}>{row.location || "N/A"}</div>
                <div style={{ ...monoCellStyle, color: theme.dangerText }}>
                  {row.propertyDamage || "N/A"}
                </div>
                <div style={{ ...monoCellStyle, textAlign: "center" }}>{row.injuries ?? 0}</div>
                <div style={{ ...monoCellStyle, textAlign: "center" }}>{row.deaths ?? 0}</div>
              </div>
            ))}

            <div ref={otherBaseMeasureRef} style={{ width: PAGE_W }}>
              <OtherEventsTable rows={[]} title="Other Severe Weather Events" style={{ marginBottom: 0 }} />
            </div>

            {normalized.otherEvents.map((row, i) => (
              <div
                key={`measure-other-row-${i}`}
                ref={(el) => {
                  otherRowMeasureRefs.current[i] = el;
                }}
                style={{
                  display: "grid",
                  gridTemplateColumns: OTHER_COLUMNS.map((c) => c.width).join(" "),
                  padding: "13px 18px",
                  fontSize: 13,
                  lineHeight: 1.35,
                  width: PAGE_W - 44,
                }}
              >
                <div style={monoCellStyle}>{formatDate(row.date)}</div>
                <div style={{ ...monoCellStyle, color: theme.purpleText, fontWeight: 700 }}>
                  {row.type || "N/A"}
                </div>
                <div style={monoCellStyle}>{row.description || "N/A"}</div>
                <div style={{ ...monoCellStyle, color: theme.dangerText }}>
                  {row.damage || "N/A"}
                </div>
              </div>
            ))}

            <div ref={sourcesBaseMeasureRef} style={{ width: PAGE_W }}>
              <SourcesBlock sources={[]} style={{ marginBottom: 0 }} />
            </div>

            {normalized.sources.map((s, i) => (
              <div
                key={`measure-source-row-${i}`}
                ref={(el) => {
                  sourceRowMeasureRefs.current[i] = el;
                }}
                style={{
                  color: theme.blue,
                  fontFamily: '"IBM Plex Mono", monospace',
                  fontSize: 12,
                  lineHeight: 1.7,
                  marginBottom: 6,
                  wordBreak: "break-all",
                  width: PAGE_W - 44,
                }}
           >
        {(() => {
          const labels = {
            "https://www.ncdc.noaa.gov/stormevents/": "NOAA Storm Events Database",
            "https://www.visualcrossing.com": "Visual Crossing / ASOS Station Network",
            "https://mesonet.agron.iastate.edu/lsr/": "IEM Local Storm Reports",
            "https://www.ncei.noaa.gov/swdiws/csv/nx3hail/": "NEXRAD Level-III Hail Detection (NOAA SWDI)",
            "https://www.ofcm.gov/publications/fmh/FMH11/FMH11D.pdf": "Federal Meteorological Handbook No. 11D (FMH-11D) — WSR-88D Radar Methodology",
          };
          const label = labels[s];
          return label ? (
            <span>↗ <strong>{label}</strong><br/><span style={{fontSize:10, opacity:0.7}}>{s}</span></span>
          ) : (
            <span>↗ {s}</span>
          );
        })()}
      </div>
    ))}

            <div ref={footerMeasureRef} style={{ width: PAGE_W }}>
              <FooterMeasure />
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              left: -20000,
              top: 0,
              width: PAGE_W,
              pointerEvents: "none",
            }}
          >
            {layoutReady &&
              pages.map((page, idx) => (
                <div
                  key={`pdf-${idx}`}
                  ref={(el) => {
                    pageRefs.current[idx] = el;
                  }}
                  style={{ width: PAGE_W, height: PAGE_H, marginBottom: 20 }}
                >
                  <ReportPage page={page} data={normalized} address={address} />
                </div>
              ))}

            {/* Hidden IDW PDF page — captured by html2canvas via idwPdfRef */}
            {idwResult && (
              <div
                ref={idwPdfRef}
                style={{
                  width: PAGE_W,
                  background: theme.pageBg,
                  color: theme.text,
                  fontFamily: "Inter, Arial, sans-serif",
                  padding: "32px 28px",
                  boxSizing: "border-box",
                }}
              >
                {/* PDF header on IDW page */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 24,
                  paddingBottom: 16,
                  borderBottom: `1px solid ${theme.borderSoft}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <img src="/swi-logo.png" alt="SWI" style={{ height: 40, width: "auto", objectFit: "contain" }} />
                    <div>
                      <div style={{ color: theme.white, fontWeight: 800, fontSize: 14, letterSpacing: 0.4 }}>SEVERE WEATHER INTELLIGENCE</div>
                      <div style={{ color: theme.muted2, fontSize: 8, letterSpacing: 2.5, fontFamily: '"IBM Plex Mono", monospace', textTransform: "uppercase", marginTop: 3 }}>Date-of-Loss Storm Interpolation Report</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", color: theme.muted2, fontSize: 8, letterSpacing: 1.2, fontFamily: '"IBM Plex Mono", monospace', lineHeight: 1.6 }}>
                    <div>IDW INTERPOLATION ENGINE v1.0.0</div>
                    <div>NOAA NWS · NCEI STORM EVENTS</div>
                  </div>
                </div>
                <IDWPanel
                  idwResult={idwResult}
                  dateOfLoss={dateOfLoss}
                  propertyAddress={normalized.location.address}
                />
                {/* Footer */}
                <div style={{ textAlign: "center", marginTop: 32, paddingTop: 16, borderTop: `1px solid ${theme.borderSoft}` }}>
                  <div style={{ color: theme.white, fontSize: 12 }}>©2026 Trinity Engineering, PLLC · All Rights Reserved</div>
                </div>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
