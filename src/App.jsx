import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  AlertTriangle,
  Zap,
  ArrowRight,
  Cpu,
} from "lucide-react";
import { storage } from "./lib/storage";

// ---------- constants ----------

const STATUS = {
  applied: { label: "Applied", color: "#E0A040" },
  interview: { label: "Interview", color: "#4FD1C5" },
  offer: { label: "Offer", color: "#4ADE80" },
  rejected: { label: "Rejected", color: "#EF4444" },
  ghosted: { label: "Ghosted", color: "#6B7280" },
};

const DAILY_TASKS = [
  { id: "handshake", label: "Check Handshake for new postings" },
  { id: "linkedin", label: "Scan LinkedIn / Simplify" },
  { id: "submit", label: "Submit today's applications" },
  { id: "alumni", label: "Find alumni contacts" },
  { id: "outreach", label: "Send outreach messages" },
  { id: "followup", label: "Follow up on pending threads" },
  { id: "build", label: "Build / learn something" },
  { id: "logTracker", label: "Log activity in tracker", synced: true },
];

const EMPTY_FORM = {
  company: "",
  role: "",
  dateApplied: "",
  contact: "",
  status: "applied",
  nextFollowUp: "",
  notes: "",
};

// ---------- helpers ----------

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function formatDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function daysFromToday(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86400000);
}

function isOverdue(app) {
  if (!app.nextFollowUp) return false;
  if (app.status === "offer" || app.status === "rejected") return false;
  const diff = daysFromToday(app.nextFollowUp);
  return diff !== null && diff <= 0;
}

function sortApplications(apps) {
  return [...apps].sort((a, b) => {
    const aOver = isOverdue(a);
    const bOver = isOverdue(b);
    if (aOver !== bOver) return aOver ? -1 : 1;
    if (aOver && bOver) {
      return (a.nextFollowUp || "").localeCompare(b.nextFollowUp || "");
    }
    return (b.dateApplied || "").localeCompare(a.dateApplied || "");
  });
}

