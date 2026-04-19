import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

export default function Organizations() {
  const [organizations, setOrganizations] = useState([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const { data } = await api.get('/api/organizations');
      setOrganizations(data.organizations || []);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load organizations';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post('/api/organizations', { name: name.trim() });
      setName('');
      await load();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not create organization';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1>Organizations</h1>
      <p className="muted">
        Each organization is a tenant: projects, tasks, and members are isolated from other orgs.
      </p>

      <form className="card inline" onSubmit={handleCreate}>
        <label className="grow">
          New organization name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Acme Corp"
          />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create'}
        </button>
      </form>

      {error ? <p className="error">{error}</p> : null}

      {loading ? (
        <p className="muted">Loading organizations…</p>
      ) : organizations.length === 0 ? (
        <p className="muted">You are not in any organization yet. Create one above.</p>
      ) : (
        <ul className="list">
          {organizations.map((org) => {
            const id = org._id != null ? String(org._id) : org.id;
            return (
              <li key={id} className="list-item">
                <div className="org-card-header">
                  <div>
                    <strong>{org.name}</strong>
                  </div>
                  <span className="muted">Your role: {org.role || '—'}</span>
                </div>
                <div className="org-card-links">
                  <Link to={`/organizations/${id}/projects`}>Projects</Link>
                  <Link to={`/organizations/${id}/members`}>Members</Link>
                  <Link to={`/organizations/${id}/settings`}>Settings</Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
