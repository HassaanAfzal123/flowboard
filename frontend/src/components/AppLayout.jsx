import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { api } from '../services/api';

function displayName(user) {
  if (!user) return '';
  const n = user.name && String(user.name).trim();
  if (n) return n;
  return user.email || '';
}

export default function AppLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const who = displayName(user);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const bellRef = useRef(null);

  const loadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const { data } = await api.get('/api/notifications');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const id = setInterval(() => {
      loadNotifications();
    }, 30000);
    return () => clearInterval(id);
  }, [loadNotifications]);

  useEffect(() => {
    function onClickOutside(event) {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function handleInviteAction(invitationId, action) {
    if (!invitationId) return;
    setActionError('');
    try {
      const { data } = await api.post(`/api/invitations/${invitationId}/${action}`);
      await loadNotifications();
      if (action === 'accept' && data.organizationId) {
        navigate(`/organizations/${data.organizationId}/projects`);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || `Could not ${action} invitation`;
      setActionError(msg);
    }
  }

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

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
            <div className="app-notifications" ref={bellRef}>
              <button
                type="button"
                className="app-bell-btn"
                aria-label="Notifications"
                onClick={() => {
                  const nextOpen = !menuOpen;
                  setMenuOpen(nextOpen);
                  if (nextOpen) {
                    loadNotifications();
                  }
                }}
              >
                <span aria-hidden="true">🔔</span>
                {unreadCount > 0 ? <span className="app-bell-badge">{unreadCount}</span> : null}
              </button>
              {menuOpen ? (
                <div className="app-notifications-popover">
                  <p className="app-notifications-title">Invitations</p>
                  {actionError ? <p className="error">{actionError}</p> : null}
                  {notificationsLoading ? (
                    <p className="muted small">Loading…</p>
                  ) : notifications.length === 0 ? (
                    <p className="muted small">No pending invites.</p>
                  ) : (
                    <ul className="app-notification-list">
                      {notifications.map((item) => (
                        <li key={item.id} className="app-notification-item">
                          <p className="app-notification-text">
                            <strong>{item.invite?.organization?.name || 'Organization'}</strong>
                            <span> · Role: {item.invite?.role || 'member'}</span>
                          </p>
                          <p className="muted small">{item.message}</p>
                          <div className="app-notification-actions">
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => handleInviteAction(item.invite?.id || item.id, 'accept')}
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleInviteAction(item.invite?.id || item.id, 'decline')}
                            >
                              Decline
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
            <span className="app-user-display" title={user?.email ? user.email : undefined}>
              {who}
            </span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
