import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PublicShell from '../components/PublicShell';

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="public-page">
        <div className="loading-screen" role="status" aria-live="polite">
          <div className="loading-dots" aria-hidden="true">
            <span className="loading-dot" />
            <span className="loading-dot" />
            <span className="loading-dot" />
          </div>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/organizations" replace />;
  }

  return (
    <PublicShell variant="landing">
      <section className="landing-hero">
        <h1 className="landing-title">
          Run projects and tasks <span className="landing-accent">per organization</span>, securely.
        </h1>
        <p className="landing-lead">
          FlowBoard isolates each customer’s data, enforces roles on the server, and keeps your team
          aligned with projects, tasks, and comments—without mixing tenants.
        </p>
        <div className="landing-cta">
          <Link to="/register" className="btn btn-primary btn-lg">
            Create account
          </Link>
          <Link to="/login" className="btn btn-ghost btn-lg">
            Sign in
          </Link>
        </div>
      </section>

      <section className="feature-grid" aria-labelledby="features-heading">
        <h2 id="features-heading" className="sr-only">
          Product features
        </h2>
        <article className="feature-card">
          <div className="feature-icon" aria-hidden="true">
            ◇
          </div>
          <h3>Tenants &amp; roles</h3>
          <p>Organizations as tenants; members with owner, admin, or member roles—checked on every API call.</p>
        </article>
        <article className="feature-card">
          <div className="feature-icon" aria-hidden="true">
            ◈
          </div>
          <h3>Projects &amp; tasks</h3>
          <p>Create projects under an org, track tasks with statuses, and discuss work in threaded comments.</p>
        </article>
        <article className="feature-card">
          <div className="feature-icon" aria-hidden="true">
            ◆
          </div>
          <h3>Performance</h3>
          <p>Paginated lists and Redis-friendly caching patterns on the API for scalable reads.</p>
        </article>
      </section>
    </PublicShell>
  );
}