function uid() {
  return `app_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ---------- component ----------

export default function App() {
  const [applications, setApplications] = useState([]);
  const [checklist, setChecklist] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [error, setError] = useState("");

  const formRef = useRef(null);
  const companyInputRef = useRef(null);
  const today = todayKey();

  // ---- load ----
  useEffect(() => {
    (async () => {
      try {
        const appsRes = await storage.get("applications");
        setApplications(appsRes ? JSON.parse(appsRes.value) : []);
      } catch (e) {
        setApplications([]);
      }
      try {
        const clRes = await storage.get(`checklist:${today}`);
        setChecklist(clRes ? JSON.parse(clRes.value) : {});
      } catch (e) {
        setChecklist({});
      }
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loggedToday = applications.filter((a) => {
    const stamp = (a.updatedAt || a.createdAt || "").slice(0, 10);
    return stamp === today;
  }).length;

  // ---- persistence ----
  const persistApplications = useCallback(async (list) => {
    setApplications(list);
    try {
      const res = await storage.set("applications", JSON.stringify(list));
      if (!res) setError("Couldn't save — storage didn't confirm the write.");
    } catch (e) {
      setError("Couldn't save applications. Try again.");
    }
  }, []);

  const persistChecklist = useCallback(
    async (next) => {
      setChecklist(next);
      try {
        const res = await storage.set(
          `checklist:${today}`,
          JSON.stringify(next)
        );
        if (!res) setError("Couldn't save checklist — storage didn't confirm.");
      } catch (e) {
        setError("Couldn't save checklist. Try again.");
      }
    },
    [today]
  );

  const syncLogTracker = useCallback(
    (currentChecklist) => {
      if (currentChecklist.logTracker) return;
      persistChecklist({ ...currentChecklist, logTracker: true });
    },
    [persistChecklist]
  );

  // ---- application CRUD ----
  function openAddForm() {
    setEditingId(null);
    setFormData({ ...EMPTY_FORM, dateApplied: today });
    setShowForm(true);
  }

  function openEditForm(app) {
    setEditingId(app.id);
    setFormData({
      company: app.company,
      role: app.role,
      dateApplied: app.dateApplied,
      contact: app.contact,
      status: app.status,
      nextFollowUp: app.nextFollowUp,
      notes: app.notes,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
  }

  function jumpToLogEntry() {
    setShowForm(true);
    setEditingId(null);
    setFormData({ ...EMPTY_FORM, dateApplied: today });
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      companyInputRef.current?.focus();
    }, 50);
  }

  async function submitForm(e) {
    e.preventDefault();
    if (!formData.company.trim() || !formData.role.trim()) {
      setError("Company and role are required.");
      return;
    }
    setError("");
    const nowIso = new Date().toISOString();
    let nextList;
    if (editingId) {
      nextList = applications.map((a) =>
        a.id === editingId ? { ...a, ...formData, updatedAt: nowIso } : a
      );
    } else {
      nextList = [
        ...applications,
        { id: uid(), ...formData, createdAt: nowIso, updatedAt: nowIso },
      ];
    }
    await persistApplications(nextList);
    syncLogTracker(checklist);
    closeForm();
  }

  async function deleteApplication(id) {
    const nextList = applications.filter((a) => a.id !== id);
    await persistApplications(nextList);
  }

  function toggleTask(id) {
    persistChecklist({ ...checklist, [id]: !checklist[id] });
  }

  const overdueApps = applications.filter(isOverdue);
  const sorted = sortApplications(applications);
  const doneCount = DAILY_TASKS.filter((t) => checklist[t.id]).length;

  if (!loaded) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingText}>Booting up the board…</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <Cpu size={26} color="#E0A040" strokeWidth={1.75} />
          <div>
            <h1 style={styles.title}>Application Board</h1>
            <p style={styles.subtitle}>internship search // job tracker</p>
          </div>
        </div>
        <div style={styles.headerStat}>
          <span style={styles.headerStatNum}>{applications.length}</span>
          <span style={styles.headerStatLabel}>total logged</span>
        </div>
      </header>

      {error && (
        <div style={styles.errorBanner}>
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            style={styles.errorDismiss}
            aria-label="Dismiss error"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {overdueApps.length > 0 && (
        <div style={styles.alertBanner}>
          <AlertTriangle size={18} color="#EF4444" style={{ flexShrink: 0 }} />
          <div>
            <div style={styles.alertTitle}>
              {overdueApps.length} follow-up{overdueApps.length > 1 ? "s" : ""} due
            </div>
            <div style={styles.alertList}>
              {overdueApps.map((a) => (
                <span key={a.id} style={styles.alertChip}>
                  {a.company} · {formatDate(a.nextFollowUp)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---- Today's Build Log ---- */}
      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <h2 style={styles.panelTitle}>Today's Build Log</h2>
          <span style={styles.progressText}>
            {doneCount} / {DAILY_TASKS.length}
          </span>
        </div>
        <div style={styles.progressTrack}>
          <div
            style={{
              ...styles.progressFill,
              width: `${(doneCount / DAILY_TASKS.length) * 100}%`,
            }}
          />
        </div>
        <ul style={styles.taskList}>
          {DAILY_TASKS.map((task) => {
            const done = !!checklist[task.id];
            return (
              <li key={task.id} style={styles.taskRow}>
                <button
                  onClick={() => toggleTask(task.id)}
                  style={{
                    ...styles.led,
                    background: done ? "#4ADE80" : "transparent",
                    borderColor: done ? "#4ADE80" : "#3A5A47",
                    boxShadow: done ? "0 0 8px 1px #4ADE80" : "none",
                  }}
                  aria-pressed={done}
                  aria-label={`Mark "${task.label}" ${done ? "not done" : "done"}`}
                >
                  {done && <Check size={12} color="#0D2818" strokeWidth={3} />}
                </button>
                <span
                  style={{
                    ...styles.taskLabel,
                    color: done ? "#8FA894" : "#E8E3D3",
                    textDecoration: done ? "line-through" : "none",
                  }}
                >
                  {task.label}
                </span>
                {task.synced && (
                  <button onClick={jumpToLogEntry} style={styles.syncLink}>
                    <Zap size={11} />
                    {loggedToday > 0
                      ? `synced · ${loggedToday} today`
                      : "log an entry"}
                    <ArrowRight size={11} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* ---- Tracker ---- */}
      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <h2 style={styles.panelTitle}>Applications</h2>
          <button onClick={openAddForm} style={styles.addButton}>
            <Plus size={15} />
            Add
          </button>
        </div>

        {showForm && (
          <form ref={formRef} onSubmit={submitForm} style={styles.form}>
            <div style={styles.formGrid}>
              <label style={styles.field}>
                <span style={styles.fieldLabel}>Company *</span>
                <input
                  ref={companyInputRef}
                  style={styles.input}
                  value={formData.company}
                  onChange={(e) =>
                    setFormData({ ...formData, company: e.target.value })
                  }
                />
              </label>
              <label style={styles.field}>
                <span style={styles.fieldLabel}>Role *</span>
                <input
                  style={styles.input}
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                />
              </label>
              <label style={styles.field}>
                <span style={styles.fieldLabel}>Date applied</span>
                <input
                  type="date"
                  style={styles.input}
                  value={formData.dateApplied}
                  onChange={(e) =>
                    setFormData({ ...formData, dateApplied: e.target.value })
                  }
                />
              </label>
              <label style={styles.field}>
                <span style={styles.fieldLabel}>Contact</span>
                <input
                  style={styles.input}
                  value={formData.contact}
                  onChange={(e) =>
                    setFormData({ ...formData, contact: e.target.value })
                  }
                />
              </label>
              <label style={styles.field}>
                <span style={styles.fieldLabel}>Status</span>
                <select
                  style={styles.input}
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                >
                  {Object.entries(STATUS).map(([key, s]) => (
                    <option key={key} value={key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label style={styles.field}>
                <span style={styles.fieldLabel}>Next follow-up</span>
                <input
                  type="date"
                  style={styles.input}
                  value={formData.nextFollowUp}
                  onChange={(e) =>
                    setFormData({ ...formData, nextFollowUp: e.target.value })
                  }
                />
              </label>
              <label style={{ ...styles.field, gridColumn: "1 / -1" }}>
                <span style={styles.fieldLabel}>Notes</span>
                <textarea
                  style={{ ...styles.input, minHeight: 60, resize: "vertical" }}
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                />
              </label>
            </div>
            <div style={styles.formActions}>
              <button type="submit" style={styles.saveButton}>
                {editingId ? "Save changes" : "Add application"}
              </button>
              <button type="button" onClick={closeForm} style={styles.cancelButton}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {sorted.length === 0 ? (
          <div style={styles.emptyState}>
            No applications logged yet. Add one to start the board.
          </div>
        ) : (
          <div style={styles.list}>
            {sorted.map((app) => {
              const over = isOverdue(app);
              const s = STATUS[app.status] || STATUS.applied;
              return (
                <div
                  key={app.id}
                  style={{
                    ...styles.card,
                    borderColor: over ? "#EF4444" : "#26402F",
                  }}
                >
                  <div style={styles.cardTop}>
                    <div style={styles.cardLeft}>
                      <span
                        style={{
                          ...styles.led,
                          background: s.color,
                          borderColor: s.color,
                          boxShadow: `0 0 6px 1px ${s.color}`,
                          cursor: "default",
                        }}
                      />
                      <div>
                        <div style={styles.cardCompany}>{app.company}</div>
                        <div style={styles.cardRole}>{app.role}</div>
                      </div>
                    </div>
                    <div style={styles.cardActions}>
                      <button
                        onClick={() => openEditForm(app)}
                        style={styles.iconButton}
                        aria-label="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => deleteApplication(app.id)}
                        style={styles.iconButton}
                        aria-label="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div style={styles.cardMeta}>
                    <span>Applied {formatDate(app.dateApplied)}</span>
                    {app.contact && <span>· {app.contact}</span>}
                    {app.nextFollowUp && (
                      <span style={{ color: over ? "#EF4444" : "#8FA894" }}>
                        · follow up {formatDate(app.nextFollowUp)}
                        {over ? " (overdue)" : ""}
                      </span>
                    )}
                  </div>
                  {app.notes && <div style={styles.cardNotes}>{app.notes}</div>}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

// ---------- styles ----------

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0d2428",
    color: "#E8E3D3",
    fontFamily: "'JetBrains Mono', monospace",
    padding: "20px",
    boxSizing: "border-box",
  },
  loadingText: {
    fontFamily: "'JetBrains Mono', monospace",
    color: "#8FA894",
    padding: "40px",
    textAlign: "center",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
    marginBottom: "18px",
    paddingBottom: "16px",
    borderBottom: "1px solid #26402F",
  },
  headerLeft: { display: "flex", alignItems: "center", gap: "10px" },
  title: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: "22px",
    fontWeight: 700,
    margin: 0,
    color: "#E8E3D3",
    letterSpacing: "0.3px",
  },
  subtitle: {
    margin: "2px 0 0",
    fontSize: "11px",
    color: "#C17817",
    letterSpacing: "0.5px",
  },
  headerStat: { textAlign: "right" },
  headerStatNum: {
    display: "block",
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: "20px",
    fontWeight: 700,
    color: "#E0A040",
  },
  headerStatLabel: { fontSize: "10px", color: "#8FA894" },
  errorBanner: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "rgba(239,68,68,0.12)",
    border: "1px solid #EF4444",
    borderRadius: "6px",
    padding: "8px 12px",
    fontSize: "12px",
    color: "#FCA5A5",
    marginBottom: "14px",
  },
  errorDismiss: {
    background: "none",
    border: "none",
    color: "#FCA5A5",
    cursor: "pointer",
    padding: 0,
  },
  alertBanner: {
    display: "flex",
    gap: "10px",
    background: "rgba(239,68,68,0.10)",
    border: "1px solid rgba(239,68,68,0.5)",
    borderRadius: "8px",
    padding: "12px 14px",
    marginBottom: "18px",
  },
  alertTitle: { fontSize: "13px", fontWeight: 600, color: "#FCA5A5" },
  alertList: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    marginTop: "6px",
  },
  alertChip: {
    fontSize: "11px",
    background: "rgba(239,68,68,0.15)",
    border: "1px solid rgba(239,68,68,0.4)",
    borderRadius: "4px",
    padding: "2px 7px",
    color: "#FCA5A5",
  },
  panel: {
    background: "#123322",
    border: "1px solid #26402F",
    borderRadius: "10px",
    padding: "16px",
    marginBottom: "18px",
    maxWidth: "860px",
    marginLeft: "auto",
    marginRight: "auto",
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
    flexWrap: "wrap",
    gap: "8px",
  },
  panelTitle: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: "15px",
    fontWeight: 600,
    margin: 0,
    color: "#E8E3D3",
  },
  progressText: { fontSize: "12px", color: "#C17817" },
  progressTrack: {
    height: "4px",
    background: "#0D2818",
    borderRadius: "2px",
    overflow: "hidden",
    marginBottom: "14px",
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg,#C17817,#E0A040)",
    transition: "width 0.3s ease",
  },
  taskList: { listStyle: "none", margin: 0, padding: 0 },
  taskRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "7px 0",
    borderBottom: "1px solid #1A3527",
    flexWrap: "wrap",
  },
  led: {
    width: "18px",
    height: "18px",
    minWidth: "18px",
    borderRadius: "50%",
    border: "1.5px solid #3A5A47",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
    transition: "all 0.15s ease",
  },
  taskLabel: { fontSize: "13px", flex: "1 1 160px" },
  syncLink: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    background: "none",
    border: "none",
    color: "#4FD1C5",
    fontSize: "10.5px",
    fontFamily: "'JetBrains Mono', monospace",
    cursor: "pointer",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  addButton: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    background: "#C17817",
    color: "#0D2818",
    border: "none",
    borderRadius: "6px",
    padding: "7px 12px",
    fontSize: "12px",
    fontWeight: 600,
    fontFamily: "'JetBrains Mono', monospace",
    cursor: "pointer",
  },
  form: {
    background: "#0D2818",
    border: "1px solid #26402F",
    borderRadius: "8px",
    padding: "14px",
    marginBottom: "14px",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "10px",
  },
  field: { display: "flex", flexDirection: "column", gap: "4px" },
  fieldLabel: { fontSize: "10px", color: "#8FA894", letterSpacing: "0.3px" },
  input: {
    background: "#123322",
    border: "1px solid #26402F",
    borderRadius: "5px",
    padding: "7px 8px",
    color: "#E8E3D3",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: "12.5px",
    outline: "none",
  },
  formActions: { display: "flex", gap: "8px", marginTop: "12px" },
  saveButton: {
    background: "#E0A040",
    color: "#0D2818",
    border: "none",
    borderRadius: "6px",
    padding: "8px 16px",
    fontSize: "12px",
    fontWeight: 600,
    fontFamily: "'JetBrains Mono', monospace",
    cursor: "pointer",
  },
  cancelButton: {
    background: "none",
    border: "1px solid #3A5A47",
    color: "#8FA894",
    borderRadius: "6px",
    padding: "8px 16px",
    fontSize: "12px",
    fontFamily: "'JetBrains Mono', monospace",
    cursor: "pointer",
  },
  emptyState: {
    textAlign: "center",
    color: "#8FA894",
    fontSize: "12.5px",
    padding: "24px 0",
  },
  list: { display: "flex", flexDirection: "column", gap: "8px" },
  card: {
    background: "#0D2818",
    border: "1px solid #26402F",
    borderRadius: "8px",
    padding: "12px 14px",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "8px",
  },
  cardLeft: { display: "flex", alignItems: "flex-start", gap: "10px" },
  cardCompany: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 600,
    fontSize: "14px",
    color: "#E8E3D3",
  },
  cardRole: { fontSize: "12px", color: "#8FA894", marginTop: "1px" },
  cardActions: { display: "flex", gap: "4px" },
  iconButton: {
    background: "none",
    border: "1px solid #26402F",
    borderRadius: "5px",
    color: "#8FA894",
    padding: "5px",
    cursor: "pointer",
    display: "flex",
  },
  cardMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    fontSize: "11px",
    color: "#8FA894",
    marginTop: "8px",
  },
  cardNotes: {
    fontSize: "11.5px",
    color: "#C9C4B4",
    marginTop: "8px",
    borderTop: "1px solid #1A3527",
    paddingTop: "8px",
  },
};
