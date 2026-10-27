import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const tokenKey = "greenloop-token";
const adminPageLinks = [
  ["admin-overview", "Overview"],
  ["admin-schedules", "Collections"],
  ["admin-requests", "Service requests"],
  ["admin-residents", "Residents"]
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

function ScheduleCard({ schedule }) {
  const date = dateKeyDate(schedule.date);
  return (
    <article className="schedule-card">
      <div className="date-block"><strong>{date.toLocaleDateString(undefined, { day: "2-digit" })}</strong><span>{date.toLocaleDateString(undefined, { month: "short" })}</span></div>
      <div className="schedule-info">
        <span className="status-pill">{schedule.wasteType}</span>
        <h3>{schedule.area}</h3>
        <p>{date.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}{schedule.notes ? ` · ${schedule.notes}` : ""}</p>
      </div>
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

function ScheduleForm({ onSubmit, residencies = [], admin = false, residencyName = "" }) {
  return (
    <form className="inline-form" onSubmit={onSubmit}>
      {admin
        ? <div className="schedule-residency-context"><span>Residency</span><strong>{residencyName || "Your assigned residency"}</strong></div>
        : <label>Residency<select name="residencyId" required defaultValue=""><option value="" disabled>Select residency</option>{residencies.map((residency) => <option key={residency._id} value={residency._id}>{residency.name}</option>)}</select></label>}
      <label>Collection area<input name="area" required maxLength="100" placeholder="e.g. North District" /></label>
      <label>Collection date<input name="date" type="date" required /></label>
      <label>Estimated arrival time<input name="estimatedArrivalTime" type="time" required /></label>
      <label>Waste type<select name="wasteType" required><option value="General waste">General waste</option><option value="Recycling">Recycling</option><option value="Green waste">Green waste</option><option value="Bulk collection">Bulk collection</option></select></label>
      <label>Notes (optional)<input name="notes" maxLength="300" placeholder="Collection details" /></label>
      <button className="button button-dark" type="submit">Publish schedule ↗</button>
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

function RequestCard({ request, onApprove }) {
  return (
    <article className="request-card">
      <div className="request-meta"><span className={`status-pill ${request.status === "pending" ? "status-pending" : ""}`}>{request.status}</span><span>{new Date(request.createdAt).toLocaleDateString()}</span></div>
      <h3>{request.kind === "missed_pickup" ? "Missed pickup" : "Special request"}</h3>
      <p>{request.description}</p>
      <small>From {request.resident.name} · {request.resident.phone}</small>
      {request.status === "approved" && request.scheduledDate && <small>Scheduled for {dateKeyDate(request.scheduledDate).toLocaleDateString()}</small>}
      {request.status === "pending" && (
        <form className="request-approval-form" onSubmit={(event) => {
          event.preventDefault();
          onApprove(request._id, new FormData(event.currentTarget).get("scheduledDate"));
        }}>
          <label>Approved collection date<input type="date" name="scheduledDate" min={localDateKey(new Date())} required /></label>
          <button className="button button-small button-outline" type="submit">Approve request</button>
        </form>
      )}
    </article>
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
  const [adminPage, setAdminPage] = useState(() => {
    const page = window.location.hash.slice(1);
    return adminPageLinks.some(([id]) => id === page) ? page : "admin-overview";
  });
  const admin = user.role === "admin";
  const superadmin = user.role === "superadmin";

  useEffect(() => {
    function syncAdminPage() {
      const page = window.location.hash.slice(1);
      if (adminPageLinks.some(([id]) => id === page)) setAdminPage(page);
    }
    window.addEventListener("hashchange", syncAdminPage);
    return () => window.removeEventListener("hashchange", syncAdminPage);
  }, []);

  async function refreshDashboard() {
    const [scheduleResult, requestResult, userResult, residencyResult] = await Promise.all([
      api("/schedules", {}, token),
      admin || superadmin || user.role === "user" ? api("/requests", {}, token) : Promise.resolve({ requests: [] }),
      admin || superadmin ? api("/users", {}, token) : Promise.resolve({ users: [] }),
      superadmin ? api("/residencies", {}, token) : Promise.resolve({ residencies: [] })
    ]);
    setSchedules(scheduleResult.schedules);
    setRequests(requestResult.requests);
    setUsers(userResult.users);
    setResidencies(residencyResult.residencies);
  }

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [scheduleResult, requestResult, userResult, residencyResult] = await Promise.all([
          api("/schedules", {}, token),
          admin || superadmin || user.role === "user" ? api("/requests", {}, token) : Promise.resolve({ requests: [] }),
          admin || superadmin ? api("/users", {}, token) : Promise.resolve({ users: [] }),
          superadmin ? api("/residencies", {}, token) : Promise.resolve({ residencies: [] })
        ]);
        if (active) {
          setSchedules(scheduleResult.schedules);
          setRequests(requestResult.requests);
          setUsers(userResult.users);
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
          ? "Your request was sent. A confirmation SMS is on its way."
          : `Your request was sent. SMS confirmation was not delivered: ${result.notification.reason}`
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
      await refreshDashboard();
      setNotice({
        message: result.notification.sent
          ? "Request approved and resident notified by SMS."
          : `Request approved. SMS was not sent: ${result.notification.reason}`
      });
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
      <section className="dashboard-heading"><div><div className="eyebrow">{superadmin ? "SYSTEM MANAGEMENT" : admin ? `RESIDENCY ADMINISTRATION${user.residencyName ? ` · ${user.residencyName}` : ""}` : `YOUR NEIGHBORHOOD${user.residencyName ? ` · ${user.residencyName}` : ""}`}</div><h1>{superadmin || admin ? "Good day, " : "Welcome, "}<span>{user.name.split(" ")[0]}.</span></h1><p>{superadmin ? "Manage residencies, administrator accounts, and system-wide operations." : admin ? "Manage residents and collection services for your residency." : "Your collection schedule and community updates, all in one place."}</p></div><div className="heading-stamp">{superadmin ? "✳" : admin ? "✳" : "✦"}</div></section>
      <Notice notice={notice} />
      {admin && (
        <nav className="admin-dashboard-nav" aria-label="Admin dashboard navigation">
          {adminPageLinks.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className={adminPage === id ? "active" : undefined}
              aria-current={adminPage === id ? "page" : undefined}
              onClick={() => setAdminPage(id)}
            >
              {label}{id === "admin-requests" && openRequestCount > 0 && <span>{openRequestCount}</span>}
            </a>
          ))}
        </nav>
      )}
      {superadmin ? (
        <>
          <nav className="admin-section-tabs" aria-label="Superadmin sections">
            {[["overview", "Overview"], ["residencies", "Residencies"], ["accounts", "Accounts"], ["collections", "Collections"]].map(([view, label]) => (
              <button key={view} type="button" className={`admin-section-tab ${superadminView === view ? "active" : ""}`} aria-current={superadminView === view ? "page" : undefined} onClick={() => setSuperadminView(view)}>{label}</button>
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
                  {loading ? <div className="empty-state"><p>Loading schedules...</p></div> : schedules.length ? <div className="schedule-list">{schedules.slice(0, 4).map((schedule) => <ScheduleCard key={schedule._id} schedule={schedule} />)}</div> : <div className="empty-state"><span>▦</span><p>No upcoming collections scheduled.</p></div>}
                </section>
                <section className="panel">
                  <div className="panel-heading"><div><div className="eyebrow">RESIDENT SUPPORT</div><h2>Open requests</h2></div><button className="text-action" type="button" onClick={() => setSuperadminView("collections")}>View all</button></div>
                          {loading ? <div className="empty-state"><p>Loading requests...</p></div> : requests.filter((request) => request.status === "pending").length ? <div className="request-list">{requests.filter((request) => request.status === "pending").slice(0, 3).map((request) => <RequestCard key={request._id} request={request} onApprove={approveRequest} />)}</div> : <div className="empty-state"><span>♡</span><p>No open requests to review.</p></div>}
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
              <div className="panel-heading"><div><div className="eyebrow">ACCESS MANAGEMENT</div><h2>Manage accounts</h2></div><span className="count-badge">{users.length}</span></div>
              <AccountForm onSubmit={createAccount} admin={false} residencies={residencies} />
              {loading ? <div className="empty-state"><p>Loading accounts...</p></div> : users.length ? <div className="resident-list">{users.map((account) => <article key={account._id} className="resident-row"><div><strong>{account.name}</strong><small>{account.email} · {account.phone}</small></div><div className="resident-admin-actions"><select aria-label={`Role for ${account.name}`} value={account.role === "resident" ? "user" : account.role} onChange={(event) => updateAccount(account._id, account.residencyId?._id || account.residencyId, event.target.value)}><option value="admin">Admin</option><option value="user">Resident</option></select><select aria-label={`Residency for ${account.name}`} value={account.residencyId?._id || account.residencyId || ""} onChange={(event) => updateAccount(account._id, event.target.value, account.role === "resident" ? "user" : account.role)}><option value="" disabled>Assign residency</option>{residencies.map((residency) => <option key={residency._id} value={residency._id}>{residency.name}</option>)}</select></div></article>)}</div> : <div className="empty-state"><p>No accounts yet. Create an admin or resident account above.</p></div>}
            </section>
          )}
          {superadminView === "collections" && (
            <section className="superadmin-content dashboard-grid superadmin-operations">
              <div className="panel">
                <div className="panel-heading"><div><div className="eyebrow">COLLECTION CALENDAR</div><h2>Manage collections</h2></div><span className="count-badge">{schedules.length}</span></div>
                <ScheduleForm onSubmit={submitSchedule} residencies={residencies} />
                {loading ? <div className="empty-state"><p>Loading schedules...</p></div> : schedules.length ? <div className="schedule-list">{schedules.map((schedule) => <ScheduleCard key={schedule._id} schedule={schedule} />)}</div> : <div className="empty-state"><span>▦</span><p>No collection schedules have been posted yet.</p></div>}
              </div>
              <div className="panel">
                <div className="panel-heading"><div><div className="eyebrow">RESIDENT SUPPORT</div><h2>Service requests</h2></div><span className="count-badge">{openRequestCount} open</span></div>
                {loading ? <div className="empty-state"><p>Loading requests...</p></div> : requests.length ? <div className="request-list">{requests.map((request) => <RequestCard key={request._id} request={request} onApprove={approveRequest} />)}</div> : <div className="empty-state"><span>♡</span><p>No resident requests yet.</p></div>}
              </div>
            </section>
          )}
        </>
      ) : (
        <>
          <section className={`dashboard-grid${admin ? " admin-operations" : ""}`} id={admin ? "admin-overview" : undefined}>
            {admin ? (
              <div className="panel schedule-panel" id="admin-schedules">
                <div className="panel-heading"><div><div className="eyebrow">COLLECTION CALENDAR</div><h2>Manage collections</h2></div><span className="count-badge">{schedules.length}</span></div>
                <ScheduleForm onSubmit={submitSchedule} admin residencyName={user.residencyName} />
                <div className="schedule-list">
                  {loading ? <div className="empty-state"><p>Loading schedules...</p></div> : schedules.length ? schedules.map((schedule) => <ScheduleCard key={schedule._id} schedule={schedule} />) : <div className="empty-state"><span>▦</span><p>No collection schedules have been posted yet.</p></div>}
                </div>
              </div>
            ) : <ResidentCalendar schedules={schedules} requests={requests} />}
            {admin ? (
              <div className="panel requests-panel" id="admin-requests">
                <div className="panel-heading"><div><div className="eyebrow">RESIDENT SUPPORT</div><h2>Service requests</h2></div><span className="count-badge">{openRequestCount} open</span></div>
                <div className="request-list">{loading ? <div className="empty-state"><p>Loading requests...</p></div> : requests.length ? requests.map((request) => <RequestCard key={request._id} request={request} onApprove={approveRequest} />) : <div className="empty-state"><span>♡</span><p>No resident requests yet.</p></div>}</div>
              </div>
            ) : (
              <div className="panel request-panel">
                <div className="panel-heading"><div><div className="eyebrow">NEED A HAND?</div><h2>Let us know</h2></div><span className="feature-icon">♡</span></div>
                <p className="panel-description">Tell your community team about a missed pickup or a special collection request.</p>
                <form className="form-grid" onSubmit={submitRequest}>
                  <label>Request type<select name="kind"><option value="special_request">Special collection request</option><option value="missed_pickup">Report a missed pickup</option></select></label>
                  <label>Details<textarea name="description" required minLength="8" maxLength="1000" rows="4" placeholder="Share the details so we can help..."></textarea></label>
                  <button className="button button-dark" type="submit" disabled={submitting}>{submitting ? "Sending..." : "Send request ↗"}</button>
                </form>
              </div>
            )}
          </section>
          {admin && <section className="management-grid admin-residents-section" id="admin-residents">
            <div className="panel">
              <div className="panel-heading"><div><div className="eyebrow">RESIDENT DIRECTORY</div><h2>Manage residents</h2></div><span className="count-badge">{users.length}</span></div>
              <AccountForm onSubmit={createAccount} admin residencies={residencies} />
              <div className="resident-list">{users.map((account) => <article key={account._id} className="resident-row"><div><strong>{account.name}</strong><small>{account.email} · {account.phone}</small></div><span className="status-pill">resident</span></article>)}</div>
            </div>
          </section>}
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
