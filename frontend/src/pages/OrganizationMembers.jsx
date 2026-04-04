import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api';
import OrganizationNav from '../components/OrganizationNav';

const ROLES = [
  { value: 'member', label: 'Member' },
  { value: 'admin', label: 'Admin' },
  { value: 'owner', label: 'Owner' },
];

function memberUserId(m) {
  const u = m.user;
  if (!u) return null;
  return u._id != null ? String(u._id) : u.id != null ? String(u.id) : null;
}

export default function OrganizationMembers() {
  const { orgId } = useParams();
  const [organization, setOrganization] = useState(null);
  const [members, setMembers] = useState([]);
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadOrg = useCallback(async () => {
    const { data } = await api.get(`/api/organizations/${orgId}`);
    setOrganization(data.organization);
  }, [orgId]);

  const loadMembers = useCallback(async () => {
    const { data } = await api.get(`/api/organizations/${orgId}/members`);
    setMembers(data.members || []);
  }, [orgId]);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      await Promise.all([loadOrg(), loadMembers()]);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [loadOrg, loadMembers]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleInvite(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/api/organizations/${orgId}/members`, {
        email: email.trim().toLowerCase(),
        role: inviteRole,
      });
      setEmail('');
      await loadMembers();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Invite failed';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function updateRole(userId, role) {
    setError('');
    try {
      await api.patch(`/api/organizations/${orgId}/members/${userId}`, { role });
      await loadMembers();
      await loadOrg();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not update role';
      setError(msg);
    }
  }

  async function removeMember(userId) {
    if (!window.confirm('Remove this member from the organization?')) return;
    setError('');
    try {
      await api.delete(`/api/organizations/${orgId}/members/${userId}`);
      await loadMembers();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not remove';
      setError(msg);
    }
  }

  const myRole = organization?.role;
  const canInvite = myRole === 'owner' || myRole === 'admin';
  const canChangeRoles = myRole === 'owner';
  const canRemove = myRole === 'owner' || myRole === 'admin';

  return (
    <>
      <OrganizationNav active="members" />

      <p className="breadcrumb">
        <Link to="/organizations">Organizations</Link>
        <span className="muted"> / </span>
        <span>{organization?.name || '…'}</span>
        <span className="muted"> / Members</span>
      </p>

      <h1>Members</h1>
      <p className="muted">Invite users who already have a FlowBoard account (same email they registered with).</p>

      {error ? <p className="error">{error}</p> : null}

      {canInvite ? (
        <form className="card inline" onSubmit={handleInvite}>
          <label className="grow">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              required
            />
          </label>
          <label>
            Role
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
              {ROLES.filter((r) => r.value !== 'owner').map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Inviting…' : 'Invite'}
          </button>
        </form>
      ) : (
        <p className="muted">Only owners and admins can invite members.</p>
      )}

      {loading ? (
        <p className="muted">Loading members…</p>
      ) : (
        <ul className="list">
          {members.map((m) => {
            const uid = memberUserId(m);
            const label = m.user?.name || m.user?.email || uid;
            return (
              <li key={m.id || uid} className="list-item member-row">
                <div>
                  <strong>{label}</strong>
                  <span className="muted"> {m.user?.email ? `· ${m.user.email}` : ''}</span>
                </div>
                <div className="member-actions">
                  {canChangeRoles && uid ? (
                    <select
                      aria-label={`Role for ${label}`}
                      value={m.role}
                      onChange={(e) => updateRole(uid, e.target.value)}
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="muted">{m.role}</span>
                  )}
                  {canRemove && uid ? (
                    <button type="button" className="btn-danger" onClick={() => removeMember(uid)}>
                      Remove
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
