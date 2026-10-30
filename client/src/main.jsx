import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const tokenKey = "greenloop-token";
const adminPageLinks = [
  ["admin-overview", "Overview"],
  ["admin-calendar", "Calendar"],
  ["admin-schedules", "Collections"],
  ["admin-requests", "Request"],
  ["admin-residents", "Residents"]
];
const residentPageLinks = [
  ["resident-calendar", "Calendar"],
  ["resident-requests", "Request"],
  ["resident-mailbox", "Mailbox"]
];
const superadminPageLinks = [
  ["overview", "Overview"],
  ["configure", "Configure"],
  ["accounts", "Accounts"],
  ["collections", "Collections"],
  ["requests", "Request"]
];

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function manilaDateKey(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Manila"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function dateKeyDate(dateKey) {
  const [year, month, day] = dateKey.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatArrivalTime(time) {
  if (!time) return "Not provided";
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

async function api(path, options = {}, token = localStorage.getItem(tokenKey)) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "The request could not be completed.");
  return body;
}

function Brand() {
  return <a className="brand" href="/" aria-label="GreenLoop home"><span className="brand-mark">G</span> greenloop</a>;
}

function Footer() {
  return <footer><Brand /><span>Small steps. Cleaner streets.</span></footer>;
}

function Notice({ notice }) {
  if (!notice) return null;
  return <div className={`notice ${notice.isError ? "notice-error" : "notice-success"}`} role="status">{notice.message}</div>;
}

function Landing({ onAuthenticated, onPasswordChangeRequired, onCancelPasswordChange, passwordChange, initialNotice = null }) {
  const [fields, setFields] = useState({ email: "", password: "" });
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [focusedField, setFocusedField] = useState(null);
  const [notice, setNotice] = useState(initialNotice ? { message: initialNotice, isError: true } : null);
  const [submitting, setSubmitting] = useState(false);

  async function submitAuth(event) {
    event.preventDefault();
    setSubmitting(true);
    setNotice(null);
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify(data)
      }, null);
      if (result.passwordChangeRequired) {
        onPasswordChangeRequired(result.passwordChangeToken, result.user);
        return;
      }
      localStorage.setItem(tokenKey, result.token);
      onAuthenticated(result.user, result.token);
    } catch (error) {
      
      setNotice({ message: error.message, isError: true });
    } finally {
      setSubmitting(false);
    }
  }

  async function submitPasswordChange(event) {
    event.preventDefault();
    setNotice(null);
    if (newPassword !== confirmPassword) {
      setNotice({ message: "The passwords do not match.", isError: true });
      return;
    }
    setSubmitting(true);
    try {
      const result = await api("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ newPassword })
      }, passwordChange.token);
      localStorage.setItem(tokenKey, result.token);
      onAuthenticated(result.user, result.token);
    } catch (error) {
      setNotice({ message: error.message, isError: true });
    } finally {
      setSubmitting(false);
    }
  }

  function updateField(event) {
    const { name, value } = event.target;
    setFields((current) => ({ ...current, [name]: value }));
  }

  if (passwordChange) {
    return (
      <main className="auth-shell">
        <header className="auth-header">
          <Brand />
          <span className="auth-header-note">COMMUNITY WASTE COLLECTION</span>
        </header>
        <section className="auth-layout password-change-layout">
          <div className="auth-welcome">
            <div className="eyebrow"><span className="eyebrow-dot"></span> ONE MORE STEP</div>
            <h1>Secure your<br /><span>account.</span></h1>
            <p>Hi {passwordChange.user.name.split(" ")[0]}, set a new password before continuing to your dashboard.</p>
          </div>
          <div className="auth-card">
            <div className="auth-card-heading">
              <div className="eyebrow">FIRST SIGN-IN</div>
              <h2>Create your password</h2>
              <p>Choose a password with at least 8 characters. Do not reuse the temporary password.</p>
            </div>
            <Notice notice={notice} />
            <form className="form-grid" onSubmit={submitPasswordChange} autoComplete="off">
              <label>New password<input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength="8" maxLength="72" /></label>
              <label>Confirm new password<input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength="8" maxLength="72" /></label>
              <button className="button button-dark button-full" type="submit" disabled={submitting}>{submitting ? "Updating..." : "Set password and continue"} <span aria-hidden="true">↗</span></button>
              <button className="button button-outline" type="button" onClick={onCancelPasswordChange}>Back to login</button>
            </form>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <header className="auth-header">
        <Brand />
        <span className="auth-header-note">COMMUNITY WASTE COLLECTION</span>
      </header>
      <section className="auth-layout">
        <div className="auth-welcome">
          <div className="eyebrow"><span className="eyebrow-dot"></span> A CLEANER COMMUNITY STARTS HERE</div>
          <h1>Your community,<br />all <span>in the loop.</span></h1>
          <p>Stay up to date with collection schedules, neighborhood news, and the support your community provides.</p>
          <div className="auth-highlight">
            <span className="auth-highlight-icon" aria-hidden="true">↻</span>
            <div><strong>Good things are growing.</strong><span>Let's keep your neighborhood moving forward.</span></div>
          </div>
        </div>
        <div className="auth-card">
          <div className="auth-card-heading">
            <div className="eyebrow">WELCOME BACK</div>
            <h2>Sign in to GreenLoop</h2>
            <p>Enter your details to continue to your account.</p>
          </div>
          <Notice notice={notice} />
          <form className="form-grid" onSubmit={submitAuth} autoComplete="off">
            <label>Email address<input name="email" type="email" autoComplete="off" value={fields.email} onChange={updateField} readOnly={focusedField !== "email"} onFocus={() => setFocusedField("email")} required /></label>
            <label>Password<input name="password" type="password" autoComplete="current-password" value={fields.password} onChange={updateField} readOnly={focusedField !== "password"} onFocus={() => setFocusedField("password")} required minLength="8" /></label>
            <button className="button button-dark button-full" type="submit" disabled={submitting}>{submitting ? "Please wait..." : "Login"} <span aria-hidden="true">↗</span></button>
          </form>
        </div>
      </section>
      <Footer />
    </main>
  );
}

