"use client";

import { useEffect, useMemo, useState } from "react";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const LEGEND = [
  { key: "exam", color: "red", label: "Exams" },
  { key: "event", color: "blue", label: "Events" },
  { key: "sport", color: "green", label: "Sports" },
  { key: "holiday", color: "yellow", label: "Holidays" },
];

const TYPE_TO_COLOR = {
  exam: "red",
  event: "blue",
  sport: "green",
  hpl: "green",
  holiday: "yellow",
};

function toIso(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function parseIso(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const offset = first.getDay();
  const total = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let i = offset - 1; i >= 0; i--) {
    const date = new Date(year, month, -i);
    cells.push({ date, inMonth: false });
  }
  for (let d = 1; d <= total; d++) cells.push({ date: new Date(year, month, d), inMonth: true });
  while (cells.length % 7) {
    const last = cells[cells.length - 1].date;
    cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false });
  }
  return cells;
}

function uniqueItems(days) {
  const seen = new Set();
  const result = [];
  Object.values(days).forEach((day) => {
    (day.items || []).forEach((item) => {
      const key = [item.startDate, item.endDate, item.type, item.title, item.batches, item.details].join("|");
      if (!seen.has(key)) {
        seen.add(key);
        result.push(item);
      }
    });
  });
  return result;
}

function monthItems(days, year, month) {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  return uniqueItems(days).filter((item) => String(item.startDate).startsWith(prefix) || String(item.endDate).startsWith(prefix));
}

function formatDateRange(item) {
  const start = parseIso(item.startDate);
  const end = parseIso(item.endDate || item.startDate);
  const opts = { day: "2-digit", month: "short" };
  if (item.startDate === item.endDate) return start.toLocaleDateString("en-IN", opts);
  return `${start.toLocaleDateString("en-IN", opts)} – ${end.toLocaleDateString("en-IN", opts)}`;
}

function examLabel(item) {
  const title = String(item.title || "").trim();
  if (/cat[- ]?1/i.test(title)) return "CAT-1";
  if (/cat[- ]?2/i.test(title)) return "CAT-2";
  if (/fat|term end/i.test(title)) return "FAT";
  return title || "Exam";
}

function batchLabel(item) {
  return item.batches ? `Batch ${item.batches}` : "Batch information not specified";
}

function shortBatch(item) {
  if (!item.batches) return "";
  const raw = item.batches.replace(/\s+/g, " ").trim();
  if (raw.length <= 34) return `Batch ${raw}`;
  return `Batch ${raw.slice(0, 31)}…`;
}

function dateKeySort(a, b) {
  return String(a.startDate).localeCompare(String(b.startDate));
}

