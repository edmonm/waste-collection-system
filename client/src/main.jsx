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
  const [notice, setNotice] = useState(initialNotice ? { message: initialNotice, isError: true } : null);
  const [submitting, setSubmitting] = useState(false);
  const registering = mode === "register";

  async function submitAuth(event) {
    event.preventDefault();
    setSubmitting(true);
    setNotice(null);
    const data = Object.fromEntries(new FormData(event.currentTarget));
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
          <div className="tabs">
            <button className={`tab ${!registering ? "active" : ""}`} type="button" onClick={() => changeMode("login")}>Sign in</button>
            <button className={`tab ${registering ? "active" : ""}`} type="button" onClick={() => changeMode("register")}>Create account</button>
          </div>
          <Notice notice={notice} />
          <form className="form-grid" onSubmit={submitAuth}>
            {registering && <label>Full name<input name="name" autoComplete="name" required maxLength="80" placeholder="Your name" /></label>}
            <label>Email address<input name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></label>
            {registering && <label>Mobile number<input name="phone" type="tel" autoComplete="tel" required placeholder="+15551234567" /><small>Use international format, including the country code.</small></label>}
            <label>Password<input name="password" type="password" autoComplete={registering ? "new-password" : "current-password"} required minLength="8" placeholder="At least 8 characters" /></label>
            <button className="button button-dark button-full" type="submit" disabled={submitting}>{submitting ? "Please wait..." : registering ? "Create resident account" : "Sign in"} <span aria-hidden="true">↗</span></button>
            <p className="form-footnote">{registering ? "Resident accounts are created with resident access." : "Your dashboard is tailored to your account role."}</p>
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

function ScheduleForm({ onSubmit }) {
  return (
    <form className="inline-form" onSubmit={onSubmit}>
      <label>Collection area<input name="area" required maxLength="100" placeholder="e.g. North District" /></label>
      <label>Collection date<input name="date" type="date" required /></label>
      <label>Waste type<select name="wasteType" required><option value="General waste">General waste</option><option value="Recycling">Recycling</option><option value="Green waste">Green waste</option><option value="Bulk collection">Bulk collection</option></select></label>
      <label>Notes (optional)<input name="notes" maxLength="300" placeholder="Collection details" /></label>
      <button className="button button-dark" type="submit">Publish schedule ↗</button>
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
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const admin = user.role === "admin";

  async function refreshDashboard() {
    const [scheduleResult, requestResult] = await Promise.all([
      api("/schedules", {}, token),
      admin ? api("/requests", {}, token) : Promise.resolve({ requests: [] })
    ]);
    setSchedules(scheduleResult.schedules);
    setRequests(requestResult.requests);
  }

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [scheduleResult, requestResult] = await Promise.all([
          api("/schedules", {}, token),
          admin ? api("/requests", {}, token) : Promise.resolve({ requests: [] })
        ]);
        if (active) {
          setSchedules(scheduleResult.schedules);
          setRequests(requestResult.requests);
        }
      } catch (error) {
        if (active) setNotice({ message: error.message, isError: true });
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [admin, token]);

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
      <nav className="topbar"><Brand /><div className="user-nav"><span className="role-chip">{admin ? "ADMIN" : "RESIDENT"}</span><span className="user-name">{user.name}</span><button className="button button-outline" type="button" onClick={onLogout}>Sign out</button></div></nav>
      <section className="dashboard-heading"><div><div className="eyebrow">{admin ? "COMMUNITY ADMINISTRATION" : "YOUR NEIGHBORHOOD"}</div><h1>{admin ? "Good day, " : "Welcome, "}<span>{user.name.split(" ")[0]}.</span></h1><p>{admin ? "Keep collection plans moving and support your residents." : "Your collection schedule and community updates, all in one place."}</p></div><div className="heading-stamp">{admin ? "✳" : "✦"}</div></section>
      <Notice notice={notice} />
      <section className="dashboard-grid">
        <div className="panel schedule-panel">
          <div className="panel-heading"><div><div className="eyebrow">COLLECTION CALENDAR</div><h2>{admin ? "Manage schedules" : "Upcoming collections"}</h2></div><span className="count-badge">{schedules.length}</span></div>
          {admin && <ScheduleForm onSubmit={submitSchedule} />}
          <div className="schedule-list">
            {loading ? <div className="empty-state"><p>Loading schedules...</p></div> : schedules.length ? schedules.map((schedule) => <ScheduleCard key={schedule._id} schedule={schedule} />) : <div className="empty-state"><span>▦</span><p>No collection schedules have been posted yet.</p></div>}
          </div>
        </div>
        {admin ? (
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
