"use client";

import { useEffect, useMemo, useState } from "react";

const EMPTY_FORM = {
  startDate: "",
  endDate: "",
  type: "Exam",
  title: "",
  batches: "",
  details: "",
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const TYPE_COLORS = {
  exam: "red",
  event: "blue",
  sport: "green",
  hpl: "green",
  holiday: "yellow",
};

function parseDate(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  return new Date(y, m - 1, d);
}

function isoDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function buildMonthDays(year, month) {
  const first = new Date(year, month, 1);
  const offset = first.getDay();
  const total = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let i = offset - 1; i >= 0; i--) {
    const date = new Date(year, month, -i);
    cells.push({ date, inMonth: false });
  }

  for (let d = 1; d <= total; d++) {
    cells.push({
      date: new Date(year, month, d),
      inMonth: true,
    });
  }

  while (cells.length % 7) {
    const last = cells[cells.length - 1].date;
    cells.push({
      date: new Date(
        last.getFullYear(),
        last.getMonth(),
        last.getDate() + 1
      ),
      inMonth: false,
    });
  }

  return cells;
}

function getDatesInRange(start, end) {
  const dates = [];
  let cursor = parseDate(start);
  const last = parseDate(end || start);

  while (cursor <= last) {
    dates.push(isoDate(cursor));
    cursor = new Date(
      cursor.getFullYear(),
      cursor.getMonth(),
      cursor.getDate() + 1
    );
  }

  return dates;
}