export default function Page() {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [days, setDays] = useState({});
  const [status, setStatus] = useState("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedIso, setSelectedIso] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/calendar", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.ok) {
          setDays(data.days || {});
          setStatus("ok");
        } else {
          setErrorMsg(data.error || "Something went wrong.");
          setStatus("error");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorMsg(err.message || "Could not reach the calendar.");
          setStatus("error");
        }
      });
    return () => { cancelled = true; };
  }, []);

  const grid = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor]);
  const items = useMemo(() => monthItems(days, cursor.year, cursor.month).sort(dateKeySort), [days, cursor]);
  const exams = items.filter((item) => String(item.type).toLowerCase() === "exam");
  const events = items.filter((item) => ["event"].includes(String(item.type).toLowerCase()));
  const selectedItems = selectedIso ? days[selectedIso]?.items || [] : [];
  const todayIso = toIso(today.getFullYear(), today.getMonth(), today.getDate());

  const goToMonth = (delta) => {
    setCursor((c) => {
      const next = c.month + delta;
      return { year: c.year + Math.floor(next / 12), month: ((next % 12) + 12) % 12 };
    });
    setSelectedIso(null);
  };

  return (
    <main className="site-shell">
      <header className="institution-header">
        <div className="institution identity-left">
          <div className="brand-logo-wrap"><img className="brand-logo hac-logo" src="/hac-logo.png" alt="Hostel Administrative Council logo" /></div>
          <div>
            <h1>Hostel Administrative Council</h1>
            <p></p>
          </div>
        </div>
        <div className="header-motto"><br /><strong></strong></div>
        <div className="institution identity-right">
          <div className="vit-copy">
            <h2>VIT Bhopal</h2>
            <p>Vellore Institute of Technology</p>
            <small>Bhopal</small>
          </div>

          <a
            href="/admin/login"
            className="brand-logo-wrap vit-logo-wrap vit-admin-button"
            aria-label="Open admin panel"
            title="Admin panel"
          >
            <img
              className="brand-logo vit-logo"
              src="/vit-bhopal-logo.png"
              alt="VIT Bhopal logo"
            />
          </a>
        </div>
      </header>

      <section className="calendar-heading">
        <div className="calendar-title-wrap">
          <div><h2>Hostel Calendar</h2><p></p></div>
        </div>
        <ul className="legend">
          {LEGEND.map((item) => <li key={item.key}><span className={`legend-dot dot-${item.color}`} />{item.label}</li>)}
        </ul>
        <div className="month-controls">
          <button onClick={() => goToMonth(-1)} aria-label="Previous month">‹</button>
          <div>{MONTH_NAMES[cursor.month]} {cursor.year}</div>
          <button onClick={() => goToMonth(1)} aria-label="Next month">›</button>
          <button className="today-btn" onClick={() => setCursor({ year: today.getFullYear(), month: today.getMonth() })}>Today</button>
        </div>
      </section>

      {status === "loading" && <p className="status">Loading calendar…</p>}
      {status === "error" && <p className="status status-error">Couldn’t load the calendar. {errorMsg}</p>}

      {status === "ok" && (
        <section className="dashboard-grid">
          <aside className="side-panel exams-panel">
            <div className="panel-heading"><div className="panel-icon exam-icon">▤</div><div><h3>Examinations</h3><p>Upcoming and this month&apos;s exams</p></div></div>
            <div className="side-list">
              {exams.length === 0 ? <div className="empty-state">No exams this month.</div> : exams.map((item, index) => (
                <button className="exam-card" key={`${item.startDate}-${index}`} onClick={() => setSelectedIso(item.startDate)}>
                  <div className="date-tile exam-date"><strong>{parseIso(item.startDate).getDate()}</strong><span>{parseIso(item.startDate).toLocaleDateString("en-IN", { month: "short" }).toUpperCase()}</span></div>
                  <div className="card-content"><strong>{examLabel(item)}</strong><span className="batch-text">{batchLabel(item)}</span><small>{formatDateRange(item)}</small></div>
                </button>
              ))}
            </div>
          </aside>

          <section className="calendar-panel">
            <div className="calendar-panel-head"><div><span></span><h3>{MONTH_NAMES[cursor.month]} {cursor.year}</h3></div><span className="month-count">{items.length} item{items.length === 1 ? "" : "s"}</span></div>
            <div className="weekday-row">{WEEKDAYS.map((day) => <div key={day}>{day}</div>)}</div>
            <div className="calendar-grid">
              {grid.map(({ date, inMonth }) => {
                const iso = toIso(date.getFullYear(), date.getMonth(), date.getDate());
                const info = days[iso];
                const isToday = iso === todayIso;
                const isSelected = iso === selectedIso;
                const colors = [...new Set((info?.items || []).map((item) => TYPE_TO_COLOR[String(item.type).toLowerCase()] || "blue"))];
                const exam = (info?.items || []).find((item) => String(item.type).toLowerCase() === "exam");
                return (
                  <button key={iso} className={["calendar-cell", !inMonth ? "out-month" : "", isToday ? "today-cell" : "", isSelected ? "selected-cell" : "", info ? `tone-${info.color}` : ""].join(" ")} onClick={() => info ? setSelectedIso(iso) : setSelectedIso(null)}>
                    <span className="day-number">{date.getDate()}</span>
                    {info && <>
                      <div className="cell-dots">{colors.slice(0, 4).map((color) => <span key={color} className={`dot-${color}`} />)}</div>
                      {exam ? <div className="cell-exam"><strong>{examLabel(exam)}</strong><span>{shortBatch(exam)}</span></div> : info.items[0] && <div className="cell-event">{info.items[0].title || info.items[0].type}</div>}
                    </>}
                  </button>
                );
              })}
            </div>
            {selectedIso && (
              <div className="selected-day">
                <div className="selected-head"><h4>{parseIso(selectedIso).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</h4><span>{selectedItems.length} item{selectedItems.length === 1 ? "" : "s"}</span></div>
                {selectedItems.map((item, i) => {
                  const type = String(item.type).toLowerCase();
                  return <div className={`selected-item selected-${TYPE_TO_COLOR[type] || "blue"}`} key={`${item.title}-${i}`}><span className="type-pill">{type === "exam"
                        ? "EXAM"
                        : type === "hpl"
                          ? "HPL"
                          : type === "event"
                            ? "EVENT"
                            : type === "sport"
                              ? "SPORT"
                              : type === "holiday"
                                ? "HOLIDAY"
                                : type.toUpperCase()}</span><div><strong>{type === "exam" ? examLabel(item) : item.title}</strong>{type === "exam" && item.batches && <span className="selected-batch">Batch {item.batches}</span>}{item.details && <small>{item.details}</small>}</div></div>;
                })}
              </div>
            )}
          </section>

          <aside className="side-panel events-panel">
            <div className="panel-heading">
              <div className="panel-icon event-icon">◈</div>
              <div>
                <h3>EVENTS</h3>
                <p>All hostel events this month</p>
              </div>
            </div>
            <div className="side-list">
              {events.length === 0 ? <div className="empty-state">No events this month.</div> : events.map((item, index) => (
                <button className="event-card" key={`${item.startDate}-${index}`} onClick={() => setSelectedIso(item.startDate)}>
                  <div className="date-tile event-date"><strong>{parseIso(item.startDate).getDate()}</strong><span>{parseIso(item.startDate).toLocaleDateString("en-IN", { month: "short" }).toUpperCase()}</span></div>
                  <div className="card-content"><strong>{item.title || "Event"}</strong><small>{item.details || formatDateRange(item)}</small></div>
                </button>
              ))}
            </div>
          </aside>
        </section>
      )}

      
    </main>
  );
}
