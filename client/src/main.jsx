import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const tokenKey = "greenloop-token";

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

function Landing({ onAuthenticated, initialNotice = null }) {
  const [mode, setMode] = useState("login");
  const [loginAs, setLoginAs] = useState("user");
  const [residencies, setResidencies] = useState([]);
  const [notice, setNotice] = useState(initialNotice ? { message: initialNotice, isError: true } : null);
  const [submitting, setSubmitting] = useState(false);
  const registering = mode === "register";

  useEffect(() => {
    api("/auth/residencies", {}, null)
      .then((result) => setResidencies(result.residencies))
      .catch((error) => setNotice({ message: error.message, isError: true }));
  }, []);

  async function submitAuth(event) {
    event.preventDefault();
    setSubmitting(true);
    setNotice(null);
    const data = Object.fromEntries(new FormData(event.currentTarget));
    if (!registering) data.loginAs = loginAs;
    try {
      const result = await api(`/auth/${registering ? "register" : "login"}`, {
        method: "POST",
        body: JSON.stringify(data)
      }, null);
      localStorage.setItem(tokenKey, result.token);
      onAuthenticated(result.user, result.token);
    } catch (error) {
      setNotice({ message: error.message, isError: true });
    } finally {
      setSubmitting(false);
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setNotice(null);
  }

  function changeLoginAs(role) {
    setMode("login");
    setLoginAs(role);
    setNotice(null);
  }

  return (
    <main className="page-shell">
      <nav className="topbar">
        <Brand />
        <span className="nav-caption">A cleaner neighborhood starts together</span>
        <a className="button button-outline" href="#account">Sign in</a>
      </nav>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot"></span> COMMUNITY COLLECTION, MADE SIMPLE</div>
          <h1>A cleaner community<br />is <span>on the calendar.</span></h1>
          <p>Know when collection is coming, stay in the loop, and let your community team know when you need a hand.</p>
          <a className="button button-dark" href="#account">Get started <span aria-hidden="true">↗</span></a>
          <div className="hero-proof"><span className="avatar-stack"><i>J</i><i>M</i><i>A</i></span><span>Built for residents and the people who serve them</span></div>
        </div>
        <div className="hero-art" aria-label="Illustration of a clean green neighborhood">
          <div className="sun"></div><div className="cloud cloud-one"></div><div className="cloud cloud-two"></div>
          <div className="hill hill-back"></div><div className="hill hill-front"></div>
          <div className="house house-one"><span></span><i></i></div><div className="house house-two"><span></span><i></i></div>
          <div className="tree tree-one"></div><div className="tree tree-two"></div>
          <div className="pickup-card"><span className="pickup-icon">↻</span><span><small>NEXT COLLECTION</small><strong>Right on schedule.</strong></span><span className="pickup-check">✓</span></div>
          <span className="art-label">GOOD THINGS<br />ARE GROWING</span>
        </div>
      </section>
      <section className="feature-row">
        <article><span className="feature-icon">▦</span><div><h3>Schedules at a glance</h3><p>See upcoming collections in one simple calendar.</p></div></article>
        <article><span className="feature-icon">↗</span><div><h3>Updates that reach you</h3><p>Get helpful SMS reminders when notifications are enabled.</p></div></article>
        <article><span className="feature-icon">♡</span><div><h3>Help when you need it</h3><p>Send a special request or report a missed pickup.</p></div></article>
      </section>
      <section className="account-section" id="account">
        <div><div className="eyebrow">YOUR COMMUNITY, CONNECTED</div><h2>Let's get you started.</h2><p>Create a resident account or sign in to see your dashboard.</p></div>
        <div className="account-card">
          <div className="tabs role-tabs">
            <button className={`tab ${!registering && loginAs === "user" ? "active" : ""}`} type="button" onClick={() => changeLoginAs("user")}>Resident</button>
            <button className={`tab ${!registering && loginAs === "admin" ? "active" : ""}`} type="button" onClick={() => changeLoginAs("admin")}>Admin</button>
            <button className={`tab ${!registering && loginAs === "superadmin" ? "active" : ""}`} type="button" onClick={() => changeLoginAs("superadmin")}>Superadmin</button>
            <button className={`tab ${registering ? "active" : ""}`} type="button" onClick={() => changeMode("register")}>Register</button>
          </div>
          <Notice notice={notice} />
          <form className="form-grid" onSubmit={submitAuth}>
            {registering && <label>Full name<input name="name" autoComplete="name" required maxLength="80" placeholder="Your name" /></label>}
            <label>Email address<input name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></label>
            {registering && <label>Mobile number<input name="phone" type="tel" autoComplete="tel" required placeholder="+15551234567" /><small>Use international format, including the country code.</small></label>}
            {registering && <label>Residency<select name="residencyId" required defaultValue=""><option value="" disabled>Select your residency</option>{residencies.map((residency) => <option key={residency._id} value={residency._id}>{residency.name}</option>)}</select>{residencies.length === 0 && <small>There are no active residencies yet. Contact the system administrator.</small>}</label>}
            <label>Password<input name="password" type="password" autoComplete={registering ? "new-password" : "current-password"} required minLength="8" placeholder="At least 8 characters" /></label>
            <button className="button button-dark button-full" type="submit" disabled={submitting || (registering && residencies.length === 0)}>{submitting ? "Please wait..." : registering ? "Create resident account" : `Sign in as ${loginAs === "user" ? "resident" : loginAs}`} <span aria-hidden="true">↗</span></button>
            <p className="form-footnote">{registering ? "Resident accounts are assigned to one residency." : `This sign-in is for ${loginAs === "user" ? "residents" : `${loginAs}s`} only.`}</p>
          </form>
        </div>
      </section>
      <Footer />
    </main>
  );
}

function ScheduleCard({ schedule }) {
  const date = new Date(schedule.date);
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

function ScheduleForm({ onSubmit, residencies = [], admin = false }) {
  return (
    <form className="inline-form" onSubmit={onSubmit}>
      {!admin && <label>Residency<select name="residencyId" required defaultValue=""><option value="" disabled>Select residency</option>{residencies.map((residency) => <option key={residency._id} value={residency._id}>{residency.name}</option>)}</select></label>}
      <label>Collection area<input name="area" required maxLength="100" placeholder="e.g. North District" /></label>
      <label>Collection date<input name="date" type="date" required /></label>
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
      <label>Phone number<input name="phone" type="tel" required placeholder="+15551234567" /><small>Include country code.</small></label>
      <label>Temporary password<input name="password" type="password" required minLength="8" maxLength="72" /></label>
      {!admin && <label>Account type<select name="role"><option value="admin">Residency admin</option><option value="user">Resident</option></select></label>}
      {!admin && <label>Residency<select name="residencyId" required defaultValue=""><option value="" disabled>Select residency</option>{residencies.map((residency) => <option key={residency._id} value={residency._id}>{residency.name}</option>)}</select></label>}
      <button className="button button-dark" type="submit">Create {admin ? "resident" : "account"} ↗</button>
    </form>
  );
}

function RequestCard({ request, onReview }) {
  return (
    <article className="request-card">
      <div className="request-meta"><span className={`status-pill ${request.status === "pending" ? "status-pending" : ""}`}>{request.status}</span><span>{new Date(request.createdAt).toLocaleDateString()}</span></div>
      <h3>{request.kind === "missed_pickup" ? "Missed pickup" : "Special request"}</h3>
      <p>{request.description}</p>
      <small>From {request.resident.name} · {request.resident.phone}</small>
      {request.status === "pending" && <button className="button button-small button-outline" type="button" onClick={() => onReview(request._id)}>Mark reviewed</button>}
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
  const admin = user.role === "admin";
  const superadmin = user.role === "superadmin";

  async function refreshDashboard() {
    const [scheduleResult, requestResult, userResult, residencyResult] = await Promise.all([
      api("/schedules", {}, token),
      admin || superadmin ? api("/requests", {}, token) : Promise.resolve({ requests: [] }),
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
          admin || superadmin ? api("/requests", {}, token) : Promise.resolve({ requests: [] }),
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
      setNotice({ message: "Account residency updated." });
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

  async function reviewRequest(id) {
    setNotice(null);
    try {
      const result = await api(`/requests/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "reviewed" })
      }, token);
      await refreshDashboard();
      setNotice({
        message: result.notification.sent
          ? "Request marked as reviewed and resident notified by SMS."
          : `Request marked as reviewed. SMS was not sent: ${result.notification.reason}`
      });
    } catch (error) {
      setNotice({ message: error.message, isError: true });
    }
  }

  return (
    <main className="dashboard-shell">
      <nav className="topbar"><Brand /><div className="user-nav"><span className="role-chip">{superadmin ? "SUPERADMIN" : admin ? "ADMIN" : "RESIDENT"}</span><span className="user-name">{user.name}</span><button className="button button-outline" type="button" onClick={onLogout}>Sign out</button></div></nav>
      <section className="dashboard-heading"><div><div className="eyebrow">{superadmin ? "SYSTEM MANAGEMENT" : admin ? `RESIDENCY ADMINISTRATION${user.residencyName ? ` · ${user.residencyName}` : ""}` : `YOUR NEIGHBORHOOD${user.residencyName ? ` · ${user.residencyName}` : ""}`}</div><h1>{superadmin || admin ? "Good day, " : "Welcome, "}<span>{user.name.split(" ")[0]}.</span></h1><p>{superadmin ? "Manage residencies, administrator accounts, and system-wide operations." : admin ? "Manage residents and collection services for your residency." : "Your collection schedule and community updates, all in one place."}</p></div><div className="heading-stamp">{superadmin ? "✳" : admin ? "✳" : "✦"}</div></section>
      <Notice notice={notice} />
      <section className="dashboard-grid">
        <div className="panel schedule-panel">
          <div className="panel-heading"><div><div className="eyebrow">COLLECTION CALENDAR</div><h2>{admin ? "Manage schedules" : "Upcoming collections"}</h2></div><span className="count-badge">{schedules.length}</span></div>
          {(admin || superadmin) && <ScheduleForm onSubmit={submitSchedule} residencies={residencies} admin={admin} />}
          <div className="schedule-list">
            {loading ? <div className="empty-state"><p>Loading schedules...</p></div> : schedules.length ? schedules.map((schedule) => <ScheduleCard key={schedule._id} schedule={schedule} />) : <div className="empty-state"><span>▦</span><p>No collection schedules have been posted yet.</p></div>}
          </div>
        </div>
        {admin || superadmin ? (
          <div className="panel requests-panel">
            <div className="panel-heading"><div><div className="eyebrow">RESIDENT SUPPORT</div><h2>Service requests</h2></div><span className="count-badge">{requests.filter((request) => request.status === "pending").length} open</span></div>
            <div className="request-list">{loading ? <div className="empty-state"><p>Loading requests...</p></div> : requests.length ? requests.map((request) => <RequestCard key={request._id} request={request} onReview={reviewRequest} />) : <div className="empty-state"><span>♡</span><p>No resident requests yet.</p></div>}</div>
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
      {(admin || superadmin) && <section className="management-grid">
        {superadmin && <div className="panel">
          <div className="panel-heading"><div><div className="eyebrow">SYSTEM SETUP</div><h2>Residencies</h2></div><span className="count-badge">{residencies.length}</span></div>
          <form className="inline-form single-column" onSubmit={createResidency}>
            <label>Residency name<input name="name" required minLength="2" maxLength="100" placeholder="e.g. North District" /></label>
            <button className="button button-dark" type="submit" disabled={submitting}>Create residency ↗</button>
          </form>
          <div className="resident-list">{residencies.map((residency) => <article key={residency._id} className="resident-row"><strong>{residency.name}</strong><button type="button" className="button button-small button-outline" onClick={() => toggleResidency(residency)}>{residency.active ? "Deactivate" : "Activate"}</button></article>)}</div>
        </div>}
        <div className="panel">
          <div className="panel-heading"><div><div className="eyebrow">{superadmin ? "ACCESS MANAGEMENT" : "RESIDENT DIRECTORY"}</div><h2>{superadmin ? "Create account" : "Manage residents"}</h2></div><span className="count-badge">{users.length}</span></div>
          <AccountForm onSubmit={createAccount} admin={admin} residencies={residencies} />
          <div className="resident-list">{users.map((account) => <article key={account._id} className="resident-row"><div><strong>{account.name}</strong><small>{account.email} · {account.phone}</small></div>{superadmin ? <div className="resident-admin-actions"><select aria-label={`Role for ${account.name}`} value={account.role === "resident" ? "user" : account.role} onChange={(event) => updateAccount(account._id, account.residencyId?._id || account.residencyId, event.target.value)}><option value="admin">Admin</option><option value="user">Resident</option></select><select aria-label={`Residency for ${account.name}`} value={account.residencyId?._id || account.residencyId || ""} onChange={(event) => updateAccount(account._id, event.target.value, account.role === "resident" ? "user" : account.role)}><option value="" disabled>Assign residency</option>{residencies.map((residency) => <option key={residency._id} value={residency._id}>{residency.name}</option>)}</select></div> : <span className="status-pill">resident</span>}</article>)}</div>
        </div>
      </section>}
      <Footer />
    </main>
  );
}

function App() {
  const [auth, setAuth] = useState(null);
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
  }

  if (checkingSession) return <main className="page-shell"><div className="empty-state">Loading your community...</div></main>;
  if (auth) return <Dashboard key={auth.user.id} user={auth.user} token={auth.token} onLogout={logout} />;
  return <Landing onAuthenticated={(user, token) => setAuth({ user, token })} initialNotice={sessionError} />;
}

createRoot(document.getElementById("app")).render(<App />);
