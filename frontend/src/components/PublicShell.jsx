import { Link } from 'react-router-dom';

/**
 * Shared chrome for unauthenticated pages (landing, auth, 404).
 * @param {'default' | 'landing' | 'auth'} variant
 * @param {boolean} showNav — header with Sign in / Get started (hide on auth forms).
 */
export default function PublicShell({ children, variant = 'default', showNav = true }) {
  return (
    <div className={`public-page public-page--${variant}`}>
      {showNav ? (
        <header className="public-header">
          <Link to="/" className="public-logo">
            FlowBoard
          </Link>
          <nav className="public-header-nav" aria-label="Account">
            <Link to="/login" className="public-nav-link">
              Sign in
            </Link>
            <Link to="/register" className="btn btn-primary btn-sm">
              Get started
            </Link>
          </nav>
        </header>
      ) : (
        <header className="public-header public-header--minimal">
          <Link to="/" className="public-logo">
            FlowBoard
          </Link>
        </header>
      )}
      <div className="public-inner">{children}</div>
      <footer className="public-footer">
        <span>FlowBoard — multi-tenant project management</span>
      </footer>
    </div>
  );
}
