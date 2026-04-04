import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-header-brand">
            <Link to="/organizations" className="app-logo">
              FlowBoard
            </Link>
            <span className="app-header-badge">Workspace</span>
          </div>
          <nav className="app-header-nav" aria-label="Main">
            <NavLink
              to="/organizations"
              className={({ isActive }) => `app-nav-link${isActive ? ' app-nav-link--active' : ''}`}
            >
              Organizations
            </NavLink>
          </nav>
          <div className="app-header-user">
            <span className="app-user-email" title={user?.email}>
              {user?.email}
            </span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <footer className="app-footer">
        <span>FlowBoard</span>
        <span className="app-footer-dot" aria-hidden="true">
          ·
        </span>
        <span className="muted">Signed in securely with JWT</span>
      </footer>
    </div>
  );
}
