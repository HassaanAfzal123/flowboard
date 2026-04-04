import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import OrganizationNav from '../components/OrganizationNav';
import { api } from '../services/api';

export default function OrganizationProjects() {
  const { orgId } = useParams();
  const [organization, setOrganization] = useState(null);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const limit = 20;

  const loadOrg = useCallback(async () => {
    const { data } = await api.get(`/api/organizations/${orgId}`);
    setOrganization(data.organization);
  }, [orgId]);

  const loadProjects = useCallback(async () => {
    const { data } = await api.get(`/api/organizations/${orgId}/projects`, {
      params: { page, limit },
    });
    setItems(data.items || []);
    setTotal(data.total ?? 0);
  }, [orgId, page]);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      await Promise.all([loadOrg(), loadProjects()]);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [loadOrg, loadProjects]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/api/organizations/${orgId}/projects`, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setName('');
      setDescription('');
      setPage(1);
      await load();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not create project';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <>
      <OrganizationNav active="projects" />

      <p className="breadcrumb">
        <Link to="/organizations">Organizations</Link>
        <span className="muted"> / </span>
        <span>{organization?.name || '…'}</span>
      </p>

      <h1>Projects</h1>
      <p className="muted">
        Projects belong to this organization (tenant). Your role:{' '}
        <strong>{organization?.role ?? '—'}</strong>
      </p>

      <form className="card" onSubmit={handleCreate}>
        <h2 className="h2">New project</h2>
        {error ? <p className="error">{error}</p> : null}
        <label>
          Name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Sprint 1"
            required
          />
        </label>
        <label>
          Description (optional)
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Goals for this project"
          />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create project'}
        </button>
      </form>

      {loading ? (
        <p className="muted">Loading projects…</p>
      ) : items.length === 0 ? (
        <p className="muted">No projects yet. Create one above.</p>
      ) : (
        <>
          <ul className="list">
            {items.map((p) => (
              <li key={p._id} className="list-item">
                <Link to={`/projects/${p._id}`} className="list-link">
                  <strong>{p.name}</strong>
                  {p.description ? <span className="muted"> — {p.description}</span> : null}
                </Link>
              </li>
            ))}
          </ul>
          {totalPages > 1 ? (
            <div className="pager">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span className="muted">
                Page {page} of {totalPages} ({total} total)
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
