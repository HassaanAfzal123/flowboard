import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';

const STATUSES = [
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
];

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [title, setTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);

  const limit = 20;

  const loadProject = useCallback(async () => {
    const { data } = await api.get(`/api/projects/${projectId}`);
    setProject(data.project);
    setEditName(data.project?.name || '');
    setEditDescription(data.project?.description || '');
  }, [projectId]);

  const loadTasks = useCallback(async () => {
    const { data } = await api.get(`/api/projects/${projectId}/tasks`, {
      params: { page, limit },
    });
    setItems(data.items || []);
    setTotal(data.total ?? 0);
  }, [projectId, page]);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      await Promise.all([loadProject(), loadTasks()]);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [loadProject, loadTasks]);

  useEffect(() => {
    load();
  }, [load]);

  const canManageProject =
    project?.role === 'owner' || project?.role === 'admin';

  async function handleSaveProject(e) {
    e.preventDefault();
    if (!editName.trim()) return;
    setSavingProject(true);
    setError('');
    try {
      const { data } = await api.patch(`/api/projects/${projectId}`, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });
      setProject(data.project);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not save project';
      setError(msg);
    } finally {
      setSavingProject(false);
    }
  }

  async function handleDeleteProject() {
    if (!window.confirm('Delete this project? Tasks in this project will be removed from the UI scope.')) {
      return;
    }
    setDeletingProject(true);
    setError('');
    try {
      await api.delete(`/api/projects/${projectId}`);
      const orgId = project?.organizationId != null ? String(project.organizationId) : null;
      if (orgId) {
        navigate(`/organizations/${orgId}/projects`, { replace: true });
      } else {
        navigate('/organizations', { replace: true });
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Delete failed';
      setError(msg);
    } finally {
      setDeletingProject(false);
    }
  }

  async function handleCreateTask(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/api/projects/${projectId}/tasks`, {
        title: title.trim(),
        description: taskDescription.trim() || undefined,
      });
      setTitle('');
      setTaskDescription('');
      setPage(1);
      await load();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not create task';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function updateTaskStatus(taskId, status) {
    setError('');
    try {
      await api.patch(`/api/tasks/${taskId}`, { status });
      await loadTasks();
      await loadProject();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Update failed';
      setError(msg);
    }
  }

  async function deleteTask(taskId) {
    if (!window.confirm('Delete this task?')) return;
    setError('');
    try {
      await api.delete(`/api/tasks/${taskId}`);
      await load();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Delete failed';
      setError(msg);
    }
  }

  const orgId = project?.organizationId != null ? String(project.organizationId) : null;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <>
      <p className="breadcrumb">
        <Link to="/organizations">Organizations</Link>
        {orgId ? (
          <>
            <span className="muted"> / </span>
            <Link to={`/organizations/${orgId}/projects`}>Projects</Link>
          </>
        ) : null}
        <span className="muted"> / </span>
        <span>{project?.name || '…'}</span>
      </p>

      <h1>{project?.name || 'Project'}</h1>
      {project?.description ? <p className="muted">{project.description}</p> : null}
      {project?.role ? (
        <p className="muted">
          Your org role: <strong>{project.role}</strong>
        </p>
      ) : null}

      {error ? <p className="error">{error}</p> : null}

      {canManageProject ? (
        <form className="card" onSubmit={handleSaveProject}>
          <h2 className="h2">Project settings</h2>
          <label>
            Name
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />
          </label>
          <label>
            Description
            <textarea
              rows={2}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Optional"
            />
          </label>
          <div className="form-row">
            <button type="submit" disabled={savingProject}>
              {savingProject ? 'Saving…' : 'Save project'}
            </button>
            <button
              type="button"
              className="btn-danger-solid"
              onClick={handleDeleteProject}
              disabled={deletingProject}
            >
              {deletingProject ? 'Deleting…' : 'Delete project'}
            </button>
          </div>
        </form>
      ) : null}

      <form className="card" onSubmit={handleCreateTask}>
        <h2 className="h2">New task</h2>
        <label>
          Title
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Implement login"
            required
          />
        </label>
        <label>
          Description (optional)
          <input
            type="text"
            value={taskDescription}
            onChange={(e) => setTaskDescription(e.target.value)}
            placeholder="Acceptance criteria, notes…"
          />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Adding…' : 'Add task'}
        </button>
      </form>

      {loading ? (
        <p className="muted">Loading tasks…</p>
      ) : items.length === 0 ? (
        <p className="muted">No tasks yet.</p>
      ) : (
        <>
          <ul className="list">
            {items.map((t) => (
              <li key={t._id} className="list-item task-row">
                <div>
                  <Link to={`/tasks/${t._id}`} className="list-link task-title-link">
                    <strong>{t.title}</strong>
                  </Link>
                  {t.description ? (
                    <span className="muted"> — {t.description}</span>
                  ) : null}
                </div>
                <div className="task-actions">
                  <select
                    aria-label={`Status for ${t.title}`}
                    value={t.status}
                    onChange={(e) => updateTaskStatus(t._id, e.target.value)}
                  >
                    {STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="btn-danger" onClick={() => deleteTask(t._id)}>
                    Delete
                  </button>
                </div>
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
                Page {page} of {totalPages} ({total} tasks)
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