function ScheduleCard({ schedule, onDelete, showResidency = false }) {
  const date = dateKeyDate(schedule.date);
  return (
    <article className="schedule-card">
      <div className="date-block"><strong>{date.toLocaleDateString(undefined, { day: "2-digit" })}</strong><span>{date.toLocaleDateString(undefined, { month: "short" })}</span></div>
      <div className="schedule-info">
        <span className="status-pill">{schedule.wasteType}</span>
        <h3>{schedule.area}</h3>
        <p>{date.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
        {showResidency && schedule.residencyId?.name && <p>Residency: {schedule.residencyId.name}</p>}
        {schedule.notes && <p>{showResidency ? "Notes: " : ""}{schedule.notes}</p>}
        <p>Estimated arrival: {formatArrivalTime(schedule.estimatedArrivalTime)}</p>
        {onDelete && <button className="button button-small button-delete" type="button" onClick={() => onDelete(schedule._id, schedule.area)}>Delete collection</button>}
      </div>
    </article>
  );
}

function CollectionHistoryDialog({ open, onClose, month, onMonthChange, schedules, loading, scopeLabel }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  function moveMonth(offset) {
    const [year, monthNumber] = month.split("-").map(Number);
    const nextMonth = new Date(year, monthNumber - 1 + offset, 1);
    onMonthChange(`${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`);
  }

  const [year, monthNumber] = month.split("-").map(Number);
  const monthDate = new Date(year, monthNumber - 1, 1);

  return (
    <dialog
      ref={dialogRef}
      className="collection-history-dialog"
      aria-labelledby="collection-history-title"
      onClose={onClose}
    >
      <div className="collection-history-heading">
        <div>
          <div className="eyebrow">COLLECTION ARCHIVE</div>
          <h2 id="collection-history-title">Collection history</h2>
          <p className="collection-history-scope">{scopeLabel}</p>
        </div>
        <button className="request-dialog-close" type="button" aria-label="Close history" onClick={onClose}>×</button>
      </div>
      <div className="collection-history-controls">
        <button type="button" className="calendar-month-button" aria-label="Previous month" onClick={() => moveMonth(-1)}>‹</button>
        <h3>{monthDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h3>
        <button type="button" className="calendar-month-button" aria-label="Next month" onClick={() => moveMonth(1)}>›</button>
        <span className="count-badge">{schedules.length}</span>
      </div>
      <div className="collection-history-list" aria-live="polite">
        {loading ? <div className="empty-state"><p>Loading collection history...</p></div> : schedules.length ? schedules.map((schedule) => (
          <ScheduleCard key={schedule._id} schedule={schedule} showResidency />
        )) : <div className="empty-state"><span>▦</span><p>No collection schedules were published this month.</p></div>}
      </div>
    </dialog>
  );
}

function ResidentCalendar({ schedules, requests }) {
  const today = new Date();
  const [todayKey, setTodayKey] = useState(() => manilaDateKey(new Date()));
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(localDateKey(today));
  const eventsByDate = new Map();
  useEffect(() => {
    const interval = window.setInterval(() => setTodayKey(manilaDateKey(new Date())), 30_000);
    return () => window.clearInterval(interval);
  }, []);
  schedules.forEach((schedule) => {
    const dateKey = schedule.date.slice(0, 10);
    if (dateKey < todayKey) return;
    eventsByDate.set(dateKey, [...(eventsByDate.get(dateKey) || []), { type: "collection", schedule }]);
  });
  requests.forEach((request) => {
    if (request.status !== "approved" || !request.scheduledDate) return;
    const dateKey = request.scheduledDate.slice(0, 10);
    eventsByDate.set(dateKey, [...(eventsByDate.get(dateKey) || []), { type: "request", request }]);
  });
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const days = Array.from({ length: 42 }, (_, index) =>
    new Date(month.getFullYear(), month.getMonth(), index - firstDay.getDay() + 1)
  );
  const dayEvents = eventsByDate.get(selectedDate) || [];
  function moveMonth(offset) {
    const nextMonth = new Date(month.getFullYear(), month.getMonth() + offset, 1);
    setMonth(nextMonth);
    setSelectedDate(localDateKey(nextMonth));
  }

  return (
    <section className="panel resident-calendar" aria-label="Collection calendar">
      <div className="panel-heading">
        <div><div className="eyebrow">COLLECTION CALENDAR</div><h2>{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2></div>
        <div className="calendar-controls">
          <button type="button" className="calendar-month-button" aria-label="Previous month" onClick={() => moveMonth(-1)}>‹</button>
          <button type="button" className="calendar-month-button" aria-label="Next month" onClick={() => moveMonth(1)}>›</button>
        </div>
      </div>
      <div className="calendar-grid" role="grid" aria-label={month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((weekday) => <span className="calendar-weekday" role="columnheader" key={weekday}>{weekday}</span>)}
        {days.map((date) => {
          const dateKey = localDateKey(date);
          const events = eventsByDate.get(dateKey) || [];
          const inMonth = date.getMonth() === month.getMonth();
          return (
            <button
              type="button"
              role="gridcell"
              key={dateKey}
              className={`calendar-day${inMonth ? "" : " outside-month"}${selectedDate === dateKey ? " selected" : ""}${events.length ? " has-events" : ""}`}
              aria-label={`${date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}${events.length ? `, ${events.filter((event) => event.type === "collection").length} collection schedule(s), ${events.filter((event) => event.type === "request").length} approved request(s)` : ", no scheduled items"}`}
              aria-pressed={selectedDate === dateKey}
              onClick={() => {
                setSelectedDate(dateKey);
                if (!inMonth) setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
              }}
            >
              <span>{date.getDate()}</span>
              {events.length > 0 && (
                <span className="calendar-day-indicators" aria-hidden="true">
                  {events.some((event) => event.type === "collection") && <i className="collection-indicator" />}
                  {events.some((event) => event.type === "request") && <i className="request-indicator" />}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="calendar-legend" aria-label="Calendar indicators">
        <span><i className="collection-indicator" />Collection schedule</span>
        <span><i className="request-indicator" />Approved request</span>
      </div>
      <div className="calendar-day-details" aria-live="polite">
        <h3>{dateKeyDate(selectedDate).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</h3>
        {dayEvents.length ? (
          <div className="calendar-day-event-list">
            {dayEvents.map((event) => event.type === "collection" ? (
              <article className="calendar-event" key={`schedule-${event.schedule._id}`}>
                <span className="status-pill">{event.schedule.wasteType}</span>
                <strong>Collection · {event.schedule.area}</strong>
                <p>Estimated arrival: {formatArrivalTime(event.schedule.estimatedArrivalTime)}</p>
                {event.schedule.notes && <p>{event.schedule.notes}</p>}
              </article>
            ) : (
              <article className="calendar-event approved-request-event" key={`request-${event.request._id}`}>
                <span className="status-pill">Approved request</span>
                <strong>{event.request.kind === "missed_pickup" ? "Missed pickup" : "Special request"}</strong>
                <p>{event.request.description}</p>
                <p>Estimated collection time: {event.request.scheduledTime ? formatArrivalTime(event.request.scheduledTime) : "Not provided"}</p>
              </article>
            ))}
          </div>
        ) : <p className="calendar-no-events">No collections or approved requests for this day.</p>}
      </div>
    </section>
  );
}

function ScheduleForm({ onSubmit, residencies = [], admin = false, residencyName = "" }) {
  return (
    <form className="inline-form" onSubmit={onSubmit}>
      {admin
        ? <div className="schedule-residency-context"><span>Residency</span><strong>{residencyName || "Your assigned residency"}</strong></div>
        : <label>Residency<select name="residencyId" required defaultValue=""><option value="" disabled>Select residency</option>{residencies.map((residency) => <option key={residency._id} value={residency._id}>{residency.name}</option>)}</select></label>}
      <label>Subdivision / collection area<input name="area" required maxLength="100" placeholder="e.g. Row House" /></label>
      <label>Collection date<input name="date" type="date" required /></label>
      <label>Estimated arrival time<input name="estimatedArrivalTime" type="time" required /></label>
      <label>Waste type<select name="wasteType" required><option value="General waste">General waste</option><option value="Recycling">Recycling</option><option value="Green waste">Green waste</option><option value="Bulk collection">Bulk collection</option></select></label>
      <label>Notes (optional)<input name="notes" maxLength="300" placeholder="Collection details" /></label>
      <button className="button button-dark" type="submit">Publish schedule ↗</button>
    </form>
  );
}

function AccountForm({ onSubmit, admin, canCreateSuperadmin = false, residencies = [], subdivisions = [], residencyName = "", subdivisionName = "" }) {
  const [selectedResidencyId, setSelectedResidencyId] = useState("");
  const [selectedSubdivisionId, setSelectedSubdivisionId] = useState("");
  const [selectedRole, setSelectedRole] = useState(admin ? "user" : "admin");
  const availableSubdivisions = subdivisions.filter((subdivision) => {
    const assignedResidencyId = subdivision.residencyId?._id || subdivision.residencyId;
    return String(assignedResidencyId) === String(selectedResidencyId);
  });

  return (
    <form className="form-grid management-form" onSubmit={onSubmit} onReset={() => {
      setSelectedResidencyId("");
      setSelectedSubdivisionId("");
      setSelectedRole(admin ? "user" : "admin");
    }}>
      {admin && <input type="hidden" name="role" value="user" />}
      {admin && <div className="schedule-residency-context"><span>Residency · Subdivision</span><strong>{residencyName || "Your assigned residency"} · {subdivisionName || "Your assigned subdivision"}</strong></div>}
      <label>Full name<input name="name" required minLength="2" maxLength="80" /></label>
      <label>Email address<input name="email" type="email" required maxLength="254" /></label>
      <label>Phone number<input name="phone" type="tel" required placeholder="+639171234567" /><small>Use Philippine mobile format beginning with +639.</small></label>
      {!admin && <label>Account type<select name="role" value={selectedRole} onChange={(event) => {
        setSelectedRole(event.target.value);
        if (event.target.value === "superadmin") {
          setSelectedResidencyId("");
          setSelectedSubdivisionId("");
        }
      }}><option value="admin">Residency admin</option><option value="user">Resident</option>{canCreateSuperadmin && <option value="superadmin">Superadmin</option>}</select></label>}
      {!admin && selectedRole !== "superadmin" && (
        <>
          <label>Residency<select name="residencyId" required value={selectedResidencyId} onChange={(event) => { setSelectedResidencyId(event.target.value); setSelectedSubdivisionId(""); }}><option value="" disabled>Select residency</option>{residencies.map((residency) => <option key={residency._id} value={residency._id}>{residency.name}</option>)}</select></label>
          <label>Subdivision<select name="subdivisionId" required value={selectedSubdivisionId} onChange={(event) => setSelectedSubdivisionId(event.target.value)}><option value="" disabled>Select subdivision</option>{availableSubdivisions.map((subdivision) => <option key={subdivision._id} value={subdivision._id}>{subdivision.name}</option>)}</select></label>
        </>
      )}
      <button className="button button-dark" type="submit">{admin ? "Create resident" : selectedRole === "superadmin" ? "Create superadmin" : "Create account"} ↗</button>
      <p className="form-footnote management-password-note">Temporary password: <strong>11111111</strong>. They must create a new password before accessing the dashboard.</p>
    </form>
  );
}

function ManagedAccountRow({ account, onView, onSettings, currentUserId }) {
  const normalizedRole = account.role === "resident" ? "user" : account.role;
  const isCurrentUser = String(account._id) === String(currentUserId);
  return (
    <tr>
      <td><strong>{account.name}</strong>{isCurrentUser && <span className="current-account-pill">You</span>}</td>
      <td>{account.email}</td>
      <td><span className="status-pill">{normalizedRole === "user" ? "Resident" : normalizedRole}</span>{account.accountLocked && <span className="status-pill status-declined account-locked-pill">Locked</span>}</td>
      <td>{account.residencyId?.name || "—"}</td>
      <td>{account.subdivisionId?.name || "—"}</td>
      <td>
        <div className="account-row-actions">
          <button className="account-icon-button" type="button" aria-label={`View details for ${account.name}`} title="View details" onClick={() => onView(account)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.7" /></svg>
          </button>
          <button className="account-icon-button" type="button" aria-label={`Settings for ${account.name}`} title="Account settings" onClick={() => onSettings(account)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.7a3.3 3.3 0 1 0 0 6.6 3.3 3.3 0 0 0 0-6.6Z" /><path d="m19.4 13.5 1.1.9-1.6 2.8-1.4-.5a7.8 7.8 0 0 1-1.6.9l-.2 1.5h-3.3l-.2-1.5a7.8 7.8 0 0 1-1.6-.9l-1.4.5-1.6-2.8 1.1-.9a7.6 7.6 0 0 1 0-1.8l-1.1-.9 1.6-2.8 1.4.5a7.8 7.8 0 0 1 1.6-.9l.2-1.5h3.3l.2 1.5a7.8 7.8 0 0 1 1.6.9l1.4-.5 1.6 2.8-1.1.9a7.6 7.6 0 0 1 0 1.8Z" /></svg>
          </button>
        </div>
      </td>
    </tr>
  );
}

function AccountDetailsDialog({ account, residencies, subdivisions, onSave, onClose }) {
  const dialogRef = useRef(null);
  const [residencyId, setResidencyId] = useState(account.residencyId?._id || account.residencyId || "");
  const [subdivisionId, setSubdivisionId] = useState(account.subdivisionId?._id || account.subdivisionId || "");
  const [role, setRole] = useState(account.role === "resident" ? "user" : account.role);
  const editable = account.role !== "superadmin";
  const availableSubdivisions = subdivisions.filter((subdivision) =>
    String(subdivision.residencyId?._id || subdivision.residencyId) === String(residencyId)
  );
  const selectedSubdivisionIsValid = availableSubdivisions.some((subdivision) => subdivision._id === subdivisionId);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function changeResidency(event) {
    setResidencyId(event.target.value);
    setSubdivisionId("");
  }

  async function saveAccount() {
    const saved = await onSave(account._id, residencyId, subdivisionId, role);
    if (saved) dialogRef.current?.close();
  }

  return (
    <dialog className="account-details-dialog" ref={dialogRef} onClose={onClose}>
      <div className="collection-history-heading">
        <div><div className="eyebrow">ACCOUNT DETAILS</div><h2>{account.name}</h2></div>
        <button className="button button-small button-outline" type="button" onClick={() => dialogRef.current?.close()}>Close</button>
      </div>
      <dl className="account-details-grid">
        <div><dt>Email</dt><dd>{account.email}</dd></div>
        <div><dt>Phone</dt><dd>{account.phone}</dd></div>
        <div><dt>Account type</dt><dd>{account.role === "resident" ? "Resident" : account.role}</dd></div>
        <div><dt>Residency</dt><dd>{account.residencyId?.name || "Not assigned"}</dd></div>
        <div><dt>Subdivision</dt><dd>{account.subdivisionId?.name || "Not assigned"}</dd></div>
        <div><dt>Account status</dt><dd>{account.accountLocked ? "Locked" : "Active"}</dd></div>
        <div><dt>Created</dt><dd>{account.createdAt ? new Date(account.createdAt).toLocaleString() : "Unavailable"}</dd></div>
      </dl>
      {editable ? (
        <div className="account-details-edit">
          <div className="eyebrow">ASSIGNMENT</div>
          <label>Account type<select aria-label={`Role for ${account.name}`} value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="admin">Admin</option><option value="user">Resident</option>
          </select></label>
          <label>Residency<select aria-label={`Residency for ${account.name}`} value={residencyId} onChange={changeResidency}>
            <option value="" disabled>Assign residency</option>{residencies.map((residency) => <option key={residency._id} value={residency._id}>{residency.name}</option>)}
          </select></label>
          <label>Subdivision<select aria-label={`Subdivision for ${account.name}`} value={subdivisionId} onChange={(event) => setSubdivisionId(event.target.value)}>
            <option value="" disabled>Assign subdivision</option>{availableSubdivisions.map((subdivision) => <option key={subdivision._id} value={subdivision._id}>{subdivision.name}</option>)}
          </select></label>
          <button className="button button-dark" type="button" disabled={!selectedSubdivisionIsValid} onClick={saveAccount}>Save changes</button>
        </div>
      ) : <p className="account-details-readonly">Superadmin accounts cannot be reassigned.</p>}
    </dialog>
  );
}

function AccountSettingsDialog({ account, currentUserId, onClose, onSaveName, onResetPassword, onChangePassword, onToggleLock }) {
  const dialogRef = useRef(null);
  const [currentAccount, setCurrentAccount] = useState(account);
  const [name, setName] = useState(currentAccount.name);
  const [password, setPassword] = useState("");
  const [working, setWorking] = useState(false);
  const isCurrentUser = String(currentAccount._id) === String(currentUserId);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  async function submitName(event) {
    event.preventDefault();
    setWorking(true);
    if (await onSaveName(currentAccount._id, name)) {
      const updatedName = name.trim();
      setName(updatedName);
      setCurrentAccount((current) => ({ ...current, name: updatedName }));
    }
    setWorking(false);
  }

  async function submitPassword(event) {
    event.preventDefault();
    setWorking(true);
    if (await onChangePassword(currentAccount._id, password)) setPassword("");
    setWorking(false);
  }

  async function resetPassword() {
    if (!window.confirm(`Reset ${currentAccount.name}'s password to the temporary password? They will have to choose a new password at next sign-in.`)) return;
    setWorking(true);
    await onResetPassword(currentAccount._id);
    setWorking(false);
  }

  async function toggleLock() {
    const action = currentAccount.accountLocked ? "unlock" : "lock";
    if (!window.confirm(`Are you sure you want to ${action} ${currentAccount.name}'s account?`)) return;
    setWorking(true);
    const locked = !currentAccount.accountLocked;
    if (await onToggleLock(currentAccount._id, locked)) {
      setCurrentAccount((current) => ({ ...current, accountLocked: locked }));
    }
    setWorking(false);
  }

  return (
    <dialog className="account-details-dialog account-settings-dialog" ref={dialogRef} onClose={onClose}>
      <div className="collection-history-heading">
        <div><div className="eyebrow">ACCOUNT SETTINGS</div><h2>{currentAccount.name}</h2></div>
        <button className="button button-small button-outline" type="button" onClick={() => dialogRef.current?.close()}>Close</button>
      </div>
      <p className="account-created-date">Created {currentAccount.createdAt ? new Date(currentAccount.createdAt).toLocaleString() : "date unavailable"}</p>
      <form className="account-settings-form" onSubmit={submitName}>
        <label>Edit user name<input value={name} onChange={(event) => setName(event.target.value)} minLength="2" maxLength="80" required /></label>
        <button className="button button-dark" type="submit" disabled={working || name.trim() === currentAccount.name}>Save name</button>
      </form>
      <form className="account-settings-form" onSubmit={submitPassword}>
        <label>Change password<input type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength="8" maxLength="72" required placeholder="At least 8 characters" /></label>
        <button className="button button-dark" type="submit" disabled={working || password.length < 8}>Change password</button>
      </form>
      <div className="account-settings-actions">
        <button className="button button-outline" type="button" onClick={resetPassword} disabled={working}>Reset to temporary password</button>
        {!isCurrentUser && <button className={`button ${currentAccount.accountLocked ? "button-dark" : "button-delete"}`} type="button" onClick={toggleLock} disabled={working}>
          <svg viewBox="0 0 24 24" aria-hidden="true">{currentAccount.accountLocked ? <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 7.7-1.5" /></> : <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>}</svg>
          {currentAccount.accountLocked ? "Unlock account" : "Lock account"}
        </button>}
      </div>
      {isCurrentUser && <p className="account-settings-note">You can edit your own profile and password here. Your own account cannot be locked from this screen.</p>}
    </dialog>
  );
}

function SubdivisionForm({ residencies, subdivisions, onSubmit, submitting }) {
  return (
    <form className="inline-form subdivision-form" onSubmit={onSubmit}>
      <label>Residency<select name="residencyId" required defaultValue=""><option value="" disabled>Select residency</option>{residencies.filter((residency) => residency.active).map((residency) => <option key={residency._id} value={residency._id}>{residency.name}</option>)}</select></label>
      <label>Subdivision name<input name="name" required minLength="2" maxLength="100" placeholder="e.g. Row House" /></label>
      <button className="button button-dark" type="submit" disabled={submitting}>{submitting ? "Adding..." : "Add subdivision"}</button>
      <p className="form-footnote">{subdivisions.length} subdivision(s) configured</p>
    </form>
  );
}

function RequestCard({ request, onApprove, onDecline, onDelete }) {
  const [decision, setDecision] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const [decisionError, setDecisionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef(null);
  const requestLabel = request.kind === "missed_pickup" ? "Missed pickup" : "Special request";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (decision && !dialog.open) dialog.showModal();
    if (!decision && dialog.open) dialog.close();
  }, [decision]);

  function closeDialog() {
    setDecision(null);
    setConfirmation(null);
    setDecisionError("");
  }

  async function confirmDecision() {
    setSubmitting(true);
    const succeeded = confirmation.type === "approve"
      ? await onApprove(request._id, confirmation.scheduledDate, confirmation.scheduledTime, confirmation.scheduledAt)
      : await onDecline(request._id, confirmation.declineReason);
    setSubmitting(false);
    if (succeeded === true) closeDialog();
    else setDecisionError(succeeded || "The request could not be updated. Please try again.");
  }

  return (
    <article className="request-card">
      <div className="request-meta"><span className={`status-pill ${request.status === "pending" ? "status-pending" : request.status === "declined" ? "status-declined" : ""}`}>{request.status}</span><span>{new Date(request.createdAt).toLocaleDateString()}</span></div>
      <h3>{requestLabel}</h3>
      <p>{request.description}</p>
      <small>From {request.resident.name} · {request.resident.phone}</small>
      {request.status === "approved" && request.scheduledDate && <small>Scheduled for {dateKeyDate(request.scheduledDate).toLocaleDateString()}{request.scheduledTime ? ` at ${formatArrivalTime(request.scheduledTime)}` : ""}</small>}
      {request.status === "declined" && request.declineReason && <p className="request-decline-reason"><strong>Reason:</strong> {request.declineReason}</p>}
      {request.status === "pending" && (
        <div className="request-review-actions">
          <button className="button button-small button-outline" type="button" onClick={() => { setDecisionError(""); setDecision("approve"); }}>Approve</button>
          <button className="button button-small button-delete" type="button" onClick={() => { setDecisionError(""); setDecision("decline"); }}>Decline</button>
        </div>
      )}
      {onDelete && request.status !== "pending" && (
        <button className="button button-small button-delete" type="button" onClick={() => onDelete(request._id, requestLabel)}>Delete request</button>
      )}
      <dialog
        ref={dialogRef}
        className="request-decision-dialog"
        aria-labelledby={`request-dialog-title-${request._id}`}
        onClose={closeDialog}
      >
        {decision && (
          <>
            <div className="request-dialog-heading">
              <div>
                <div className="eyebrow">REVIEW REQUEST</div>
                <h2 id={`request-dialog-title-${request._id}`}>{confirmation ? `Confirm ${confirmation.type === "approve" ? "approval" : "decline"}` : `${decision === "approve" ? "Approve" : "Decline"} request`}</h2>
              </div>
              <button className="request-dialog-close" type="button" aria-label="Close dialog" onClick={closeDialog}>×</button>
            </div>
            <p className="request-dialog-summary"><strong>{requestLabel}</strong> from {request.resident.name}</p>
            {decisionError && <p className="request-dialog-error" role="alert">{decisionError}</p>}
            {confirmation ? (
              <div className={`request-confirmation ${confirmation.type === "decline" ? "request-confirmation-decline" : ""}`}>
                <p>
                  {confirmation.type === "approve"
                    ? `Approve this request and schedule collection for ${dateKeyDate(confirmation.scheduledDate).toLocaleDateString()} at ${formatArrivalTime(confirmation.scheduledTime)} Philippines time?`
                    : `Decline this request with the reason: “${confirmation.declineReason}”`}
                </p>
                <p>The resident will be notified by SMS. Please confirm that this decision is correct.</p>
                <div className="request-dialog-actions">
                  <button className="button button-small button-outline" type="button" onClick={() => setConfirmation(null)} disabled={submitting}>Go back</button>
                  <button className={`button button-small ${confirmation.type === "approve" ? "button-dark" : "button-delete"}`} type="button" onClick={confirmDecision} disabled={submitting}>
                    {submitting ? "Submitting..." : `Confirm ${confirmation.type === "approve" ? "approval" : "decline"}`}
                  </button>
                </div>
              </div>
            ) : (
              <form className="request-dialog-form" onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                setConfirmation(decision === "approve"
                  ? {
                    type: "approve",
                    scheduledDate: data.get("scheduledDate"),
                    scheduledTime: data.get("scheduledTime")
                  }
                  : { type: "decline", declineReason: data.get("declineReason") });
              }}>
                {decision === "approve"
                  ? <>
                    <label>Approved collection date<input type="date" name="scheduledDate" min={localDateKey(new Date())} required autoFocus /></label>
                    <label>Estimated collection time (Philippines time)<input type="time" name="scheduledTime" required /></label>
                  </>
                  : <label>Reason for declining<textarea name="declineReason" rows="4" maxLength="500" required autoFocus placeholder="Explain why this request cannot be approved" /></label>}
                <p className="request-dialog-hint">{decision === "approve" ? "The resident will receive an SMS when approved and another reminder at this estimated time." : "You will be asked to confirm before this decision is sent to the resident."}</p>
                <div className="request-dialog-actions">
                  <button className="button button-small button-outline" type="button" onClick={closeDialog}>Cancel</button>
                  <button className={`button button-small ${decision === "approve" ? "button-dark" : "button-delete"}`} type="submit">Submit {decision === "approve" ? "approval" : "decline"}</button>
                </div>
              </form>
            )}
          </>
        )}
      </dialog>
    </article>
  );
}

function RequestMailbox({ requests, onDelete }) {
  return (
    <section className="panel request-mailbox" id="resident-mailbox">
      <div className="panel-heading">
        <div><div className="eyebrow">YOUR REQUEST UPDATES</div><h2>Request mailbox</h2></div>
        <span className="count-badge">{requests.length}</span>
      </div>
      {requests.length ? (
        <div className="request-list">
          {requests.map((request) => (
            <article className="mailbox-message" key={request._id}>
              <div className="request-meta">
                <span className={`status-pill ${request.status === "pending" ? "status-pending" : request.status === "declined" ? "status-declined" : ""}`}>{request.status}</span>
                <span>{new Date(request.updatedAt || request.createdAt).toLocaleDateString()}</span>
              </div>
              <h3>{request.kind === "missed_pickup" ? "Missed pickup" : "Special request"}</h3>
              <p>{request.description}</p>
              {request.status === "pending" && <p className="mailbox-update">Your request is waiting for admin review.</p>}
              {request.status === "approved" && (
                <>
                  <p className="mailbox-update">
                    Your request was approved{request.scheduledDate ? ` for ${dateKeyDate(request.scheduledDate).toLocaleDateString()}.` : "."}
                  </p>
                  {request.scheduledDate && (
                    <p className="mailbox-update">
                      Estimated collection time: {request.scheduledTime ? formatArrivalTime(request.scheduledTime) : "Not provided"}.
                    </p>
                  )}
                </>
              )}
              {request.status === "declined" && <p className="request-decline-reason"><strong>Admin's reason:</strong> {request.declineReason || "No reason was provided."}</p>}
              {request.status === "reviewed" && <p className="mailbox-update">Your request has been reviewed.</p>}
              <button
                className="button button-small button-delete"
                type="button"
                onClick={() => onDelete(request._id, request.kind === "missed_pickup" ? "Missed pickup" : "Special request", request.status)}
              >
                {request.status === "pending" ? "Cancel request" : "Delete"}
              </button>
            </article>
          ))}
        </div>
      ) : <div className="empty-state"><p>Your submitted requests and their updates will appear here.</p></div>}
    </section>
  );
}

function ResidentRequestPanel({ onSubmit, submitting, subdivisionName }) {
  return (
    <div className="panel request-panel">
      <div className="panel-heading"><div><div className="eyebrow">NEED A HAND?</div><h2>Let us know</h2></div><span className="feature-icon">♡</span></div>
      <p className="panel-description">Submit a missed pickup or special collection request for {subdivisionName || "your subdivision"}. Your subdivision admin will review it. If approved, the estimated collection date and time will appear in your calendar and mailbox.</p>
      <form className="form-grid" onSubmit={onSubmit}>
        <label>Request type<select name="kind"><option value="special_request">Special collection request</option><option value="missed_pickup">Report a missed pickup</option></select></label>
        <label>Details<textarea name="description" required maxLength="1000" rows="4" placeholder="Share the details so we can help..."></textarea></label>
        <button className="button button-dark" type="submit" disabled={submitting}>{submitting ? "Sending..." : "Send request ↗"}</button>
      </form>
    </div>
  );
}

function Dashboard({ user, token, onLogout, onUserUpdate }) {
  const [schedules, setSchedules] = useState([]);
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [residencies, setResidencies] = useState([]);
  const [subdivisions, setSubdivisions] = useState([]);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyMonth, setHistoryMonth] = useState(() => manilaDateKey(new Date()).slice(0, 7));
  const [historySchedules, setHistorySchedules] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [superadminView, setSuperadminView] = useState("overview");
  const [configureView, setConfigureView] = useState("residencies");
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedSettingsAccount, setSelectedSettingsAccount] = useState(null);
  const [accountSearch, setAccountSearch] = useState("");
  const [residentPage, setResidentPage] = useState("resident-calendar");
  const [adminPage, setAdminPage] = useState(() => {
    const page = window.location.hash.slice(1);
    return adminPageLinks.some(([id]) => id === page) ? page : "admin-schedules";
  });
  const admin = user.role === "admin";
  const superadmin = user.role === "superadmin";
  const normalizedAccountSearch = accountSearch.trim().toLocaleLowerCase();
  const filteredAccounts = users.filter((account) => {
    if (!normalizedAccountSearch) return true;
    const role = account.role === "resident" ? "resident" : account.role === "user" ? "resident" : account.role;
    return [
      account.name,
      account.email,
      role,
      account.residencyId?.name,
      account.subdivisionId?.name
    ].some((value) => String(value || "").toLocaleLowerCase().includes(normalizedAccountSearch));
  });

  async function refreshDashboard() {
    const [scheduleResult, requestResult, userResult, residencyResult, subdivisionResult] = await Promise.all([
      api("/schedules", {}, token),
      admin || superadmin || user.role === "user" ? api("/requests", {}, token) : Promise.resolve({ requests: [] }),
      admin || superadmin ? api("/users", {}, token) : Promise.resolve({ users: [] }),
      superadmin ? api("/residencies", {}, token) : Promise.resolve({ residencies: [] }),
      admin || superadmin ? api("/subdivisions", {}, token) : Promise.resolve({ subdivisions: [] })
    ]);
    setSchedules(scheduleResult.schedules);
    setRequests(requestResult.requests);
    setUsers(userResult.users);
    setResidencies(residencyResult.residencies);
    setSubdivisions(subdivisionResult.subdivisions);
  }

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [scheduleResult, requestResult, userResult, residencyResult, subdivisionResult] = await Promise.all([
          api("/schedules", {}, token),
          admin || superadmin || user.role === "user" ? api("/requests", {}, token) : Promise.resolve({ requests: [] }),
          admin || superadmin ? api("/users", {}, token) : Promise.resolve({ users: [] }),
          superadmin ? api("/residencies", {}, token) : Promise.resolve({ residencies: [] }),
          admin || superadmin ? api("/subdivisions", {}, token) : Promise.resolve({ subdivisions: [] })
        ]);
        if (active) {
          setSchedules(scheduleResult.schedules);
          setRequests(requestResult.requests);
          setUsers(userResult.users);
          setResidencies(residencyResult.residencies);
          setSubdivisions(subdivisionResult.subdivisions);
        }
      } catch (error) {
        if (active) setNotice({ message: error.message, isError: true });
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [admin, superadmin, token]);

  useEffect(() => {
    if (!historyOpen || (!admin && !superadmin)) return undefined;
    let active = true;
    async function loadCollectionHistory() {
      setHistoryLoading(true);
      setHistorySchedules([]);
      try {
        const result = await api(`/schedules?month=${encodeURIComponent(historyMonth)}`, {}, token);
        const scopedSchedules = superadmin
          ? result.schedules
          : result.schedules.filter((schedule) => {
            const scheduleResidencyId = schedule.residencyId?._id || schedule.residencyId;
            return String(scheduleResidencyId) === String(user.residencyId);
          });
        if (active) setHistorySchedules(scopedSchedules);
      } catch (error) {
        if (active) setNotice({ message: error.message, isError: true });
      } finally {
        if (active) setHistoryLoading(false);
      }
    }
    loadCollectionHistory();
    return () => { active = false; };
  }, [admin, historyMonth, historyOpen, superadmin, token, user.residencyId]);

  async function submitSchedule(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setSubmitting(true);
    setNotice(null);
    const data = Object.fromEntries(new FormData(form));
    try {
      const result = await api("/schedules", { method: "POST", body: JSON.stringify(data) }, token);
      await refreshDashboard();
      const notification = result.notification;
      const message = notification.sent
        ? `Schedule published. SMS queued for ${notification.queued} resident(s).`
        : `Schedule published. SMS could not be queued: ${notification.reason}`;
      setNotice({ message });
      form.reset();
    } catch (error) {
      setNotice({ message: error.message, isError: true });
    } finally {
      setSubmitting(false);
    }
  }

  async function submitRequest(event) {
    event.preventDefault();
    setSubmitting(true);
    setNotice(null);
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    try {
      await api("/requests", { method: "POST", body: JSON.stringify(data) }, token);
      await refreshDashboard();
      setNotice({
        message: "Your request was submitted and is pending review. You will receive an SMS when the admin makes a decision."
      });
      form.reset();
    } catch (error) {
      setNotice({ message: error.message, isError: true });
    } finally {
      setSubmitting(false);
    }
  }

  async function createAccount(event) {
    event.preventDefault();
    setSubmitting(true);
    setNotice(null);
    const form = event.currentTarget;
    try {
      await api("/users", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(form))) }, token);
      await refreshDashboard();
      setNotice({ message: "Account created successfully." });
      form.reset();
    } catch (error) {
      setNotice({ message: error.message, isError: true });
    } finally {
      setSubmitting(false);
    }
  }

  async function createResidency(event) {
    event.preventDefault();
    setSubmitting(true);
    setNotice(null);
    const form = event.currentTarget;
    try {
      await api("/residencies", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(form))) }, token);
      await refreshDashboard();
      setNotice({ message: "Residency created." });
      form.reset();
    } catch (error) {
      setNotice({ message: error.message, isError: true });
    } finally {
      setSubmitting(false);
    }
  }

  async function createSubdivision(event) {
    event.preventDefault();
    setSubmitting(true);
    setNotice(null);
    const form = event.currentTarget;
    try {
      await api("/subdivisions", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(new FormData(form)))
      }, token);
      await refreshDashboard();
      setNotice({ message: "Subdivision added." });
      form.reset();
    } catch (error) {
      setNotice({ message: error.message, isError: true });
    } finally {
      setSubmitting(false);
    }
  }

  async function updateAccount(id, residencyId, subdivisionId, role) {
    try {
      await api(`/users/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ residencyId, subdivisionId, role })
      }, token);
      await refreshDashboard();
      setNotice({ message: "Account updated." });
      return true;
    } catch (error) {
      setNotice({ message: error.message, isError: true });
      return false;
    }
  }

  async function saveAccountName(id, name) {
    try {
      const result = await api(`/users/${encodeURIComponent(id)}/profile`, {
        method: "PATCH",
        body: JSON.stringify({ name })
      }, token);
      await refreshDashboard();
      if (String(id) === String(user.id)) onUserUpdate({ name: result.user.name });
      setNotice({ message: "Account name updated." });
      return true;
    } catch (error) {
      setNotice({ message: error.message, isError: true });
      return false;
    }
  }

  async function resetAccountPassword(id) {
    try {
      const result = await api(`/users/${encodeURIComponent(id)}/reset-password`, { method: "POST" }, token);
      if (String(id) === String(user.id)) {
        window.alert(`${result.message} You will now be signed out. Sign in again with the temporary password to continue.`);
        onLogout();
        return true;
      }
      await refreshDashboard();
      setNotice({ message: result.message });
      return true;
    } catch (error) {
      setNotice({ message: error.message, isError: true });
      return false;
    }
  }

  async function changeAccountPassword(id, password) {
    try {
      const result = await api(`/users/${encodeURIComponent(id)}/password`, {
        method: "PATCH",
        body: JSON.stringify({ password })
      }, token);
      setNotice({ message: result.message });
      return true;
    } catch (error) {
      setNotice({ message: error.message, isError: true });
      return false;
    }
  }

  async function setAccountLocked(id, locked) {
    try {
      const result = await api(`/users/${encodeURIComponent(id)}/lock`, {
        method: "PATCH",
        body: JSON.stringify({ locked })
      }, token);
      await refreshDashboard();
      setNotice({ message: result.message });
      return true;
    } catch (error) {
      setNotice({ message: error.message, isError: true });
      return false;
    }
  }

  async function deleteResidentAccount(account) {
    if (!window.confirm(`Delete resident account for ${account.name}? Their service request history will also be deleted. This cannot be undone.`)) return;
    setNotice(null);
    try {
      await api(`/users/${encodeURIComponent(account._id)}`, { method: "DELETE" }, token);
      await refreshDashboard();
      setNotice({ message: `Resident account for ${account.name} deleted.` });
    } catch (error) {
      setNotice({ message: error.message, isError: true });
    }
  }

  async function toggleResidency(residency) {
    try {
      await api(`/residencies/${encodeURIComponent(residency._id)}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !residency.active })
      }, token);
      await refreshDashboard();
      setNotice({ message: `${residency.name} ${residency.active ? "deactivated" : "activated"}.` });
    } catch (error) {
      setNotice({ message: error.message, isError: true });
    }
  }

  async function approveRequest(id, scheduledDate, scheduledTime) {
    setNotice(null);
    try {
      const result = await api(`/requests/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "approved", scheduledDate, scheduledTime })
      }, token);
      await refreshDashboard();
      setNotice({
        message: result.notification.sent
          ? `Request approved and approval SMS queued. A reminder SMS is scheduled for ${formatArrivalTime(scheduledTime)} Philippines time.`
          : `Request approved. Approval SMS could not be queued: ${result.notification.reason} A reminder SMS is scheduled for ${formatArrivalTime(scheduledTime)} Philippines time.`
      });
      return true;
    } catch (error) {
      setNotice({ message: error.message, isError: true });
      return error.message;
    }
  }

  async function declineRequest(id, declineReason) {
    setNotice(null);
    try {
      const result = await api(`/requests/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "declined", declineReason })
      }, token);
      await refreshDashboard();
      setNotice({
        message: result.notification.sent
          ? "Request declined and SMS queued for the resident."
          : `Request declined. SMS could not be queued: ${result.notification.reason}`
      });
      return true;
    } catch (error) {
      setNotice({ message: error.message, isError: true });
      return error.message;
    }
  }

  async function deleteSchedule(id, label) {
    if (!window.confirm(`Delete the collection schedule for "${label}"? Residents will no longer see it in their calendar.`)) return;
    setNotice(null);
    try {
      await api(`/schedules/${encodeURIComponent(id)}`, { method: "DELETE" }, token);
      await refreshDashboard();
      setNotice({ message: "Collection schedule deleted." });
    } catch (error) {
      setNotice({ message: error.message, isError: true });
    }
  }

  async function deleteServiceRequest(id, label, status) {
    const isPending = status === "pending";
    const confirmation = isPending
      ? `Cancel your pending ${label.toLowerCase()} request? This cannot be undone.`
      : `Delete this ${label.toLowerCase()} service request? This cannot be undone.`;
    if (!window.confirm(confirmation)) return;
    setNotice(null);
    try {
      await api(`/requests/${encodeURIComponent(id)}`, { method: "DELETE" }, token);
      await refreshDashboard();
      setNotice({ message: isPending ? "Request canceled." : "Service request deleted." });
    } catch (error) {
      setNotice({ message: error.message, isError: true });
    }
  }

  const openRequestCount = requests.filter((request) => request.status === "pending").length;
  const adminCount = users.filter((account) => account.role === "admin").length;
  const residentCount = users.filter((account) => account.role === "user" || account.role === "resident").length;

  return (
    <main className="dashboard-shell">
      <nav className="topbar"><Brand /><div className="user-nav"><span className="role-chip">{superadmin ? "SUPERADMIN" : admin ? "ADMIN" : "RESIDENT"}</span><span className="user-name">{user.name}</span><button className="button button-outline" type="button" onClick={onLogout}>Sign out</button></div></nav>
      <section className="dashboard-heading"><div><div className="eyebrow">{superadmin ? "SYSTEM MANAGEMENT" : admin ? `RESIDENCY ADMINISTRATION${user.residencyName ? ` · ${user.residencyName}` : ""}${user.subdivisionName ? ` · ${user.subdivisionName}` : ""}` : `YOUR NEIGHBORHOOD${user.residencyName ? ` · ${user.residencyName}` : ""}${user.subdivisionName ? ` · ${user.subdivisionName}` : ""}`}</div><h1>{superadmin || admin ? "Good day, " : "Welcome, "}<span>{user.name.split(" ")[0]}.</span></h1><p>{superadmin ? "Manage residencies, administrators, subdivisions, and system-wide operations." : admin ? "Manage residents and requests for your subdivision; collection notices are shared residency-wide." : "Your collection schedule and community updates, all in one place."}</p></div><div className="heading-stamp">{superadmin ? "✳" : admin ? "✳" : "✦"}</div></section>
      <Notice notice={notice} />
      {!superadmin && (
        <nav
          className={`dashboard-tabs dashboard-tabs-sliding tab-count-${(admin ? adminPageLinks : residentPageLinks).length} tab-position-${(admin ? adminPageLinks : residentPageLinks).findIndex(([id]) => (admin ? adminPage : residentPage) === id)}${admin ? "" : " resident-dashboard-tabs"}`}
          aria-label={`${admin ? "Admin" : "Resident"} dashboard navigation`}
        >
          {(admin ? adminPageLinks : residentPageLinks).map(([id, label]) => {
            const selected = (admin ? adminPage : residentPage) === id;
            return (
              <button
                key={id}
                type="button"
                className={`dashboard-tab${selected ? " active" : ""}`}
                aria-current={selected ? "page" : undefined}
                onClick={() => admin ? setAdminPage(id) : setResidentPage(id)}
              >
                {label}{id === "admin-requests" && openRequestCount > 0 && <span>{openRequestCount}</span>}
              </button>
            );
          })}
        </nav>
      )}
      {superadmin ? (
        <>
          <nav
            className={`dashboard-tabs dashboard-tabs-sliding tab-count-${superadminPageLinks.length} tab-position-${superadminPageLinks.findIndex(([view]) => superadminView === view)}`}
            aria-label="Superadmin sections"
          >
            {superadminPageLinks.map(([view, label]) => (
              <button key={view} type="button" className={`dashboard-tab${superadminView === view ? " active" : ""}`} aria-current={superadminView === view ? "page" : undefined} onClick={() => setSuperadminView(view)}>{label}{view === "requests" && openRequestCount > 0 && <span>{openRequestCount}</span>}</button>
            ))}
          </nav>
          {superadminView === "overview" && (
            <section className="superadmin-content">
              <div className="overview-stats">
                <article className="overview-stat"><span>Active residencies</span><strong>{residencies.filter((residency) => residency.active).length}</strong><small>{residencies.length} total</small></article>
                <article className="overview-stat"><span>Administrators</span><strong>{adminCount}</strong><small>Across all residencies</small></article>
                <article className="overview-stat"><span>Residents</span><strong>{residentCount}</strong><small>Registered accounts</small></article>
                <article className="overview-stat"><span>Open requests</span><strong>{openRequestCount}</strong><small>Awaiting review</small></article>
              </div>
              <div className="dashboard-grid superadmin-overview-grid">
                <section className="panel">
                  <div className="panel-heading"><div><div className="eyebrow">COLLECTION CALENDAR</div><h2>Upcoming collections</h2></div><button className="text-action" type="button" onClick={() => setSuperadminView("collections")}>Manage</button></div>
                  {loading ? <div className="empty-state"><p>Loading schedules...</p></div> : schedules.length ? <div className="schedule-list">{schedules.slice(0, 4).map((schedule) => <ScheduleCard key={schedule._id} schedule={schedule} onDelete={deleteSchedule} />)}</div> : <div className="empty-state"><span>▦</span><p>No upcoming collections scheduled.</p></div>}
                </section>
                <section className="panel">
                  <div className="panel-heading"><div><div className="eyebrow">RESIDENT SUPPORT</div><h2>Open requests</h2></div><button className="text-action" type="button" onClick={() => setSuperadminView("requests")}>View all</button></div>
                          {loading ? <div className="empty-state"><p>Loading requests...</p></div> : requests.filter((request) => request.status === "pending").length ? <div className="request-list">{requests.filter((request) => request.status === "pending").slice(0, 3).map((request) => <RequestCard key={request._id} request={request} onApprove={approveRequest} onDecline={declineRequest} onDelete={deleteServiceRequest} />)}</div> : <div className="empty-state"><span>♡</span><p>No open requests to review.</p></div>}
                </section>
              </div>
            </section>
          )}
          {superadminView === "configure" && (
            <>
              <nav
                className={`dashboard-tabs dashboard-tabs-sliding configure-tabs tab-count-2 tab-position-${configureView === "residencies" ? 0 : 1}`}
                aria-label="Configuration sections"
              >
                {[["residencies", "Residencies"], ["subdivisions", "Subdivisions"]].map(([view, label]) => (
                  <button key={view} type="button" className={`dashboard-tab${configureView === view ? " active" : ""}`} aria-current={configureView === view ? "page" : undefined} onClick={() => setConfigureView(view)}>{label}</button>
                ))}
              </nav>
              {configureView === "residencies" && (
                <section className="superadmin-content panel">
                  <div className="panel-heading"><div><div className="eyebrow">SYSTEM SETUP</div><h2>Manage residencies</h2></div><span className="count-badge">{residencies.length}</span></div>
                  <form className="residency-create-form" onSubmit={createResidency}>
                    <label>Residency name<input name="name" required minLength="2" maxLength="100" placeholder="Enter a residency name" /></label>
                    <button className="button button-dark" type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create residency"}</button>
                  </form>
                  {loading ? <div className="empty-state"><p>Loading residencies...</p></div> : residencies.length ? <div className="resident-list">{residencies.map((residency) => <article key={residency._id} className="resident-row"><div><strong>{residency.name}</strong><small>{residency.active ? "Active" : "Inactive"}</small></div><button type="button" className="button button-small button-outline" onClick={() => toggleResidency(residency)}>{residency.active ? "Deactivate" : "Activate"}</button></article>)}</div> : <div className="empty-state"><p>No residencies yet. Create one to get started.</p></div>}
                </section>
              )}
              {configureView === "subdivisions" && (
                <section className="superadmin-content panel">
                  <div className="panel-heading"><div><div className="eyebrow">RESIDENCY ORGANIZATION</div><h2>Manage subdivisions</h2></div><span className="count-badge">{subdivisions.length}</span></div>
                  <SubdivisionForm residencies={residencies} subdivisions={subdivisions} onSubmit={createSubdivision} submitting={submitting} />
                  {subdivisions.length ? (
                    <div className="resident-list">{subdivisions.map((subdivision) => (
                      <article key={subdivision._id} className="resident-row">
                        <div><strong>{subdivision.name}</strong><small>{subdivision.residencyId?.name || "Residency unavailable"}</small></div>
                        <span className="status-pill">subdivision</span>
                      </article>
                    ))}</div>
                  ) : <div className="empty-state"><p>No subdivisions yet. Add a subdivision for each residency.</p></div>}
                </section>
              )}
            </>
          )}
          {superadminView === "accounts" && (
            <section className="superadmin-content accounts-management-grid">
              <div className="panel accounts-create-panel">
                <div className="panel-heading"><div><div className="eyebrow">ACCESS MANAGEMENT</div><h2>Create account</h2></div></div>
                <AccountForm onSubmit={createAccount} admin={false} canCreateSuperadmin residencies={residencies} subdivisions={subdivisions} />
              </div>
              <div className="panel accounts-list-panel">
                <div className="panel-heading"><div><div className="eyebrow">ACCOUNT DIRECTORY</div><h2>Existing accounts</h2></div><span className="count-badge">{normalizedAccountSearch ? `${filteredAccounts.length} / ${users.length}` : users.length}</span></div>
                <label className="account-search">
                  <span className="visually-hidden">Search accounts by name, email, type, residency, or subdivision</span>
                  <input type="search" value={accountSearch} onChange={(event) => setAccountSearch(event.target.value)} placeholder="Search name, email, type, residency, or subdivision" />
                </label>
                {loading ? <div className="empty-state"><p>Loading accounts...</p></div> : filteredAccounts.length ? (
                  <div className="accounts-table-scroll">
                    <table className="accounts-table">
                      <thead><tr><th>Name</th><th>Email</th><th>Type</th><th>Residency</th><th>Subdivision</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
                      <tbody>{filteredAccounts.map((account) => <ManagedAccountRow key={account._id} account={account} onView={setSelectedAccount} onSettings={setSelectedSettingsAccount} currentUserId={user.id} />)}</tbody>
                    </table>
                  </div>
                ) : <div className="empty-state"><p>{users.length ? "No accounts match your search." : "No accounts yet. Create an account to get started."}</p></div>}
              </div>
            </section>
          )}
          {superadminView === "collections" && (
            <section className="superadmin-content superadmin-operations">
              <div className="panel">
                <div className="panel-heading">
                  <div><div className="eyebrow">COLLECTION CALENDAR</div><h2>Manage collections</h2></div>
                  <div className="schedule-heading-actions">
                    <button className="button button-outline" type="button" onClick={() => setHistoryOpen(true)}>Month history</button>
                    <span className="count-badge">{schedules.length}</span>
                  </div>
                </div>
                <div className="collection-management-layout">
                  <section className="collection-create-column">
                    <div className="eyebrow">CREATE COLLECTION</div>
                    <ScheduleForm onSubmit={submitSchedule} residencies={residencies} />
                  </section>
                  <section className="collection-list-column">
                    <div className="panel-heading"><div><div className="eyebrow">PUBLISHED COLLECTIONS</div><h3>Collection list</h3></div><span className="count-badge">{schedules.length}</span></div>
                    <div className="collection-schedule-scroll">
                      {loading ? <div className="empty-state"><p>Loading schedules...</p></div> : schedules.length ? <div className="schedule-list">{schedules.map((schedule) => <ScheduleCard key={schedule._id} schedule={schedule} onDelete={deleteSchedule} />)}</div> : <div className="empty-state"><span>▦</span><p>No collection schedules have been posted yet.</p></div>}
                    </div>
                  </section>
                </div>
              </div>
            </section>
          )}
          {superadminView === "requests" && (
            <section className="panel admin-request-content">
              <div className="panel-heading"><div><div className="eyebrow">RESIDENT SUPPORT</div><h2>Service requests</h2></div><span className="count-badge">{openRequestCount} open</span></div>
              {loading ? <div className="empty-state"><p>Loading requests...</p></div> : requests.length ? <div className="request-list">{requests.map((request) => <RequestCard key={request._id} request={request} onApprove={approveRequest} onDecline={declineRequest} onDelete={deleteServiceRequest} />)}</div> : <div className="empty-state"><span>♡</span><p>No resident requests yet.</p></div>}
            </section>
          )}
        </>
      ) : admin ? (
        <>
          {adminPage === "admin-overview" && (
            <section className="superadmin-content">
              <div className="overview-stats admin-overview-stats">
                <article className="overview-stat"><span>Residents</span><strong>{residentCount}</strong><small>In your residency</small></article>
                <article className="overview-stat"><span>Collection schedules</span><strong>{schedules.length}</strong><small>Currently published</small></article>
                <article className="overview-stat"><span>Open requests</span><strong>{openRequestCount}</strong><small>Awaiting review</small></article>
              </div>
              <div className="dashboard-grid superadmin-overview-grid">
                <section className="panel">
                  <div className="panel-heading"><div><div className="eyebrow">COLLECTION CALENDAR</div><h2>Upcoming collections</h2></div><button className="text-action" type="button" onClick={() => setAdminPage("admin-schedules")}>Manage</button></div>
                  {loading ? <div className="empty-state"><p>Loading schedules...</p></div> : schedules.length ? <div className="schedule-list">{schedules.slice(0, 4).map((schedule) => <ScheduleCard key={schedule._id} schedule={schedule} onDelete={deleteSchedule} />)}</div> : <div className="empty-state"><span>▦</span><p>No collection schedules have been posted yet.</p></div>}
                </section>
                <section className="panel">
                  <div className="panel-heading"><div><div className="eyebrow">RESIDENT SUPPORT</div><h2>Open requests</h2></div><button className="text-action" type="button" onClick={() => setAdminPage("admin-requests")}>View all</button></div>
                  {loading ? <div className="empty-state"><p>Loading requests...</p></div> : requests.filter((request) => request.status === "pending").length ? <div className="request-list">{requests.filter((request) => request.status === "pending").slice(0, 3).map((request) => <RequestCard key={request._id} request={request} onApprove={approveRequest} onDecline={declineRequest} onDelete={deleteServiceRequest} />)}</div> : <div className="empty-state"><span>♡</span><p>No open requests to review.</p></div>}
                </section>
              </div>
            </section>
          )}
          {adminPage === "admin-calendar" && (
            <ResidentCalendar schedules={schedules} requests={requests} />
          )}
          {adminPage === "admin-schedules" && (
            <section className="panel admin-operations schedule-panel">
              <div className="panel-heading">
                <div><div className="eyebrow">COLLECTION CALENDAR</div><h2>Manage collections</h2></div>
                <div className="schedule-heading-actions">
                  <button className="button button-outline" type="button" onClick={() => setHistoryOpen(true)}>Month history</button>
                  <span className="count-badge">{schedules.length}</span>
                </div>
              </div>
              <div className="collection-management-layout">
                <section className="collection-create-column">
                  <div className="eyebrow">CREATE COLLECTION</div>
                  <ScheduleForm onSubmit={submitSchedule} admin residencyName={user.residencyName} />
                </section>
                <section className="collection-list-column">
                  <div className="panel-heading"><div><div className="eyebrow">PUBLISHED COLLECTIONS</div><h3>Collection list</h3></div><span className="count-badge">{schedules.length}</span></div>
                  <div className="collection-schedule-scroll">
                    {loading ? <div className="empty-state"><p>Loading schedules...</p></div> : schedules.length ? <div className="schedule-list">{schedules.map((schedule) => <ScheduleCard key={schedule._id} schedule={schedule} onDelete={deleteSchedule} />)}</div> : <div className="empty-state"><span>▦</span><p>No collection schedules have been posted yet.</p></div>}
                  </div>
                </section>
              </div>
            </section>
          )}
          {adminPage === "admin-requests" && (
            <section className="panel admin-request-content">
              <div className="panel-heading"><div><div className="eyebrow">RESIDENT SUPPORT</div><h2>Service requests</h2></div><span className="count-badge">{openRequestCount} open</span></div>
              <div className="request-list">{loading ? <div className="empty-state"><p>Loading requests...</p></div> : requests.length ? requests.map((request) => <RequestCard key={request._id} request={request} onApprove={approveRequest} onDecline={declineRequest} onDelete={deleteServiceRequest} />) : <div className="empty-state"><span>♡</span><p>No resident requests yet.</p></div>}</div>
            </section>
          )}
          {adminPage === "admin-residents" && (
            <section className="management-grid admin-residents-section">
              <div className="panel admin-resident-create-panel">
                <div className="panel-heading"><div><div className="eyebrow">RESIDENT ACCESS</div><h2>Create resident</h2></div></div>
                <AccountForm onSubmit={createAccount} admin residencies={residencies} subdivisions={subdivisions} residencyName={user.residencyName} subdivisionName={user.subdivisionName} />
              </div>
              <div className="panel admin-resident-list-panel">
                <div className="panel-heading"><div><div className="eyebrow">RESIDENT DIRECTORY</div><h2>Residents{user.subdivisionName ? ` · ${user.subdivisionName}` : ""}</h2></div><span className="count-badge">{users.length}</span></div>
                {loading ? <div className="empty-state"><p>Loading residents...</p></div> : users.length ? <div className="resident-list admin-resident-list">{users.map((account) => <article key={account._id} className="resident-row"><div><strong>{account.name}</strong><small>{account.email} · {account.phone}</small></div><div className="resident-admin-actions"><span className="status-pill">resident</span><button className="button button-small button-delete" type="button" onClick={() => deleteResidentAccount(account)}>Delete</button></div></article>)}</div> : <div className="empty-state"><p>No residents yet. Create an account to get started.</p></div>}
              </div>
            </section>
          )}
        </>
      ) : (
        <>
          {residentPage === "resident-calendar" && <ResidentCalendar schedules={schedules} requests={requests} />}
          {residentPage === "resident-requests" && (
            <section className="resident-request-page">
              <ResidentRequestPanel onSubmit={submitRequest} submitting={submitting} subdivisionName={user.subdivisionName} />
            </section>
          )}
          {residentPage === "resident-mailbox" && <RequestMailbox requests={requests} onDelete={deleteServiceRequest} />}
        </>
      )}
      <CollectionHistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        month={historyMonth}
        onMonthChange={setHistoryMonth}
        schedules={historySchedules}
        loading={historyLoading}
        scopeLabel={superadmin ? "All residencies" : `${user.residencyName || "Your assigned residency"} only`}
      />
      {superadmin && selectedAccount && (
        <AccountDetailsDialog
          key={selectedAccount._id}
          account={selectedAccount}
          residencies={residencies}
          subdivisions={subdivisions}
          onSave={updateAccount}
          onClose={() => setSelectedAccount(null)}
        />
      )}
      {superadmin && selectedSettingsAccount && (
        <AccountSettingsDialog
          key={selectedSettingsAccount._id}
          account={selectedSettingsAccount}
          currentUserId={user.id}
          onClose={() => setSelectedSettingsAccount(null)}
          onSaveName={saveAccountName}
          onResetPassword={resetAccountPassword}
          onChangePassword={changeAccountPassword}
          onToggleLock={setAccountLocked}
        />
      )}
      <Footer />
    </main>
  );
}

