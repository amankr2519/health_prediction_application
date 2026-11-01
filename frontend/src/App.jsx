import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createPatient,
  deletePatient,
  generateRemarks,
  getPatients,
  updatePatient,
} from "./services/patients";
import "./App.css";

const emptyForm = {
  full_name: "",
  date_of_birth: "",
  email: "",
  glucose: "",
  haemoglobin: "",
  cholesterol: "",
};

function Icon({ name, size = 18 }) {
  const paths = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    pulse: (
      <>
        <path d="M3 12h4l3-8 4 16 3-8h4" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 11h18" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
    more: (
      <>
        <circle cx="5" cy="12" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
      </>
    ),
    close: (
      <>
        <path d="m18 6-12 12M6 6l12 12" />
      </>
    ),
    spark: (
      <>
        <path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2L12 3Z" />
        <path d="m19 14 1.1 2.9L23 18l-2.9 1.1L19 22l-1.1-2.9L15 18l2.9-1.1L19 14Z" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function initials(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function displayDate(value) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
}

function ageFromDate(value) {
  if (!value) return "—";
  const birth = new Date(`${value}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return "—";
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  )
    age -= 1;
  return age >= 0 ? `${age} yrs` : "—";
}

function friendlyError(error) {
  const detail = error?.detail;
  if (Array.isArray(detail)) return detail.map((item) => item.msg).join(" · ");
  return detail || error?.message || "Something went wrong. Please try again.";
}

function PatientModal({ patient, onClose, onSave }) {
  const [form, setForm] = useState(() =>
    patient
      ? {
          full_name: patient.full_name ?? "",
          date_of_birth: patient.date_of_birth ?? "",
          email: patient.email ?? "",
          glucose: patient.glucose ?? "",
          haemoglobin: patient.haemoglobin ?? "",
          cholesterol: patient.cholesterol ?? "",
        }
      : emptyForm,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        glucose: Number(form.glucose),
        haemoglobin: Number(form.haemoglobin),
        cholesterol: Number(form.cholesterol),
      };
      await onSave(payload);
      onClose();
    } catch (requestError) {
      setError(friendlyError(requestError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="patient-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="patient-modal-title"
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow">PATIENT RECORD</span>
            <h2 id="patient-modal-title">
              {patient ? "Edit patient" : "Add a patient"}
            </h2>
            <p>Enter the patient details and latest blood test values.</p>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <Icon name="close" />
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="form-grid">
            <label className="field full-field">
              <span>Full name</span>
              <input
                autoFocus
                name="full_name"
                value={form.full_name}
                onChange={updateField}
                placeholder="e.g. Robyn Pears"
                required
                maxLength="150"
              />
            </label>
            <label className="field">
              <span>
                Date of birth <small>DD/MM/YYYY</small>
              </span>
              <input
                type="text"
                name="date_of_birth"
                value={form.date_of_birth}
                onChange={updateField}
                placeholder="e.g. 28/01/1960"
                inputMode="numeric"
                autoComplete="bday"
                required
              />
            </label>
            <label className="field">
              <span>Email address</span>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={updateField}
                placeholder="name@example.com"
                required
              />
            </label>
            <div className="form-section-label full-field">
              Blood test values{" "}
              <span>Enter the values from the latest report</span>
            </div>
            <label className="field">
              <span>
                Glucose <small>mg/dL</small>
              </span>
              <input
                type="number"
                name="glucose"
                value={form.glucose}
                onChange={updateField}
                placeholder="e.g. 95"
                step="any"
                required
              />
            </label>
            <label className="field">
              <span>
                Haemoglobin <small>g/dL</small>
              </span>
              <input
                type="number"
                name="haemoglobin"
                value={form.haemoglobin}
                onChange={updateField}
                placeholder="e.g. 13.5"
                step="any"
                required
              />
            </label>
            <label className="field full-field">
              <span>
                Cholesterol <small>mg/dL</small>
              </span>
              <input
                type="number"
                name="cholesterol"
                value={form.cholesterol}
                onChange={updateField}
                placeholder="e.g. 180"
                step="any"
                required
              />
            </label>
          </div>
          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}
          <div className="modal-actions">
            <button
              className="button button-quiet"
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="button button-primary"
              type="submit"
              disabled={saving}
            >
              {saving ? "Saving…" : patient ? "Save changes" : "Add patient"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function PatientDetailModal({ patient, onClose, onEdit }) {
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="patient-modal detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="patient-detail-title"
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow">PATIENT PROFILE</span>
            <h2 id="patient-detail-title">Patient details</h2>
            <p>Record information and latest blood test values.</p>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="detail-person">
          <span className="patient-avatar">{initials(patient.full_name)}</span>
          <span>
            <strong>{patient.full_name}</strong>
            <small>{patient.email}</small>
          </span>
        </div>
        <div className="detail-grid">
          <div>
            <span>Date of birth</span>
            <strong>{displayDate(patient.date_of_birth)}</strong>
          </div>
          <div>
            <span>Age</span>
            <strong>{ageFromDate(patient.date_of_birth)}</strong>
          </div>
          <div>
            <span>Glucose</span>
            <strong>
              {patient.glucose} <small>mg/dL</small>
            </strong>
          </div>
          <div>
            <span>Haemoglobin</span>
            <strong>
              {patient.haemoglobin} <small>g/dL</small>
            </strong>
          </div>
          <div>
            <span>Cholesterol</span>
            <strong>
              {patient.cholesterol} <small>mg/dL</small>
            </strong>
          </div>
          <div>
            <span>Remarks status</span>
            <strong
              className={`detail-status detail-${patient.remarks_status || "pending"}`}
            >
              {patient.remarks_status || "pending"}
            </strong>
          </div>
        </div>
        <div className="detail-remarks">
          <span>
            <Icon name="spark" size={15} /> AI observation
          </span>
          <p>
            {patient.remarks ||
              "No observation has been generated for this record yet."}
          </p>
        </div>
        <div className="modal-actions">
          <button
            className="button button-quiet"
            type="button"
            onClick={onClose}
          >
            Close
          </button>
          <button
            className="button button-primary"
            type="button"
            onClick={onEdit}
          >
            Edit patient
          </button>
        </div>
      </section>
    </div>
  );
}

function App() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [search, setSearch] = useState("");
  const [modalPatient, setModalPatient] = useState(undefined);
  const [viewPatient, setViewPatient] = useState(null);
  const [toast, setToast] = useState("");
  const [busyId, setBusyId] = useState("");

  const refreshPatients = useCallback(async () => {
    setPageError("");
    try {
      setPatients(await getPatients());
    } catch (error) {
      setPageError(friendlyError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshPatients();
  }, [refreshPatients]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 3400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filteredPatients = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return patients;
    return patients.filter((patient) =>
      [patient.full_name, patient.email, patient.remarks]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term)),
    );
  }, [patients, search]);

  async function savePatient(payload) {
    if (modalPatient) await updatePatient(modalPatient.id, payload);
    else await createPatient(payload);
    await refreshPatients();
    setToast(
      modalPatient ? "Patient record updated" : "Patient added successfully",
    );
  }

  async function removePatient(patient) {
    if (
      !window.confirm(
        `Delete ${patient.full_name}'s patient record? This action cannot be undone.`,
      )
    )
      return;
    setBusyId(patient.id);
    try {
      await deletePatient(patient.id);
      await refreshPatients();
      setToast("Patient record deleted");
    } catch (error) {
      setToast(friendlyError(error));
    } finally {
      setBusyId("");
    }
  }

  async function retryRemarks(patient) {
    setBusyId(patient.id);
    try {
      await generateRemarks(patient.id);
      await refreshPatients();
      setToast("AI observation generated");
    } catch (error) {
      setToast(friendlyError(error));
    } finally {
      setBusyId("");
    }
  }

  const completedRemarks = patients.filter(
    (patient) => patient.remarks_status === "completed",
  ).length;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#dashboard" aria-label="Clarity Health home">
          <span className="brand-mark">
            <Icon name="pulse" size={21} />
          </span>
          <span className="brand-name">
            clarity<span>health</span>
          </span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <a className="nav-item active" href="#dashboard">
            <Icon name="grid" />
            <span>Overview</span>
          </a>
          <a className="nav-item" href="#patients">
            <Icon name="users" />
            <span>Patients</span>
            <span className="nav-count">{patients.length}</span>
          </a>
        </nav>
        <div className="sidebar-bottom">
          <div className="care-card">
            <span className="care-icon">
              <Icon name="spark" size={17} />
            </span>
            <strong>
              Thoughtful care,
              <br />
              clearer insights.
            </strong>
            <span>Keep every patient detail in one place.</span>
          </div>
          <div className="profile-row">
            <span className="profile-avatar">HC</span>
            <span className="profile-copy">
              <strong>Health team</strong>
              <small>Care workspace</small>
            </span>
            <span className="profile-dots">···</span>
          </div>
        </div>
      </aside>

      <main className="main-area" id="dashboard">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="crumb-slash">/</span>
            <strong>Overview</strong>
          </div>
          <div className="topbar-right">
            <span className="secure-label">
              <span className="secure-dot" /> Patient records
            </span>
            <span className="top-avatar">HC</span>
          </div>
        </header>

        <div className="page-content">
          <section className="welcome-row">
            <div>
              <div className="eyebrow">PATIENT MANAGEMENT</div>
              <h1>
                Your patients, <span>at a glance.</span>
              </h1>
              <p className="page-subtitle">
                A clear view of patient records and their latest health
                information.
              </p>
            </div>
            <button
              className="button button-primary add-button"
              onClick={() => setModalPatient(null)}
            >
              <Icon name="plus" size={18} /> Add patient
            </button>
          </section>

          <section className="stats-grid" aria-label="Patient summary">
            <article className="stat-card">
              <div className="stat-top">
                <span>Total patients</span>
                <span className="stat-icon lavender">
                  <Icon name="users" size={18} />
                </span>
              </div>
              <div className="stat-value">
                {loading ? "—" : patients.length}
              </div>
              <div className="stat-foot">Patient records in your workspace</div>
            </article>
            <article className="stat-card">
              <div className="stat-top">
                <span>AI observations</span>
                <span className="stat-icon mint">
                  <Icon name="spark" size={18} />
                </span>
              </div>
              <div className="stat-value">
                {loading ? "—" : completedRemarks}
              </div>
              <div className="stat-foot">
                Generated from patient test values
              </div>
            </article>
            <article className="stat-card stat-note">
              <div className="stat-top">
                <span>Health insights</span>
                <span className="stat-icon peach">
                  <Icon name="pulse" size={18} />
                </span>
              </div>
              <div className="note-copy">
                Lab values are best understood with the right clinical context.
              </div>
              <div className="stat-foot">
                AI observations are informational only
              </div>
            </article>
          </section>

          <section className="records-panel" id="patients">
            <div className="records-heading">
              <div>
                <div className="records-title-line">
                  <h2>Patient records</h2>
                  <span className="record-count">{patients.length}</span>
                </div>
                <p>
                  Manage patient details and review recent blood test values.
                </p>
              </div>
              <button
                className="button button-secondary"
                onClick={() => setModalPatient(null)}
              >
                <Icon name="plus" size={16} /> New patient
              </button>
            </div>
            <div className="table-toolbar">
              <label className="search-box">
                <Icon name="search" size={17} />
                <input
                  aria-label="Search patients"
                  placeholder="Search patients by name or email…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <kbd>⌘ K</kbd>
              </label>
              <span className="results-label">
                {filteredPatients.length}{" "}
                {filteredPatients.length === 1 ? "record" : "records"}
              </span>
            </div>
            {pageError && (
              <div className="error-banner" role="alert">
                <span>{pageError}</span>
                <button
                  className="button button-quiet"
                  onClick={refreshPatients}
                >
                  Try again
                </button>
              </div>
            )}
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Date of birth</th>
                    <th>Blood test values</th>
                    <th>AI observation</th>
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan="5">
                        <div className="table-state">
                          <span className="spinner" /> Loading patient records…
                        </div>
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    !pageError &&
                    filteredPatients.map((patient) => (
                      <tr key={patient.id}>
                        <td>
                          <div className="patient-cell">
                            <span className="patient-avatar">
                              {initials(patient.full_name)}
                            </span>
                            <span className="patient-copy">
                              <strong>{patient.full_name}</strong>
                              <span>{patient.email}</span>
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="date-cell">
                            <span>{displayDate(patient.date_of_birth)}</span>
                            <small>{ageFromDate(patient.date_of_birth)}</small>
                          </div>
                        </td>
                        <td>
                          <div className="lab-values">
                            <span>
                              <i className="value-dot glucose-dot" />
                              {patient.glucose}
                              <small>GLU</small>
                            </span>
                            <span>
                              <i className="value-dot haemo-dot" />
                              {patient.haemoglobin}
                              <small>HB</small>
                            </span>
                            <span>
                              <i className="value-dot cholesterol-dot" />
                              {patient.cholesterol}
                              <small>CHOL</small>
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="remark-cell">
                            {patient.remarks_status === "completed" &&
                            patient.remarks ? (
                              <>
                                <span className="status status-complete">
                                  <i /> Ready
                                </span>
                                <span
                                  className="remark-text"
                                  title={patient.remarks}
                                >
                                  {patient.remarks}
                                </span>
                              </>
                            ) : patient.remarks_status === "failed" ? (
                              <>
                                <span className="status status-failed">
                                  <i /> Could not generate
                                </span>
                                <button
                                  className="text-action"
                                  disabled={busyId === patient.id}
                                  onClick={() => retryRemarks(patient)}
                                >
                                  {busyId === patient.id
                                    ? "Retrying…"
                                    : "Retry"}
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="status status-pending">
                                  <i /> Pending
                                </span>
                                <button
                                  className="text-action"
                                  disabled={busyId === patient.id}
                                  onClick={() => retryRemarks(patient)}
                                >
                                  {busyId === patient.id
                                    ? "Generating…"
                                    : "Generate"}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              className="action-button"
                              onClick={() => setViewPatient(patient)}
                            >
                              View
                            </button>
                            <button
                              className="action-button"
                              onClick={() => setModalPatient(patient)}
                            >
                              Edit
                            </button>
                            <button
                              className="icon-button row-more"
                              aria-label={`Delete ${patient.full_name}`}
                              disabled={busyId === patient.id}
                              onClick={() => removePatient(patient)}
                            >
                              <Icon name="close" size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  {!loading && !pageError && filteredPatients.length === 0 && (
                    <tr>
                      <td colSpan="5">
                        <div className="empty-state">
                          <span className="empty-icon">
                            <Icon
                              name={search ? "search" : "users"}
                              size={21}
                            />
                          </span>
                          <strong>
                            {search
                              ? "No matching patients"
                              : "No patient records yet"}
                          </strong>
                          <span>
                            {search
                              ? "Try another name or email address."
                              : "Add your first patient to get started."}
                          </span>
                          {!search && (
                            <button
                              className="button button-primary"
                              onClick={() => setModalPatient(null)}
                            >
                              <Icon name="plus" size={16} /> Add patient
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="panel-footer">
              <span>
                Showing <strong>{filteredPatients.length}</strong> of{" "}
                <strong>{patients.length}</strong> patient records
              </span>
              <span className="footer-note">
                <span className="secure-dot" /> Data stored securely
              </span>
            </div>
          </section>
          <footer className="page-footer">
            <span>
              Clarity Health <span>·</span> Patient management
            </span>
            <span>
              AI observations are not a substitute for medical advice.
            </span>
          </footer>
        </div>
      </main>

      {modalPatient !== undefined && (
        <PatientModal
          patient={modalPatient}
          onClose={() => setModalPatient(undefined)}
          onSave={savePatient}
        />
      )}
      {viewPatient && (
        <PatientDetailModal
          patient={viewPatient}
          onClose={() => setViewPatient(null)}
          onEdit={() => {
            setViewPatient(null);
            setModalPatient(viewPatient);
          }}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;
