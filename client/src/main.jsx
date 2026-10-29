import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const tokenKey = "greenloop-token";
const adminPageLinks = [
  ["admin-overview", "Overview"],
  ["admin-schedules", "Collections"],
  ["admin-requests", "Request"],
  ["admin-residents", "Residents"]
];
const residentPageLinks = [
  ["resident-calendar", "Calendar"],
  ["resident-requests", "Request"],
  ["resident-mailbox", "Mailbox"]
];

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function ScheduleCard({ schedule, onEdit, onCancel }) {
  const date = dateKeyDate(schedule.date);
  const [editing, setEditing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSubmitting, setActionSubmitting] = useState(false);
  const editDialogRef = useRef(null);
  const cancelDialogRef = useRef(null);

  useEffect(() => {
    const dialog = editDialogRef.current;
    if (!dialog) return;
    if (editing && !dialog.open) dialog.showModal();
    if (!editing && dialog.open) dialog.close();
  }, [editing]);

  useEffect(() => {
    const dialog = cancelDialogRef.current;
    if (!dialog) return;
    if (cancelling && !dialog.open) dialog.showModal();
    if (!cancelling && dialog.open) dialog.close();
  }, [cancelling]);

  function closeEdit() {
    setEditing(false);
    setActionError("");
  }

  function closeCancel() {
    setCancelling(false);
    setCancelReason("");
    setConfirmCancel(false);
    setActionError("");
  }

  async function submitEdit(event) {
    event.preventDefault();
    setActionSubmitting(true);
    const result = await onEdit(schedule._id, Object.fromEntries(new FormData(event.currentTarget)));
    setActionSubmitting(false);
    if (result === true) closeEdit();
    else setActionError(result || "The schedule could not be updated.");
  }

  async function submitCancel() {
    setActionSubmitting(true);
    const result = await onCancel(schedule._id, cancelReason);
    setActionSubmitting(false);
    if (result === true) closeCancel();
    else setActionError(result || "The schedule could not be cancelled.");
  }

  return (
    <article className="schedule-card">
      <div className="date-block"><strong>{date.toLocaleDateString(undefined, { day: "2-digit" })}</strong><span>{date.toLocaleDateString(undefined, { month: "short" })}</span></div>
      <div className="schedule-info">
        <span className={`status-pill${schedule.status === "cancelled" ? " status-declined" : ""}`}>{schedule.status === "cancelled" ? "Cancelled" : schedule.wasteType}</span>
        <h3>{schedule.area}</h3>
        <p>{date.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}{schedule.notes ? ` · ${schedule.notes}` : ""}</p>
        <p>Estimated arrival: {formatArrivalTime(schedule.estimatedArrivalTime)}</p>
        {schedule.status === "cancelled" && <p className="schedule-cancellation-reason"><strong>Cancellation reason:</strong> {schedule.cancellationReason}</p>}
        {schedule.status !== "cancelled" && (onEdit || onCancel) && (
          <div className="schedule-actions">
            {onEdit && <button className="button button-small button-outline" type="button" onClick={() => setEditing(true)}>Edit</button>}
            {onCancel && <button className="button button-small button-delete" type="button" onClick={() => setCancelling(true)}>Cancel collection</button>}
          </div>
        )}
        {schedule.history?.length > 0 && (
          <details className="schedule-history">
            <summary>Change history ({schedule.history.length})</summary>
            <div className="schedule-history-list">
              {schedule.history.slice().reverse().map((entry, index) => (
                <div key={`${entry.changedAt}-${index}`}>
                  <strong>{entry.action === "cancelled" ? "Cancelled" : "Updated"} · {new Date(entry.changedAt).toLocaleString()}</strong>
                  <span>By {entry.changedBy?.name || "Administrator"}</span>
                  {entry.reason && <span>Reason: {entry.reason}</span>}
                  {entry.changes?.map((change) => (
                    <span key={change.field}>{change.field}: {change.from || "—"} → {change.to || "—"}</span>
                  ))}
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
      {onEdit && (
        <dialog ref={editDialogRef} className="schedule-dialog" aria-label="Edit collection schedule" onClose={closeEdit}>
          <div className="request-dialog-heading"><div><div className="eyebrow">UPDATE COLLECTION</div><h2>Edit schedule</h2></div><button className="request-dialog-close" type="button" aria-label="Close dialog" onClick={closeEdit}>×</button></div>
          {actionError && <p className="request-dialog-error" role="alert">{actionError}</p>}
          <ScheduleForm key={`${schedule._id}-${editing}`} onSubmit={submitEdit} schedule={schedule} residencyName={schedule.residencyId?.name || ""} submitting={actionSubmitting} />
          <button className="button button-small button-outline schedule-dialog-cancel" type="button" onClick={closeEdit} disabled={actionSubmitting}>Close</button>
        </dialog>
      )}
      {onCancel && (
        <dialog ref={cancelDialogRef} className="schedule-dialog" aria-labelledby={`cancel-schedule-${schedule._id}`} onClose={closeCancel}>
          <div className="request-dialog-heading"><div><div className="eyebrow">CANCEL COLLECTION</div><h2 id={`cancel-schedule-${schedule._id}`}>{confirmCancel ? "Confirm cancellation" : "Cancel this schedule?"}</h2></div><button className="request-dialog-close" type="button" aria-label="Close dialog" onClick={closeCancel}>×</button></div>
          <p className="request-dialog-summary"><strong>{schedule.wasteType} · {schedule.area}</strong><br />{date.toLocaleDateString(undefined, { dateStyle: "long" })}</p>
          {actionError && <p className="request-dialog-error" role="alert">{actionError}</p>}
          {confirmCancel ? (
            <div className="request-confirmation request-confirmation-decline">
              <p>This collection will be cancelled and residents in this residency will be notified.</p>
              <p><strong>Reason:</strong> {cancelReason}</p>
              <div className="request-dialog-actions">
                <button className="button button-small button-outline" type="button" onClick={() => setConfirmCancel(false)} disabled={actionSubmitting}>Go back</button>
                <button className="button button-small button-delete" type="button" onClick={submitCancel} disabled={actionSubmitting}>{actionSubmitting ? "Cancelling..." : "Confirm cancellation"}</button>
              </div>
            </div>
          ) : (
            <form className="request-dialog-form" onSubmit={(event) => { event.preventDefault(); setConfirmCancel(true); }}>
              <label>Reason for cancellation<textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} rows="4" maxLength="500" required placeholder="Explain why this collection is being cancelled" /></label>
              <div className="request-dialog-actions">
                <button className="button button-small button-outline" type="button" onClick={closeCancel}>Keep schedule</button>
                <button className="button button-small button-delete" type="submit">Continue</button>
              </div>
            </form>
          )}
        </dialog>
      )}
    </article>
  );
}

function ResidentCalendar({ schedules, requests }) {
  const today = new Date();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(localDateKey(today));
  const eventsByDate = new Map();
  schedules.forEach((schedule) => {
    const dateKey = schedule.date.slice(0, 10);
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
        {dayEvents.length ? dayEvents.map((event) => event.type === "collection" ? (
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
          </article>
        )) : <p className="calendar-no-events">No collections or approved requests for this day.</p>}
      </div>
    </section>
  );
}

function ScheduleForm({ onSubmit, residencies = [], admin = false, residencyName = "", schedule = null, submitting = false }) {
  return (
    <form className="inline-form" onSubmit={onSubmit}>
      {!schedule && (admin
        ? <div className="schedule-residency-context"><span>Residency</span><strong>{residencyName || "Your assigned residency"}</strong></div>
        : <label>Residency<select name="residencyId" required defaultValue=""><option value="" disabled>Select residency</option>{residencies.map((residency) => <option key={residency._id} value={residency._id}>{residency.name}</option>)}</select></label>)}
      <label>Collection area<input name="area" required maxLength="100" placeholder="e.g. North District" defaultValue={schedule?.area || ""} /></label>
      <label>Collection date<input name="date" type="date" required defaultValue={schedule?.date?.slice(0, 10) || ""} /></label>
      <label>Estimated arrival time<input name="estimatedArrivalTime" type="time" required defaultValue={schedule?.estimatedArrivalTime || ""} /></label>
      <label>Waste type<select name="wasteType" required defaultValue={schedule?.wasteType || "General waste"}><option value="General waste">General waste</option><option value="Recycling">Recycling</option><option value="Green waste">Green waste</option><option value="Bulk collection">Bulk collection</option></select></label>
      <label>Notes (optional)<input name="notes" maxLength="300" placeholder="Collection details" defaultValue={schedule?.notes || ""} /></label>
      <button className="button button-dark" type="submit" disabled={submitting}>{submitting ? "Saving..." : schedule ? "Save changes" : "Publish schedule ↗"}</button>
    </form>
  );
}

function AccountForm({ onSubmit, admin, residencies }) {
  return (
    <form className="form-grid management-form" onSubmit={onSubmit}>
      {admin && <input type="hidden" name="role" value="user" />}
      <label>Full name<input name="name" required minLength="2" maxLength="80" /></label>
      <label>Email address<input name="email" type="email" required maxLength="254" /></label>
      <label>Phone number<input name="phone" type="tel" required placeholder="+639171234567" /><small>Use Philippine mobile format beginning with +639.</small></label>
      {!admin && <label>Account type<select name="role"><option value="admin">Residency admin</option><option value="user">Resident</option></select></label>}
      {!admin && <label>Residency<select name="residencyId" required defaultValue=""><option value="" disabled>Select residency</option>{residencies.map((residency) => <option key={residency._id} value={residency._id}>{residency.name}</option>)}</select></label>}
      <button className="button button-dark" type="submit">Create {admin ? "resident" : "account"} ↗</button>
      <p className="form-footnote management-password-note">Temporary password: <strong>11111111</strong>. They must create a new password before accessing the dashboard.</p>
    </form>
  );
}

function Pagination({ pagination, onPageChange }) {
  const { page, pages, total, limit } = pagination;
  const firstItem = total ? (page - 1) * limit + 1 : 0;
  const lastItem = Math.min(page * limit, total);
  return (
    <div className="pagination" aria-label="List pages">
      <span>{firstItem}–{lastItem} of {total}</span>
      <div>
        <button className="button button-small button-outline" type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>Previous</button>
        <span>Page {pages ? page : 0} of {pages}</span>
        <button className="button button-small button-outline" type="button" onClick={() => onPageChange(page + 1)} disabled={!pages || page >= pages}>Next</button>
      </div>
    </div>
  );
}

function RequestFilters({ filters, searchInput, onSearchInput, onChange, onApply, onReset }) {
  return (
    <form className="list-filters request-filters" onSubmit={(event) => { event.preventDefault(); onApply(); }}>
      <label>Resident search<input value={searchInput} onChange={(event) => onSearchInput(event.target.value)} maxLength="80" placeholder="Name, email, or phone prefix" /></label>
      <label>Status<select value={filters.status} onChange={(event) => onChange("status", event.target.value)}><option value="">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="declined">Declined</option><option value="reviewed">Reviewed</option></select></label>
      <label>Request type<select value={filters.kind} onChange={(event) => onChange("kind", event.target.value)}><option value="">All types</option><option value="missed_pickup">Missed pickup</option><option value="special_request">Special request</option></select></label>
      <label>From<input type="date" value={filters.from} onChange={(event) => onChange("from", event.target.value)} /></label>
      <label>To<input type="date" value={filters.to} onChange={(event) => onChange("to", event.target.value)} /></label>
      <label>Sort<select value={filters.sort} onChange={(event) => onChange("sort", event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
      <div className="list-filter-actions">
        <button className="button button-small button-dark" type="submit">Apply filters</button>
        <button className="button button-small button-outline" type="button" onClick={onReset}>Clear</button>
      </div>
    </form>
  );
}

function AccountFilters({ searchInput, onSearchInput, role, onRoleChange, residencyId, onResidencyChange, residencies, admin, onApply, onReset }) {
  return (
    <form className="list-filters account-filters" onSubmit={(event) => { event.preventDefault(); onApply(); }}>
      <label>Search accounts<input value={searchInput} onChange={(event) => onSearchInput(event.target.value)} maxLength="80" placeholder="Name, email, or phone prefix" /></label>
      {!admin && <label>Role<select value={role} onChange={(event) => onRoleChange(event.target.value)}><option value="">All roles</option><option value="admin">Admins</option><option value="user">Residents</option></select></label>}
      {!admin && <label>Residency<select value={residencyId} onChange={(event) => onResidencyChange(event.target.value)}><option value="">All residencies</option>{residencies.map((residency) => <option key={residency._id} value={residency._id}>{residency.name}</option>)}</select></label>}
      <div className="list-filter-actions">
        <button className="button button-small button-dark" type="submit">Search</button>
        <button className="button button-small button-outline" type="button" onClick={onReset}>Clear</button>
      </div>
    </form>
  );
}

function RequestCard({ request, onApprove, onDecline }) {
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
      ? await onApprove(request._id, confirmation.scheduledDate)
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
      {request.status === "approved" && request.scheduledDate && <small>Scheduled for {dateKeyDate(request.scheduledDate).toLocaleDateString()}</small>}
      {request.status === "declined" && request.declineReason && <p className="request-decline-reason"><strong>Reason:</strong> {request.declineReason}</p>}
      {request.reviewedAt && <small>Reviewed by {request.reviewedBy?.name || "administrator"} · {new Date(request.reviewedAt).toLocaleString()}</small>}
      {request.status === "pending" && (
        <div className="request-review-actions">
          <button className="button button-small button-outline" type="button" onClick={() => { setDecisionError(""); setDecision("approve"); }}>Approve</button>
          <button className="button button-small button-delete" type="button" onClick={() => { setDecisionError(""); setDecision("decline"); }}>Decline</button>
        </div>
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
                    ? `Approve this request and schedule collection for ${dateKeyDate(confirmation.scheduledDate).toLocaleDateString()}?`
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
                  ? { type: "approve", scheduledDate: data.get("scheduledDate") }
                  : { type: "decline", declineReason: data.get("declineReason") });
              }}>
                {decision === "approve"
                  ? <label>Approved collection date<input type="date" name="scheduledDate" min={localDateKey(new Date())} required autoFocus /></label>
                  : <label>Reason for declining<textarea name="declineReason" rows="4" maxLength="500" required autoFocus placeholder="Explain why this request cannot be approved" /></label>}
                <p className="request-dialog-hint">You will be asked to confirm before this decision is sent to the resident.</p>
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

function RequestMailbox({ requests, pagination, onPageChange }) {
  return (
    <section className="panel request-mailbox" id="resident-mailbox">
      <div className="panel-heading">
        <div><div className="eyebrow">YOUR REQUEST UPDATES</div><h2>Request mailbox</h2></div>
        <span className="count-badge">{pagination?.total ?? requests.length}</span>
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
                <p className="mailbox-update">
                  Your request was approved{request.scheduledDate ? ` for ${dateKeyDate(request.scheduledDate).toLocaleDateString()}` : ""}.
                </p>
              )}
              {request.status === "declined" && <p className="request-decline-reason"><strong>Admin's reason:</strong> {request.declineReason || "No reason was provided."}</p>}
              {request.reviewedAt && <p className="mailbox-update">Reviewed {new Date(request.reviewedAt).toLocaleDateString()}{request.reviewedBy?.name ? ` by ${request.reviewedBy.name}` : ""}.</p>}
              {request.status === "reviewed" && <p className="mailbox-update">Your request has been reviewed.</p>}
            </article>
          ))}
        </div>
      ) : <div className="empty-state"><p>Your submitted requests and their updates will appear here.</p></div>}
      {pagination && onPageChange && pagination.pages > 1 && <Pagination pagination={pagination} onPageChange={onPageChange} />}
    </section>
  );
}

function ResidentRequestPanel({ onSubmit, submitting }) {
  return (
    <div className="panel request-panel">
      <div className="panel-heading"><div><div className="eyebrow">NEED A HAND?</div><h2>Let us know</h2></div><span className="feature-icon">♡</span></div>
      <p className="panel-description">Tell your community team about a missed pickup or a special collection request.</p>
      <form className="form-grid" onSubmit={onSubmit}>
        <label>Request type<select name="kind"><option value="special_request">Special collection request</option><option value="missed_pickup">Report a missed pickup</option></select></label>
        <label>Details<textarea name="description" required maxLength="1000" rows="4" placeholder="Share the details so we can help..."></textarea></label>
        <button className="button button-dark" type="submit" disabled={submitting}>{submitting ? "Sending..." : "Send request ↗"}</button>
      </form>
    </div>
  );
}

function Dashboard({ user, token, onLogout }) {
  const [schedules, setSchedules] = useState([]);
  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [residencies, setResidencies] = useState([]);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [superadminView, setSuperadminView] = useState("overview");
  const [residentPage, setResidentPage] = useState("resident-calendar");
  const [openRequestCount, setOpenRequestCount] = useState(0);
  const [accountPagination, setAccountPagination] = useState({ page: 1, limit: 25, total: 0, pages: 0 });
  const [accountCounts, setAccountCounts] = useState({ admins: 0, residents: 0 });
  const [accountPage, setAccountPage] = useState(1);
  const [accountSearchInput, setAccountSearchInput] = useState("");
  const [accountSearch, setAccountSearch] = useState("");
  const [accountRole, setAccountRole] = useState("");
  const [accountResidencyId, setAccountResidencyId] = useState("");
  const [accountLoading, setAccountLoading] = useState(false);
  const [requestPageData, setRequestPageData] = useState([]);
  const [requestPagination, setRequestPagination] = useState({ page: 1, limit: 25, total: 0, pages: 0 });
  const [requestPage, setRequestPage] = useState(1);
  const [requestFilters, setRequestFilters] = useState({ status: "", kind: "", from: "", to: "", search: "", sort: "newest" });
  const [requestFilterDraft, setRequestFilterDraft] = useState({ status: "", kind: "", from: "", to: "", sort: "newest" });
  const [requestSearchInput, setRequestSearchInput] = useState("");
  const [requestListLoading, setRequestListLoading] = useState(false);
  const [mailboxRequests, setMailboxRequests] = useState([]);
  const [mailboxPagination, setMailboxPagination] = useState({ page: 1, limit: 25, total: 0, pages: 0 });
  const [mailboxPage, setMailboxPage] = useState(1);
  const accountLoadVersion = useRef(0);
  const requestLoadVersion = useRef(0);
  const mailboxLoadVersion = useRef(0);
  const [adminPage, setAdminPage] = useState(() => {
    const page = window.location.hash.slice(1);
    return adminPageLinks.some(([id]) => id === page) ? page : "admin-schedules";
  });
  const admin = user.role === "admin";
  const superadmin = user.role === "superadmin";
  const adminRequestView = (admin && adminPage === "admin-requests") || (superadmin && superadminView === "requests");
  const accountListView = (admin && adminPage === "admin-residents") || (superadmin && superadminView === "accounts");
  const mailboxView = user.role === "user" && residentPage === "resident-mailbox";

  function queryString(values) {
    const params = new URLSearchParams();
    Object.entries(values).forEach(([key, value]) => {
      if (value !== "" && value !== undefined && value !== null) params.set(key, value);
    });
    return params.toString();
  }

  async function loadAccounts(page = accountPage, search = accountSearch, role = accountRole, residencyId = accountResidencyId) {
    const loadVersion = ++accountLoadVersion.current;
    setAccountLoading(true);
    try {
      const query = queryString({ page, limit: 25, search, role, residencyId });
      const result = await api(`/users?${query}`, {}, token);
      if (loadVersion !== accountLoadVersion.current) return;
      if (page > Math.max(1, result.pagination.pages)) {
        setAccountPage(Math.max(1, result.pagination.pages));
        return;
      }
      setUsers(result.users);
      setAccountPagination(result.pagination);
      setAccountCounts(result.counts);
    } catch (error) {
      if (loadVersion === accountLoadVersion.current) setNotice({ message: error.message, isError: true });
    } finally {
      if (loadVersion === accountLoadVersion.current) setAccountLoading(false);
    }
  }

  async function loadAdminRequests(page = requestPage, filters = requestFilters) {
    const loadVersion = ++requestLoadVersion.current;
    setRequestListLoading(true);
    try {
      const query = queryString({ ...filters, page, limit: 25 });
      const result = await api(`/requests?${query}`, {}, token);
      if (loadVersion !== requestLoadVersion.current) return;
      if (page > Math.max(1, result.pagination.pages)) {
        setRequestPage(Math.max(1, result.pagination.pages));
        return;
      }
      setRequestPageData(result.requests);
      setRequestPagination(result.pagination);
      setOpenRequestCount(result.counts.pending);
    } catch (error) {
      if (loadVersion === requestLoadVersion.current) setNotice({ message: error.message, isError: true });
    } finally {
      if (loadVersion === requestLoadVersion.current) setRequestListLoading(false);
    }
  }

  async function loadMailbox(page = mailboxPage) {
    const loadVersion = ++mailboxLoadVersion.current;
    try {
      const result = await api(`/requests?${queryString({ page, limit: 25, sort: "newest" })}`, {}, token);
      if (loadVersion !== mailboxLoadVersion.current) return;
      setMailboxRequests(result.requests);
      setMailboxPagination(result.pagination);
    } catch (error) {
      if (loadVersion === mailboxLoadVersion.current) setNotice({ message: error.message, isError: true });
    }
  }

  async function refreshDashboard() {
    const requestPath = admin || superadmin
      ? "/requests?status=pending&limit=3&sort=oldest"
      : "/requests?status=approved&limit=100&sort=scheduled";
    const [scheduleResult, requestResult, userResult, residencyResult] = await Promise.all([
      api(admin || superadmin ? "/schedules?includeHistory=true" : "/schedules", {}, token),
      user.role === "user" || admin || superadmin ? api(requestPath, {}, token) : Promise.resolve({ requests: [], counts: { pending: 0 } }),
      admin || superadmin ? api(`/users?${queryString({ page: accountPage, limit: 25, search: accountSearch, role: accountRole, residencyId: accountResidencyId })}`, {}, token) : Promise.resolve({ users: [], pagination: accountPagination, counts: accountCounts }),
      superadmin ? api("/residencies", {}, token) : Promise.resolve({ residencies: [] })
    ]);
    setSchedules(scheduleResult.schedules);
    setRequests(requestResult.requests);
    setOpenRequestCount(requestResult.counts.pending);
    setUsers(userResult.users);
    setAccountPagination(userResult.pagination);
    setAccountCounts(userResult.counts);
    setResidencies(residencyResult.residencies);
    if (adminRequestView) await loadAdminRequests();
    if (mailboxView) await loadMailbox();
  }

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const requestPath = admin || superadmin
          ? "/requests?status=pending&limit=3&sort=oldest"
          : "/requests?status=approved&limit=100&sort=scheduled";
        const [scheduleResult, requestResult, userResult, residencyResult] = await Promise.all([
          api(admin || superadmin ? "/schedules?includeHistory=true" : "/schedules", {}, token),
          admin || superadmin || user.role === "user" ? api(requestPath, {}, token) : Promise.resolve({ requests: [], counts: { pending: 0 } }),
          admin || superadmin ? api("/users?page=1&limit=25", {}, token) : Promise.resolve({ users: [], pagination: { page: 1, limit: 25, total: 0, pages: 0 }, counts: { admins: 0, residents: 0 } }),
          superadmin ? api("/residencies", {}, token) : Promise.resolve({ residencies: [] })
        ]);
        if (active) {
          setSchedules(scheduleResult.schedules);
          setRequests(requestResult.requests);
          setOpenRequestCount(requestResult.counts.pending);
          setUsers(userResult.users);
          setAccountPagination(userResult.pagination);
          setAccountCounts(userResult.counts);
          setResidencies(residencyResult.residencies);
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
    if (adminRequestView) loadAdminRequests(requestPage, requestFilters);
  }, [adminRequestView, requestPage, requestFilters, token]);

  useEffect(() => {
    if (accountListView) loadAccounts(accountPage, accountSearch, accountRole, accountResidencyId);
  }, [accountListView, accountPage, accountSearch, accountRole, accountResidencyId, token]);

  useEffect(() => {
    if (mailboxView) loadMailbox(mailboxPage);
  }, [mailboxView, mailboxPage, token]);

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
        ? `Schedule published and SMS sent to ${notification.delivered} resident(s).`
        : notification.delivered
          ? `Schedule published. SMS reached ${notification.delivered} resident(s); ${notification.reason}`
          : `Schedule published. SMS was not sent: ${notification.reason}`;
      setNotice({ message });
      form.reset();
    } catch (error) {
      setNotice({ message: error.message, isError: true });
    } finally {
      setSubmitting(false);
    }
  }

  async function updateSchedule(id, data) {
    setNotice(null);
    try {
      const result = await api(`/schedules/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(data)
      }, token);
      let refreshError;
      try {
        await refreshDashboard();
      } catch (error) {
        refreshError = error;
      }
      const message = result.notification.sent
          ? `Schedule updated and SMS sent to ${result.notification.delivered} resident(s).`
          : `Schedule updated. SMS notification was not sent: ${result.notification.reason}`;
      setNotice({ message: refreshError ? `${message} Dashboard refresh failed: ${refreshError.message}` : message, isError: Boolean(refreshError) });
      return true;
    } catch (error) {
      setNotice({ message: error.message, isError: true });
      return error.message;
    }
  }

  async function cancelSchedule(id, reason) {
    setNotice(null);
    try {
      const result = await api(`/schedules/${encodeURIComponent(id)}/cancel`, {
        method: "PATCH",
        body: JSON.stringify({ reason })
      }, token);
      let refreshError;
      try {
        await refreshDashboard();
      } catch (error) {
        refreshError = error;
      }
      const message = result.notification.sent
          ? `Schedule cancelled and SMS sent to ${result.notification.delivered} resident(s).`
          : `Schedule cancelled. SMS notification was not sent: ${result.notification.reason}`;
      setNotice({ message: refreshError ? `${message} Dashboard refresh failed: ${refreshError.message}` : message, isError: Boolean(refreshError) });
      return true;
    } catch (error) {
      setNotice({ message: error.message, isError: true });
      return error.message;
    }
  }

  async function submitRequest(event) {
    event.preventDefault();
    setSubmitting(true);
    setNotice(null);
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    try {
      const result = await api("/requests", { method: "POST", body: JSON.stringify(data) }, token);
      await refreshDashboard();
      setNotice({
        message: result.notification.sent
          ? "Your request was submitted and is pending review. It has not been approved yet. A confirmation SMS is on its way."
          : `Your request was submitted and is pending review. It has not been approved yet. SMS confirmation was not delivered: ${result.notification.reason}`
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

  async function updateAccount(id, residencyId, role) {
    try {
      await api(`/users/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ residencyId, role })
      }, token);
      await refreshDashboard();
      setNotice({ message: "Account updated. If the role changed, the account holder must use the temporary password and set a new one." });
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

  async function approveRequest(id, scheduledDate) {
    setNotice(null);
    try {
      const result = await api(`/requests/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "approved", scheduledDate })
      }, token);
      let refreshError;
      try {
        await refreshDashboard();
      } catch (error) {
        refreshError = error;
      }
      const message = result.notification.sent
          ? "Request approved and resident notified by SMS."
          : `Request approved. SMS was not sent: ${result.notification.reason}`;
      setNotice({ message: refreshError ? `${message} Dashboard refresh failed: ${refreshError.message}` : message, isError: Boolean(refreshError) });
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
      let refreshError;
      try {
        await refreshDashboard();
      } catch (error) {
        refreshError = error;
      }
      const message = result.notification.sent
          ? "Request declined and resident notified by SMS."
          : `Request declined. SMS was not sent: ${result.notification.reason}`;
      setNotice({ message: refreshError ? `${message} Dashboard refresh failed: ${refreshError.message}` : message, isError: Boolean(refreshError) });
      return true;
    } catch (error) {
      setNotice({ message: error.message, isError: true });
      return error.message;
    }
  }

  const adminCount = accountCounts.admins;
  const residentCount = accountCounts.residents;

  return (
    <main className="dashboard-shell">
      <nav className="topbar"><Brand /><div className="user-nav"><span className="role-chip">{superadmin ? "SUPERADMIN" : admin ? "ADMIN" : "RESIDENT"}</span><span className="user-name">{user.name}</span><button className="button button-outline" type="button" onClick={onLogout}>Sign out</button></div></nav>
      <section className="dashboard-heading"><div><div className="eyebrow">{superadmin ? "SYSTEM MANAGEMENT" : admin ? `RESIDENCY ADMINISTRATION${user.residencyName ? ` · ${user.residencyName}` : ""}` : `YOUR NEIGHBORHOOD${user.residencyName ? ` · ${user.residencyName}` : ""}`}</div><h1>{superadmin || admin ? "Good day, " : "Welcome, "}<span>{user.name.split(" ")[0]}.</span></h1><p>{superadmin ? "Manage residencies, administrator accounts, and system-wide operations." : admin ? "Manage residents and collection services for your residency." : "Your collection schedule and community updates, all in one place."}</p></div><div className="heading-stamp">{superadmin ? "✳" : admin ? "✳" : "✦"}</div></section>
      <Notice notice={notice} />
      {!superadmin && (
        <nav className={`dashboard-tabs${admin ? "" : " resident-dashboard-tabs"}`} aria-label={`${admin ? "Admin" : "Resident"} dashboard navigation`}>
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
          <nav className="dashboard-tabs" aria-label="Superadmin sections">
            {[["overview", "Overview"], ["residencies", "Residencies"], ["accounts", "Accounts"], ["collections", "Collections"], ["requests", "Request"]].map(([view, label]) => (
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
                  {loading ? <div className="empty-state"><p>Loading schedules...</p></div> : schedules.filter((schedule) => schedule.status !== "cancelled").length ? <div className="schedule-list">{schedules.filter((schedule) => schedule.status !== "cancelled").slice(0, 4).map((schedule) => <ScheduleCard key={schedule._id} schedule={schedule} onEdit={updateSchedule} onCancel={cancelSchedule} />)}</div> : <div className="empty-state"><span>▦</span><p>No upcoming collections scheduled.</p></div>}
                </section>
                <section className="panel">
                  <div className="panel-heading"><div><div className="eyebrow">RESIDENT SUPPORT</div><h2>Open requests</h2></div><button className="text-action" type="button" onClick={() => setSuperadminView("requests")}>View all</button></div>
                          {loading ? <div className="empty-state"><p>Loading requests...</p></div> : requests.filter((request) => request.status === "pending").length ? <div className="request-list">{requests.filter((request) => request.status === "pending").slice(0, 3).map((request) => <RequestCard key={request._id} request={request} onApprove={approveRequest} onDecline={declineRequest} />)}</div> : <div className="empty-state"><span>♡</span><p>No open requests to review.</p></div>}
                </section>
              </div>
            </section>
          )}
          {superadminView === "residencies" && (
            <section className="superadmin-content panel">
              <div className="panel-heading"><div><div className="eyebrow">SYSTEM SETUP</div><h2>Manage residencies</h2></div><span className="count-badge">{residencies.length}</span></div>
              <form className="residency-create-form" onSubmit={createResidency}>
                <label>Residency name<input name="name" required minLength="2" maxLength="100" placeholder="Enter a residency name" /></label>
                <button className="button button-dark" type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create residency"}</button>
              </form>
              {loading ? <div className="empty-state"><p>Loading residencies...</p></div> : residencies.length ? <div className="resident-list">{residencies.map((residency) => <article key={residency._id} className="resident-row"><div><strong>{residency.name}</strong><small>{residency.active ? "Active" : "Inactive"}</small></div><button type="button" className="button button-small button-outline" onClick={() => toggleResidency(residency)}>{residency.active ? "Deactivate" : "Activate"}</button></article>)}</div> : <div className="empty-state"><p>No residencies yet. Create one to get started.</p></div>}
            </section>
          )}
          {superadminView === "accounts" && (
            <section className="superadmin-content panel">
              <div className="panel-heading"><div><div className="eyebrow">ACCESS MANAGEMENT</div><h2>Manage accounts</h2></div><span className="count-badge">{accountPagination.total}</span></div>
              <AccountForm onSubmit={createAccount} admin={false} residencies={residencies} />
              <AccountFilters
                searchInput={accountSearchInput}
                onSearchInput={setAccountSearchInput}
                role={accountRole}
                onRoleChange={(value) => { setAccountRole(value); setAccountPage(1); }}
                residencyId={accountResidencyId}
                onResidencyChange={(value) => { setAccountResidencyId(value); setAccountPage(1); }}
                residencies={residencies}
                admin={false}
                onApply={() => { setAccountSearch(accountSearchInput.trim()); setAccountPage(1); }}
                onReset={() => { setAccountSearchInput(""); setAccountSearch(""); setAccountRole(""); setAccountResidencyId(""); setAccountPage(1); }}
              />
              {accountLoading ? <div className="empty-state"><p>Loading accounts...</p></div> : users.length ? <div className="resident-list">{users.map((account) => <article key={account._id} className="resident-row"><div><strong>{account.name}</strong><small>{account.email} · {account.phone}</small></div><div className="resident-admin-actions"><select aria-label={`Role for ${account.name}`} value={account.role === "resident" ? "user" : account.role} onChange={(event) => updateAccount(account._id, account.residencyId?._id || account.residencyId, event.target.value)}><option value="admin">Admin</option><option value="user">Resident</option></select><select aria-label={`Residency for ${account.name}`} value={account.residencyId?._id || account.residencyId || ""} onChange={(event) => updateAccount(account._id, event.target.value, account.role === "resident" ? "user" : account.role)}><option value="" disabled>Assign residency</option>{residencies.map((residency) => <option key={residency._id} value={residency._id}>{residency.name}</option>)}</select></div></article>)}</div> : <div className="empty-state"><p>No accounts match these filters.</p></div>}
              <Pagination pagination={accountPagination} onPageChange={setAccountPage} />
            </section>
          )}
          {superadminView === "collections" && (
            <section className="superadmin-content superadmin-operations">
              <div className="panel">
                <div className="panel-heading"><div><div className="eyebrow">COLLECTION CALENDAR</div><h2>Manage collections</h2></div><span className="count-badge">{schedules.length}</span></div>
                <ScheduleForm onSubmit={submitSchedule} residencies={residencies} />
                {loading ? <div className="empty-state"><p>Loading schedules...</p></div> : schedules.length ? <div className="schedule-list">{schedules.map((schedule) => <ScheduleCard key={schedule._id} schedule={schedule} onEdit={updateSchedule} onCancel={cancelSchedule} />)}</div> : <div className="empty-state"><span>▦</span><p>No collection schedules have been posted yet.</p></div>}
              </div>
            </section>
          )}
          {superadminView === "requests" && (
            <section className="panel admin-request-content">
              <div className="panel-heading"><div><div className="eyebrow">RESIDENT SUPPORT</div><h2>Service requests</h2></div><span className="count-badge">{openRequestCount} open</span></div>
              <RequestFilters
                filters={requestFilterDraft}
                searchInput={requestSearchInput}
                onSearchInput={setRequestSearchInput}
                onChange={(field, value) => setRequestFilterDraft((current) => ({ ...current, [field]: value }))}
                onApply={() => {
                  setRequestFilters({ ...requestFilterDraft, search: requestSearchInput.trim() });
                  setRequestPage(1);
                }}
                onReset={() => {
                  const defaults = { status: "", kind: "", from: "", to: "", sort: "newest" };
                  setRequestFilterDraft(defaults);
                  setRequestSearchInput("");
                  setRequestFilters({ ...defaults, search: "" });
                  setRequestPage(1);
                }}
              />
              {requestListLoading ? <div className="empty-state"><p>Loading requests...</p></div> : requestPageData.length ? <div className="request-list">{requestPageData.map((request) => <RequestCard key={request._id} request={request} onApprove={approveRequest} onDecline={declineRequest} />)}</div> : <div className="empty-state"><span>♡</span><p>No requests match these filters.</p></div>}
              <Pagination pagination={requestPagination} onPageChange={setRequestPage} />
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
                  {loading ? <div className="empty-state"><p>Loading schedules...</p></div> : schedules.filter((schedule) => schedule.status !== "cancelled").length ? <div className="schedule-list">{schedules.filter((schedule) => schedule.status !== "cancelled").slice(0, 4).map((schedule) => <ScheduleCard key={schedule._id} schedule={schedule} onEdit={updateSchedule} onCancel={cancelSchedule} />)}</div> : <div className="empty-state"><span>▦</span><p>No collection schedules have been posted yet.</p></div>}
                </section>
                <section className="panel">
                  <div className="panel-heading"><div><div className="eyebrow">RESIDENT SUPPORT</div><h2>Open requests</h2></div><button className="text-action" type="button" onClick={() => setAdminPage("admin-requests")}>View all</button></div>
                  {loading ? <div className="empty-state"><p>Loading requests...</p></div> : requests.filter((request) => request.status === "pending").length ? <div className="request-list">{requests.filter((request) => request.status === "pending").slice(0, 3).map((request) => <RequestCard key={request._id} request={request} onApprove={approveRequest} onDecline={declineRequest} />)}</div> : <div className="empty-state"><span>♡</span><p>No open requests to review.</p></div>}
                </section>
              </div>
            </section>
          )}
          {adminPage === "admin-schedules" && (
            <section className="panel admin-operations schedule-panel">
              <div className="panel-heading"><div><div className="eyebrow">COLLECTION CALENDAR</div><h2>Manage collections</h2></div><span className="count-badge">{schedules.length}</span></div>
              <ScheduleForm onSubmit={submitSchedule} admin residencyName={user.residencyName} />
              <div className="schedule-list">
                {loading ? <div className="empty-state"><p>Loading schedules...</p></div> : schedules.length ? schedules.map((schedule) => <ScheduleCard key={schedule._id} schedule={schedule} onEdit={updateSchedule} onCancel={cancelSchedule} />) : <div className="empty-state"><span>▦</span><p>No collection schedules have been posted yet.</p></div>}
              </div>
            </section>
          )}
          {adminPage === "admin-requests" && (
            <section className="panel admin-request-content">
              <div className="panel-heading"><div><div className="eyebrow">RESIDENT SUPPORT</div><h2>Service requests</h2></div><span className="count-badge">{openRequestCount} open</span></div>
              <RequestFilters
                filters={requestFilterDraft}
                searchInput={requestSearchInput}
                onSearchInput={setRequestSearchInput}
                onChange={(field, value) => setRequestFilterDraft((current) => ({ ...current, [field]: value }))}
                onApply={() => {
                  setRequestFilters({ ...requestFilterDraft, search: requestSearchInput.trim() });
                  setRequestPage(1);
                }}
                onReset={() => {
                  const defaults = { status: "", kind: "", from: "", to: "", sort: "newest" };
                  setRequestFilterDraft(defaults);
                  setRequestSearchInput("");
                  setRequestFilters({ ...defaults, search: "" });
                  setRequestPage(1);
                }}
              />
              {requestListLoading ? <div className="empty-state"><p>Loading requests...</p></div> : requestPageData.length ? <div className="request-list">{requestPageData.map((request) => <RequestCard key={request._id} request={request} onApprove={approveRequest} onDecline={declineRequest} />)}</div> : <div className="empty-state"><span>♡</span><p>No requests match these filters.</p></div>}
              <Pagination pagination={requestPagination} onPageChange={setRequestPage} />
            </section>
          )}
          {adminPage === "admin-residents" && (
            <section className="management-grid admin-residents-section">
              <div className="panel">
                <div className="panel-heading"><div><div className="eyebrow">RESIDENT DIRECTORY</div><h2>Manage residents</h2></div><span className="count-badge">{accountPagination.total}</span></div>
                <AccountForm onSubmit={createAccount} admin residencies={residencies} />
                <AccountFilters
                  searchInput={accountSearchInput}
                  onSearchInput={setAccountSearchInput}
                  role=""
                  onRoleChange={() => {}}
                  residencyId=""
                  onResidencyChange={() => {}}
                  residencies={[]}
                  admin
                  onApply={() => { setAccountSearch(accountSearchInput.trim()); setAccountPage(1); }}
                  onReset={() => { setAccountSearchInput(""); setAccountSearch(""); setAccountPage(1); }}
                />
                {accountLoading ? <div className="empty-state"><p>Loading residents...</p></div> : users.length ? <div className="resident-list">{users.map((account) => <article key={account._id} className="resident-row"><div><strong>{account.name}</strong><small>{account.email} · {account.phone}</small></div><span className="status-pill">resident</span></article>)}</div> : <div className="empty-state"><p>No residents match this search.</p></div>}
                <Pagination pagination={accountPagination} onPageChange={setAccountPage} />
              </div>
            </section>
          )}
        </>
      ) : (
        <>
          {residentPage === "resident-calendar" && <ResidentCalendar schedules={schedules} requests={requests} />}
          {residentPage === "resident-requests" && (
            <section className="resident-request-page">
              <ResidentRequestPanel onSubmit={submitRequest} submitting={submitting} />
            </section>
          )}
          {residentPage === "resident-mailbox" && <RequestMailbox requests={mailboxRequests} pagination={mailboxPagination} onPageChange={setMailboxPage} />}
        </>
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

  if (checkingSession) return <main className="page-shell"><div className="empty-state">Loading your community...</div></main>;
  if (auth) return <Dashboard key={auth.user.id} user={auth.user} token={auth.token} onLogout={logout} />;
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