function App() {
  const [auth, setAuth] = useState(null);
  const [passwordChange, setPasswordChange] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem(tokenKey);
    if (!token) {
      setCheckingSession(false);
      return undefined;
    }
    let active = true;
    api("/auth/me", {}, token)
      .then((result) => {
        if (active) setAuth({ user: result.user, token });
      })
      .catch((error) => {
        localStorage.removeItem(tokenKey);
        if (active) setSessionError(error.message);
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });
    return () => { active = false; };
  }, []);

  function logout() {
    localStorage.removeItem(tokenKey);
    setAuth(null);
    setPasswordChange(null);
  }

  function updateAuthenticatedUser(updates) {
    setAuth((current) => current ? { ...current, user: { ...current.user, ...updates } } : current);
  }

  if (checkingSession) return <main className="page-shell"><div className="empty-state">Loading your community...</div></main>;
  if (auth) return <Dashboard key={auth.user.id} user={auth.user} token={auth.token} onLogout={logout} onUserUpdate={updateAuthenticatedUser} />;
  return (
    <Landing
      passwordChange={passwordChange}
      onPasswordChangeRequired={(token, user) => setPasswordChange({ token, user })}
      onCancelPasswordChange={() => setPasswordChange(null)}
      onAuthenticated={(user, token) => {
        setPasswordChange(null);
        setAuth({ user, token });
      }}
      initialNotice={sessionError}
    />
  );
}

createRoot(document.getElementById("app")).render(<App />);
