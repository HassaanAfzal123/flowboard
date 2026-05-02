import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import PublicShell from '../components/PublicShell';

export default function NotFound() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="public-page">
        <div className="loading-screen" role="status">
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
    return (
      <div className="app-404">
        <header className="app-404-bar">
          <Link to="/organizations" className="app-404-brand">
            FlowBoard
          </Link>
          <Link to="/organizations" className="btn btn-ghost btn-sm">
            Back to app
          </Link>
        </header>
        <div className="page narrow not-found">
          <p className="not-found-code">404</p>
          <h1 className="not-found-title">Page not found</h1>
          <p className="muted muted-center">
            This path is not part of your workspace. Use the navigation or return to organizations.
          </p>
          <div className="not-found-actions">
            <Link to="/organizations" className="btn btn-primary">
              Organizations
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PublicShell>
      <div className="not-found">
        <p className="not-found-code">404</p>
        <h1 className="not-found-title">Page not found</h1>
        <p className="muted muted-center">
          That URL does not exist. Try the home page or sign in.
        </p>
        <div className="not-found-actions">
          <Link to="/" className="btn btn-ghost">
            Home
          </Link>
          <Link to="/login" className="btn btn-primary">
            Sign in
          </Link>
        </div>
      </div>
    </PublicShell>
  );
}