export default function AdminDashboard() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [entries, setEntries] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loadState, setLoadState] = useState("loading");
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const now = new Date();

  const [cursor, setCursor] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  });

  const loadEntries = async () => {
    setLoadState("loading");

    try {
      const res = await fetch("/api/admin/entries", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Could not load entries.");
      }

      setEntries(data.entries || []);
      setLoadState("ok");
    } catch (err) {
      setLoadError(err.message || "Could not load entries.");
      setLoadState("error");
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const submit = async (e) => {
    e.preventDefault();

    setBusy(true);
    setError("");
    setMessage("");

    const endpoint =
      editing === null
        ? "/api/admin/add"
        : "/api/admin/update";

    const body =
      editing === null
        ? form
        : { index: editing, entry: form };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Could not save entry.");
      }

      setForm(EMPTY_FORM);
      setEditing(null);
      setMessage(
        editing === null
          ? "Entry added successfully."
          : "Entry updated successfully."
      );

      await loadEntries();
    } catch (err) {
      setError(err.message || "Could not save entry.");
    } finally {
      setBusy(false);
    }
  };

  const removeEntry = async (index, title) => {
    if (!confirm(`Delete "${title}"?`)) return;

    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/admin/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ index }),
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Could not delete entry.");
      }

      if (editing === index) {
        setEditing(null);
        setForm(EMPTY_FORM);
      }

      setMessage("Entry deleted successfully.");
      await loadEntries();
    } catch (err) {
      setError(err.message || "Could not delete entry.");
    }
  };

  const editEntry = (entry) => {
    setEditing(entry.index);

    setForm({
      startDate: entry.startDate,
      endDate: entry.endDate,
      type: entry.type,
      title: entry.title,
      batches: entry.batches || "",
      details: entry.details || "",
    });

    setMessage("");
    setError("");

    document
      .getElementById("add-entry")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  const upload = async (e) => {
    e.preventDefault();

    const file = e.currentTarget.file.files[0];

    if (!file) return;

    setUploading(true);
    setError("");
    setMessage("");

    try {
      const formData = new FormData();

      formData.append("file", file);
      formData.append("mode", e.currentTarget.mode.value);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!data.ok) {
        throw new Error(data.error || "Could not import file.");
      }

      e.currentTarget.reset();

      setMessage(
        `${data.imported} entries imported (${data.mode}). ${data.total} total entries.`
      );

      await loadEntries();
    } catch (err) {
      setError(err.message || "Could not import file.");
    } finally {
      setUploading(false);
    }
  };

  const logout = async () => {
    await fetch("/api/admin/logout", {
      method: "POST",
    });

    window.location.assign("/admin/login");
  };

  const monthCells = useMemo(
    () => buildMonthDays(cursor.year, cursor.month),
    [cursor]
  );

  const monthEntries = useMemo(() => {
    const prefix = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`;

    return entries.filter(
      (entry) =>
        String(entry.startDate).startsWith(prefix) ||
        String(entry.endDate || entry.startDate).startsWith(prefix)
    );
  }, [entries, cursor]);

  const monthMap = useMemo(() => {
    const map = {};
    const prefix = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`;

    const addDay = (date, entry = null, warning = false) => {
      if (!date.startsWith(prefix)) return;

      if (!map[date]) {
        map[date] = {
          entries: [],
          colors: new Set(),
        };
      }

      if (entry) {
        map[date].entries.push(entry);
      }

      if (warning) {
        map[date].colors.add("yellow");
      }
    };

    entries.forEach((entry) => {
      const type = String(entry.type || "").toLowerCase();
      const color =
        type === "exam"
          ? "red"
          : type === "event"
            ? "blue"
            : type === "sport" || type === "hpl"
              ? "green"
              : type === "holiday"
                ? "yellow"
                : "blue";

      getDatesInRange(
        entry.startDate,
        entry.endDate || entry.startDate
      ).forEach((date) => {
        addDay(date, entry);
        if (map[date]) {
          map[date].colors.add(color);
        }
      });

      // Same two-day exam warning used by the public calendar
      if (type === "exam") {
        const examDate = parseDate(entry.startDate);

        for (let n = 1; n <= 2; n++) {
          const warningDate = new Date(
            examDate.getFullYear(),
            examDate.getMonth(),
            examDate.getDate() - n
          );

          addDay(isoDate(warningDate), null, true);
        }
      }
    });

    Object.values(map).forEach((day) => {
      if (day.colors.has("red")) {
        day.color = "red";
      } else if (day.colors.has("yellow")) {
        day.color = "yellow";
      } else if (day.colors.has("blue")) {
        day.color = "blue";
      } else if (day.colors.has("green")) {
        day.color = "green";
      } else {
        day.color = null;
      }
    });

    return map;
  }, [entries, cursor]);

  const stats = useMemo(() => {
    const eventDays = new Set();
    const examDays = new Set();
    const sportHplDays = new Set();

    const displayedDates = Object.keys(monthMap).filter(
      (date) => /^\d{4}-\d{2}-\d{2}$/.test(date)
    );

    const monthPrefix = displayedDates.length
      ? displayedDates
          .sort()
          .find((date) => date.startsWith(
            displayedDates[0].slice(0, 7)
          ))
          ?.slice(0, 7)
      : null;

    if (!monthPrefix) {
      return {
        events: 0,
        exams: 0,
        sports: 0,
        days: 0,
      };
    }

    const [currentYear, currentMonthNumber] = monthPrefix
      .split("-")
      .map(Number);

    const currentMonth = currentMonthNumber - 1;

    entries.forEach((entry) => {
      if (!entry.startDate || !entry.endDate) return;

      const type = String(entry.type || "").trim().toLowerCase();

      getDatesInRange(entry.startDate, entry.endDate).forEach((date) => {
        if (!date.startsWith(monthPrefix)) return;

        if (type === "event") {
          eventDays.add(date);
        }

        if (type === "exam") {
          examDays.add(date);
        }

        if (type === "sport" || type === "sports" || type === "hpl") {
          sportHplDays.add(date);
        }
      });
    });

    /*
     * Two days immediately before an exam are restricted
     * for normal hostel activities.
     */
    const examRestrictionDays = new Set();

    examDays.forEach((date) => {
      const examDate = new Date(`${date}T00:00:00`);

      for (let i = 1; i <= 2; i++) {
        const restrictedDate = new Date(examDate);
        restrictedDate.setDate(restrictedDate.getDate() - i);

        const restrictedIso = isoDate(restrictedDate);

        if (restrictedIso.startsWith(monthPrefix)) {
          examRestrictionDays.add(restrictedIso);
        }
      }
    });

    const daysInMonth = new Date(
      currentYear,
      currentMonth + 1,
      0
    ).getDate();

    const unavailableDays = new Set([
      ...examDays,
      ...examRestrictionDays,
    ]);

    const availableActivityDays = Math.max(
      0,
      daysInMonth - unavailableDays.size
    );

    return {
      events: eventDays.size,
      exams: examDays.size,
      sports: sportHplDays.size,
      days: availableActivityDays,
    };
  }, [entries, cursor]);

  const upcoming = useMemo(() => {
    const today = isoDate(new Date());

    return [...entries]
      .filter((entry) => String(entry.endDate || entry.startDate) >= today)
      .sort((a, b) =>
        String(a.startDate).localeCompare(String(b.startDate))
      )
      .slice(0, 6);
  }, [entries]);

  const changeMonth = (delta) => {
    setCursor((current) => {
      const date = new Date(
        current.year,
        current.month + delta,
        1
      );

      return {
        year: date.getFullYear(),
        month: date.getMonth(),
      };
    });
  };

  const scrollTo = (id) => {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="admin-dashboard">

      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-mark">
            <img
              src="/hac-logo.png"
              alt="HAC"
            />
          </div>
          <div>
            <strong>HAC Admin</strong>
            <span>Hostel Calendar</span>
          </div>
        </div>

        <nav className="admin-nav">
          <button onClick={() => scrollTo("dashboard")}>
            <span>▦</span> Dashboard
          </button>

          <button onClick={() => scrollTo("calendar-overview")}>
            <span>▣</span> Calendar
          </button>

          <button onClick={() => scrollTo("add-entry")}>
            <span>＋</span> Add Event
          </button>

          <button onClick={() => scrollTo("upload-data")}>
            <span>↑</span> Upload
          </button>

          <a href="/api/admin/export">
            <span>↓</span> Export
          </a>

          <button onClick={() => scrollTo("data-table")}>
            <span>☷</span> Data
          </button>
        </nav>

        <div className="admin-sidebar-bottom">
          <button onClick={logout}>
            <span>↪</span> Sign out
          </button>
        </div>
      </aside>

      <section className="admin-main">

        <header className="admin-topbar">
          <div>
            <h1>HAC Admin</h1>
            <p>Hostel Calendar management dashboard</p>
          </div>

          <div className="admin-online">
            <span />
            Online
          </div>
        </header>

        <div id="dashboard" className="admin-content">

          <div className="admin-page-heading">
            <div>
              <h2>Calendar Overview</h2>
              <p>Manage hostel events, examinations and activities.</p>
            </div>

            <button
              className="admin-primary"
              onClick={() => scrollTo("add-entry")}
            >
              + Add Event
            </button>
          </div>

          <div className="admin-stats">

            <div className="stat-card">
              <div className="stat-number">{stats.events}</div>
              <div className="stat-label">Event Days</div>
              <div className="stat-icon stat-blue">◆</div>
            </div>

            <div className="stat-card">
              <div className="stat-number">{stats.exams}</div>
              <div className="stat-label">Exam Days</div>
              <div className="stat-icon stat-red">▤</div>
            </div>

            <div className="stat-card">
              <div className="stat-number">{stats.sports}</div>
              <div className="stat-label">Sports / HPL Days</div>
              <div className="stat-icon stat-green">●</div>
            </div>

            <div className="stat-card">
              <div className="stat-number">{stats.days}</div>
              <div className="stat-label">Available Activity Days</div>
              <div className="stat-icon stat-yellow">◆</div>
            </div>

          </div>

          <section
            id="calendar-overview"
            className="admin-section calendar-admin-section"
          >
            <div className="admin-section-header">
              <div>
                <h3>Calendar</h3>
                <p>
                  {MONTHS[cursor.month]} {cursor.year}
                </p>
              </div>

              <div className="admin-month-controls">
                <button onClick={() => changeMonth(-1)}>‹</button>

                <strong>
                  {MONTHS[cursor.month]} {cursor.year}
                </strong>

                <button onClick={() => changeMonth(1)}>›</button>

                <button
                  className="today-admin-btn"
                  onClick={() =>
                    setCursor({
                      year: now.getFullYear(),
                      month: now.getMonth(),
                    })
                  }
                >
                  Today
                </button>
              </div>
            </div>

            <div className="admin-weekdays">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                (day) => (
                  <div key={day}>{day}</div>
                )
              )}
            </div>

            <div className="admin-calendar-grid">
              {monthCells.map(({ date, inMonth }) => {
                const iso = isoDate(date);
                const dayEntries = monthMap[iso]?.entries || [];

                return (
                  <div
                    key={iso}
                    className={`admin-calendar-day ${
                      !inMonth ? "admin-out-month" : ""
                    } ${
                      monthMap[iso]?.color
                        ? `admin-tone-${monthMap[iso].color}`
                        : ""
                    }`}
                  >
                    <span className="admin-day-number">
                      {date.getDate()}
                    </span>

                    <div className="admin-day-items">
                      {dayEntries.slice(0, 2).map((entry, index) => {
                        const type = String(entry.type).toLowerCase();

                        return (
                          <div
                            key={`${entry.title}-${index}`}
                            className={`admin-mini-event admin-${TYPE_COLORS[type] || "blue"}`}
                            title={entry.title}
                          >
                            <span />
                            {entry.title || type.toUpperCase()}
                          </div>
                        );
                      })}

                      {dayEntries.length > 2 && (
                        <small>+{dayEntries.length - 2} more</small>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="admin-two-column">

            <div className="admin-section">
              <div className="admin-section-header">
                <div>
                  <h3>Recent / Upcoming</h3>
                  <p>Next scheduled calendar entries</p>
                </div>
              </div>

              <div className="upcoming-list">
                {upcoming.length === 0 ? (
                  <div className="admin-empty">
                    No upcoming entries.
                  </div>
                ) : (
                  upcoming.map((entry, index) => {
                    const type = String(entry.type).toLowerCase();

                    return (
                      <div className="upcoming-item" key={`${entry.index}-${index}`}>
                        <div
                          className={`upcoming-dot admin-${TYPE_COLORS[type] || "blue"}`}
                        />

                        <div className="upcoming-main">
                          <strong>{entry.title || type.toUpperCase()}</strong>
                          <span>
                            {entry.startDate}
                            {entry.endDate &&
                            entry.endDate !== entry.startDate
                              ? ` → ${entry.endDate}`
                              : ""}
                          </span>
                        </div>

                        <span className="upcoming-type">
                          {type === "hpl"
                            ? "HPL"
                            : type.toUpperCase()}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="admin-section admin-quick-actions">
              <div className="admin-section-header">
                <div>
                  <h3>Quick Actions</h3>
                  <p>Manage calendar data</p>
                </div>
              </div>

              <button onClick={() => scrollTo("add-entry")}>
                <strong>＋</strong>
                <span>
                  <b>Add Event</b>
                  <small>Create a new calendar entry</small>
                </span>
              </button>

              <button onClick={() => scrollTo("upload-data")}>
                <strong>↑</strong>
                <span>
                  <b>Upload Data</b>
                  <small>Import CSV or JSON</small>
                </span>
              </button>

              <a href="/api/admin/export">
                <strong>↓</strong>
                <span>
                  <b>Export Data</b>
                  <small>Download current CSV</small>
                </span>
              </a>
            </div>

          </section>

          {message && (
            <div className="admin-alert success">
              {message}
            </div>
          )}

          {error && (
            <div className="admin-alert error">
              {error}
            </div>
          )}

          <section
            id="add-entry"
            className="admin-section"
          >
            <div className="admin-section-header">
              <div>
                <h3>
                  {editing === null
                    ? "Add Event"
                    : "Edit Event"}
                </h3>
                <p>
                  Create or modify a calendar entry.
                </p>
              </div>

              {editing !== null && (
                <button
                  className="admin-secondary"
                  onClick={() => {
                    setEditing(null);
                    setForm(EMPTY_FORM);
                  }}
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <form
              className="new-admin-form"
              onSubmit={submit}
            >
              <div className="admin-field">
                <label>Start Date</label>
                <input
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      startDate: e.target.value,
                      endDate:
                        form.endDate || e.target.value,
                    })
                  }
                />
              </div>

              <div className="admin-field">
                <label>End Date</label>
                <input
                  type="date"
                  required
                  value={form.endDate}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      endDate: e.target.value,
                    })
                  }
                />
              </div>

              <div className="admin-field">
                <label>Type</label>
                <input
                  list="admin-type-options"
                  required
                  value={form.type}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      type: e.target.value,
                    })
                  }
                />

                <datalist id="admin-type-options">
                  <option value="Exam" />
                  <option value="Event" />
                  <option value="Sport" />
                  <option value="HPL" />
                  <option value="Holiday" />
                </datalist>
              </div>

              <div className="admin-field">
                <label>Batches / Years</label>
                <input
                  type="text"
                  placeholder="e.g. 2026, 2025"
                  value={form.batches}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      batches: e.target.value,
                    })
                  }
                />
              </div>

              <div className="admin-field admin-field-wide">
                <label>Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DBMS CAT-1"
                  value={form.title}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      title: e.target.value.toUpperCase(),
                    })
                  }
                />
              </div>

              <div className="admin-field admin-field-wide">
                <label>Details</label>
                <textarea
                  rows="3"
                  placeholder="Venue, timing, additional information..."
                  value={form.details}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      details: e.target.value,
                    })
                  }
                />
              </div>

              <button
                className="admin-primary"
                type="submit"
                disabled={busy}
              >
                {busy
                  ? "Saving..."
                  : editing === null
                    ? "Add to Calendar"
                    : "Save Changes"}
              </button>
            </form>
          </section>

          <section
            id="upload-data"
            className="admin-section"
          >
            <div className="admin-section-header">
              <div>
                <h3>Upload Calendar Data</h3>
                <p>
                  Import CSV or JSON data.
                </p>
              </div>

              <a
                className="admin-secondary"
                href="/api/admin/export"
              >
                Export Current CSV
              </a>
            </div>

            <form
              className="admin-upload-form"
              onSubmit={upload}
            >
              <input
                name="file"
                type="file"
                accept=".csv,.json,text/csv,application/json"
                required
              />

              <select
                name="mode"
                defaultValue="replace"
              >
                <option value="replace">
                  Replace all calendar data
                </option>

                <option value="append">
                  Append to existing data
                </option>
              </select>

              <button
                className="admin-primary"
                type="submit"
                disabled={uploading}
              >
                {uploading
                  ? "Importing..."
                  : "Import File"}
              </button>
            </form>

            <p className="admin-hint">
              CSV columns: Start Date, End Date, Type,
              Title, Batches / Years, Details
            </p>
          </section>

          <section
            id="data-table"
            className="admin-section"
          >
            <div className="admin-section-header">
              <div>
                <h3>Calendar Data</h3>
                <p>
                  {entries.length} total entries
                </p>
              </div>

              <button
                className="admin-secondary"
                onClick={loadEntries}
              >
                Refresh
              </button>
            </div>

            {loadState === "loading" && (
              <div className="admin-empty">
                Loading calendar data...
              </div>
            )}

            {loadState === "error" && (
              <div className="admin-alert error">
                {loadError}
              </div>
            )}

            {loadState === "ok" &&
              entries.length === 0 && (
                <div className="admin-empty">
                  No entries.
                </div>
              )}

            {loadState === "ok" &&
              entries.length > 0 && (
                <div className="admin-table-wrap">
                  <table className="admin-data-table">
                    <thead>
                      <tr>
                        <th>Dates</th>
                        <th>Type</th>
                        <th>Title</th>
                        <th>Batches / Years</th>
                        <th>Details</th>
                        <th>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {entries.map((entry) => (
                        <tr key={entry.index}>
                          <td>
                            {entry.startDate ===
                            entry.endDate
                              ? entry.startDate
                              : `${entry.startDate} → ${entry.endDate}`}
                          </td>

                          <td>
                            <span
                              className={`admin-type-badge admin-${
                                TYPE_COLORS[
                                  String(
                                    entry.type
                                  ).toLowerCase()
                                ] || "blue"
                              }`}
                            >
                              {String(entry.type).toLowerCase() ===
                              "hpl"
                                ? "HPL"
                                : String(
                                    entry.type
                                  ).toUpperCase()}
                            </span>
                          </td>

                          <td>
                            <strong>
                              {entry.title}
                            </strong>
                          </td>

                          <td>
                            {entry.batches || "—"}
                          </td>

                          <td>
                            {entry.details || "—"}
                          </td>

                          <td className="admin-actions">
                            <button
                              onClick={() =>
                                editEntry(entry)
                              }
                            >
                              Edit
                            </button>

                            <button
                              className="delete-action"
                              onClick={() =>
                                removeEntry(
                                  entry.index,
                                  entry.title
                                )
                              }
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
          </section>

        </div>
      </section>
    </main>
  );
}
