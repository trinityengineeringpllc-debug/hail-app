import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, CalendarDays, X } from "lucide-react";

// ─── Dark theme tokens (matches App.jsx) ─────────────────────────────────────
const T = {
  bg:         "#03070f",
  panel:      "#050b14",
  surface:    "#070f1c",
  border:     "#17325f",
  borderSoft: "#102240",
  text:       "#eef3ff",
  muted:      "#7ea2df",
  muted2:     "#4d6797",
  blue:       "#76a8ff",
  blueBright: "#8db7ff",
  button:     "#5e86f0",
  white:      "#ffffff",
};

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function getDays(year, month, selectedDate) {
  const firstDay = new Date(year, month, 1);
  const start = new Date(firstDay);
  start.setDate(start.getDate() - firstDay.getDay());

  const today = new Date();
  const cells = [];

  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push({
      date: d,
      inMonth: d.getMonth() === month,
      isToday: d.toDateString() === today.toDateString(),
      isSelected: selectedDate
        ? d.toDateString() === selectedDate.toDateString()
        : false,
    });
  }
  return cells;
}

function toYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplay(ymd) {
  if (!ymd) return null;
  const [y, m, d] = ymd.split("-");
  return `${MONTHS[parseInt(m, 10) - 1]} ${parseInt(d, 10)}, ${y}`;
}

export default function DatePicker({ value, onChange, placeholder = "Date of Loss" }) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const [y, m] = value.split("-");
      return new Date(parseInt(y), parseInt(m) - 1, 1);
    }
    return new Date();
  });

  const containerRef = useRef(null);
  const selectedDate = value ? (() => { const [y,m,d] = value.split("-"); return new Date(parseInt(y), parseInt(m)-1, parseInt(d)); })() : null;

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const days = getDays(year, month, selectedDate);

  function handleSelect(date) {
    onChange(toYMD(date));
    setOpen(false);
  }

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1));
  }
  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1));
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {/* Trigger button */}
      <motion.button
        whileHover={{ borderColor: T.blue }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          background: "#01050b",
          border: `1px solid ${open ? T.blue : T.border}`,
          borderRadius: 8,
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          cursor: "pointer",
          transition: "border-color 0.2s",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <CalendarDays size={16} color={value ? T.blue : T.muted2} />
          <span
            style={{
              color: value ? T.blueBright : T.muted2,
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 14,
            }}
          >
            {value ? formatDisplay(value) : placeholder}
          </span>
        </div>
        {value && (
          <motion.span
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
            style={{ color: T.muted2, lineHeight: 0, cursor: "pointer" }}
          >
            <X size={14} />
          </motion.span>
        )}
      </motion.button>

      {/* Calendar dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              left: 0,
              zIndex: 9999,
              background: T.panel,
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              padding: 20,
              width: 300,
              boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(118,168,255,0.08)",
            }}
          >
            {/* Month nav */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <motion.button
                whileHover={{ scale: 1.15, color: T.blueBright }}
                whileTap={{ scale: 0.9 }}
                onClick={prevMonth}
                style={{
                  background: "transparent",
                  border: "none",
                  color: T.muted,
                  cursor: "pointer",
                  padding: 6,
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <ChevronLeft size={18} />
              </motion.button>

              <motion.div
                key={`${month}-${year}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  color: T.white,
                  fontWeight: 700,
                  fontSize: 15,
                  fontFamily: "Inter, Arial, sans-serif",
                }}
              >
                {MONTHS[month]} {year}
              </motion.div>

              <motion.button
                whileHover={{ scale: 1.15, color: T.blueBright }}
                whileTap={{ scale: 0.9 }}
                onClick={nextMonth}
                style={{
                  background: "transparent",
                  border: "none",
                  color: T.muted,
                  cursor: "pointer",
                  padding: 6,
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <ChevronRight size={18} />
              </motion.button>
            </div>

            {/* Day headers */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                marginBottom: 6,
              }}
            >
              {DAYS.map((d) => (
                <div
                  key={d}
                  style={{
                    textAlign: "center",
                    color: T.muted2,
                    fontSize: 10,
                    fontFamily: '"IBM Plex Mono", monospace',
                    letterSpacing: "0.05em",
                    padding: "4px 0",
                  }}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
              <AnimatePresence mode="wait">
                {days.map((day, i) => {
                  const isSelected = day.isSelected;
                  const isToday = day.isToday;
                  const inMonth = day.inMonth;

                  return (
                    <motion.button
                      key={day.date.toDateString()}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.004 }}
                      whileHover={{
                        scale: 1.12,
                        backgroundColor: isSelected ? "#5e86f0" : "rgba(118,168,255,0.15)",
                      }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => handleSelect(day.date)}
                      style={{
                        background: isSelected
                          ? T.button
                          : isToday
                          ? "rgba(118,168,255,0.15)"
                          : "transparent",
                        border: isToday && !isSelected
                          ? `1px solid rgba(118,168,255,0.4)`
                          : "1px solid transparent",
                        borderRadius: 6,
                        color: isSelected
                          ? T.white
                          : inMonth
                          ? isToday
                            ? T.blueBright
                            : T.text
                          : T.muted2,
                        cursor: "pointer",
                        fontFamily: '"IBM Plex Mono", monospace',
                        fontSize: 12,
                        padding: "7px 0",
                        textAlign: "center",
                        fontWeight: isSelected || isToday ? 700 : 400,
                        opacity: inMonth ? 1 : 0.35,
                      }}
                    >
                      {day.date.getDate()}
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Selected date display */}
            <AnimatePresence>
              {value && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  style={{
                    marginTop: 14,
                    paddingTop: 12,
                    borderTop: `1px solid ${T.borderSoft}`,
                    color: T.muted,
                    fontSize: 11,
                    fontFamily: '"IBM Plex Mono", monospace',
                    textAlign: "center",
                  }}
                >
                  <span style={{ color: T.muted2 }}>Selected · </span>
                  <span style={{ color: T.blueBright }}>{formatDisplay(value)}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
