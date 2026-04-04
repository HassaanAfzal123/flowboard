import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import OrganizationNav from '../components/OrganizationNav';

export default function OrganizationSettings() {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const { data } = await api.get(`/api/organizations/${orgId}`);
      setOrganization(data.organization);
      setName(data.organization.name || '');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const { data } = await api.patch(`/api/organizations/${orgId}`, { name: name.trim() });
      setOrganization(data.organization);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not save';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        'Delete this organization and all related data? This cannot be undone.'
      )
    ) {
      return;
    }
    setDeleting(true);
    setError('');
    try {
      await api.delete(`/api/organizations/${orgId}`);
      navigate('/organizations', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not delete';
      setError(msg);
    } finally {
      setDeleting(false);
    }
  }

  const role = organization?.role;
  const canEdit = role === 'owner' || role === 'admin';
  const canDelete = role === 'owner';

  return (
    <>
      <OrganizationNav active="settings" />

      <p className="breadcrumb">
        <Link to="/organizations">Organizations</Link>
        <span className="muted"> / </span>
        <span>{organization?.name || '…'}</span>
        <span className="muted"> / Settings</span>
      </p>

      <h1>Organization settings</h1>
      <p className="muted">Slug: {organization?.slug || '—'} · Your role: {role || '—'}</p>

      {error ? <p className="error">{error}</p> : null}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <>
          {canEdit ? (
            <form className="card" onSubmit={handleSave}>
              <h2 className="h2">Name</h2>
              <label>
                Organization name
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </label>
              <button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </form>
          ) : (
            <p className="muted">Only owners and admins can rename the organization.</p>
          )}

          {canDelete ? (
            <div className="card danger-zone">
              <h2 className="h2">Danger zone</h2>
              <p className="muted">Delete the entire organization. You must be the owner.</p>
              <button type="button" className="btn-danger-solid" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete organization'}
              </button>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
