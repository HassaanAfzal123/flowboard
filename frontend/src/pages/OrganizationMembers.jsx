import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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

function currentUserId(user) {
  if (!user) return null;
  if (user._id != null) return String(user._id);
  if (user.id != null) return String(user.id);
  return null;
}

export default function OrganizationMembers() {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const meId = currentUserId(authUser);

  const [organization, setOrganization] = useState(null);
  const [members, setMembers] = useState([]);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [transferToId, setTransferToId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [transferring, setTransferring] = useState(false);

  const ownerCount = useMemo(
    () => members.filter((m) => m.role === 'owner').length,
    [members]
  );
  const soleOwner = ownerCount === 1;

  const loadOrg = useCallback(async () => {
    const { data } = await api.get(`/api/organizations/${orgId}`);
    setOrganization(data.organization);
  }, [orgId]);

  const loadMembers = useCallback(async () => {
    const { data } = await api.get(`/api/organizations/${orgId}/members`);
    setMembers(data.members || []);
  }, [orgId]);

  const loadInvites = useCallback(async () => {
    const { data } = await api.get(`/api/organizations/${orgId}/invitations`);
    setPendingInvites(data.invites || []);
  }, [orgId]);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      await Promise.all([loadOrg(), loadMembers(), loadInvites()]);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [loadOrg, loadMembers, loadInvites]);

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
      await loadInvites();
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

  async function leaveOrganization() {
    if (
      !window.confirm(
        'Leave this organization? You will lose access to its projects, tasks, and members.'
      )
    ) {
      return;
    }
    setError('');
    try {
      await api.post(`/api/organizations/${orgId}/leave`);
      navigate('/organizations');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not leave organization';
      setError(msg);
    }
  }

  async function cancelInvite(invitationId) {
    if (!window.confirm('Cancel this pending invitation?')) return;
    setError('');
    try {
      await api.post(`/api/organizations/${orgId}/invitations/${invitationId}/cancel`);
      await loadInvites();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not cancel invite';
      setError(msg);
    }
  }

  async function handleTransferOwnership(e) {
    e.preventDefault();
    if (!transferToId) return;
    if (
      !window.confirm(
        'You will become an admin and the selected member will become the sole owner. Continue?'
      )
    ) {
      return;
    }
    setTransferring(true);
    setError('');
    try {
      await api.post(`/api/organizations/${orgId}/transfer-ownership`, {
        userId: transferToId,
      });
      setTransferToId('');
      await load();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Transfer failed';
      setError(msg);
    } finally {
      setTransferring(false);
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
      <p className="muted">
        Invite users who already have a FlowBoard account (same email they registered with). The
        organization must always have at least one owner; to step down as the only owner, transfer
        ownership first.
      </p>
      <div>
        <button type="button" className="btn-danger" onClick={leaveOrganization}>
          Leave organization
        </button>
      </div>

      {error ? <p className="error">{error}</p> : null}

      {myRole === 'owner' ? (
        <div className="card ownership-panel">
          <h2 className="h2">Ownership</h2>
          <p className="muted small">
            {soleOwner
              ? 'You are the only owner. You cannot demote yourself in the role menu—transfer ownership to another member first (you will become an admin).'
              : 'With multiple owners, you can change roles freely, but the last owner cannot remove their own owner role without transferring first.'}
          </p>
          {soleOwner ? (
            members.filter((m) => {
              const uid = memberUserId(m);
              return uid && uid !== meId;
            }).length === 0 ? (
              <p className="muted small">
                Invite at least one other member before you can transfer ownership.
              </p>
            ) : (
              <form className="transfer-form" onSubmit={handleTransferOwnership}>
                <label className="grow">
                  Transfer ownership to
                  <select
                    value={transferToId}
                    onChange={(e) => setTransferToId(e.target.value)}
                    required
                  >
                    <option value="">Choose a member…</option>
                    {members
                      .filter((m) => {
                        const uid = memberUserId(m);
                        return uid && uid !== meId;
                      })
                      .map((m) => {
                        const uid = memberUserId(m);
                        const label = m.user?.name || m.user?.email || uid;
                        return (
                          <option key={uid} value={uid}>
                            {label} ({m.role})
                          </option>
                        );
                      })}
                  </select>
                </label>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={transferring || !transferToId}
                >
                  {transferring ? 'Transferring…' : 'Transfer ownership'}
                </button>
              </form>
            )
          ) : null}
        </div>
      ) : null}

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

      {canInvite ? (
        <div className="card">
          <h2 className="h2">Pending invites</h2>
          {pendingInvites.length === 0 ? (
            <p className="muted small">No pending invites.</p>
          ) : (
            <ul className="list">
              {pendingInvites.map((invite) => {
                const invitedLabel =
                  invite.invitedUser?.name || invite.invitedUser?.email || 'Unknown user';
                return (
                  <li key={invite.id} className="list-item member-row">
                    <div>
                      <strong>{invitedLabel}</strong>
                      <span className="muted">
                        {invite.invitedUser?.email ? ` · ${invite.invitedUser.email}` : ''} · Role:{' '}
                        {invite.role}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => cancelInvite(invite.id)}
                    >
                      Cancel invite
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}

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
                      {(soleOwner && uid === meId && m.role === 'owner'
                        ? ROLES.filter((r) => r.value === 'owner')
                        : ROLES
                      ).map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="muted">{m.role}</span>
                  )}
                  {canRemove && uid && uid !== meId ? (
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
