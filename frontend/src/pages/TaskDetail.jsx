import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

function userId(u) {
  if (!u) return null;
  if (u._id != null) return String(u._id);
  if (u.id != null) return String(u.id);
  return null;
}

export default function TaskDetail() {
  const { taskId } = useParams();
  const { user: currentUser } = useAuth();
  const currentId = userId(currentUser);

  const [task, setTask] = useState(null);
  const [project, setProject] = useState(null);
  const [comments, setComments] = useState([]);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  const loadTask = useCallback(async () => {
    const { data } = await api.get(`/api/tasks/${taskId}`);
    setTask(data.task);
    if (data.task?.projectId) {
      const pr = await api.get(`/api/projects/${data.task.projectId}`);
      setProject(pr.data.project);
    }
  }, [taskId]);

  const loadComments = useCallback(async () => {
    const { data } = await api.get(`/api/tasks/${taskId}/comments`);
    setComments(data.comments || []);
  }, [taskId]);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      await Promise.all([loadTask(), loadComments()]);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to load';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [loadTask, loadComments]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAddComment(e) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/api/tasks/${taskId}/comments`, { body: body.trim() });
      setBody('');
      await loadComments();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Could not post';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function saveEdit(commentId) {
    setError('');
    try {
      await api.patch(`/api/comments/${commentId}`, { body: editText.trim() });
      setEditingId(null);
      await loadComments();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Update failed';
      setError(msg);
    }
  }

  async function deleteComment(commentId) {
    if (!window.confirm('Delete this comment?')) return;
    setError('');
    try {
      await api.delete(`/api/comments/${commentId}`);
      await loadComments();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Delete failed';
      setError(msg);
    }
  }

  const orgId =
    project?.organizationId != null ? String(project.organizationId) : null;
  const projectId = task?.projectId != null ? String(task.projectId) : null;

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
        {projectId ? (
          <>
            <span className="muted"> / </span>
            <Link to={`/projects/${projectId}`}>{project?.name || 'Project'}</Link>
          </>
        ) : null}
        <span className="muted"> / </span>
        <span>{task?.title || 'Task'}</span>
      </p>

      <h1>{task?.title || 'Task'}</h1>
      {task?.description ? <p className="muted">{task.description}</p> : null}
      {task?.status ? (
        <p className="muted">
          Status: <strong>{task.status}</strong>
        </p>
      ) : null}

      {error ? <p className="error">{error}</p> : null}

      <section className="section-block">
        <h2 className="h2">Comments</h2>
        <p className="muted small">
          Comments are scoped to this task; the API checks organization membership.
        </p>

        <form className="card" onSubmit={handleAddComment}>
          <label>
            New comment
            <textarea
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Add a note for your team…"
              required
            />
          </label>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Posting…' : 'Post comment'}
          </button>
        </form>

        {loading ? (
          <p className="muted">Loading…</p>
        ) : comments.length === 0 ? (
          <p className="muted">No comments yet.</p>
        ) : (
          <ul className="list">
            {comments.map((c) => {
              const authorId = userId(c.user);
              const isMine = currentId && authorId && currentId === authorId;
              const authorLabel = c.user?.name || c.user?.email || 'Member';
              return (
                <li key={c.id || c._id} className="list-item comment-item">
                  <div className="comment-meta">
                    <strong>{authorLabel}</strong>
                    <span className="muted">
                      {' '}
                      · {c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}
                    </span>
                  </div>
                  {editingId === (c.id || c._id) ? (
                    <div className="comment-edit">
                      <textarea
                        rows={2}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                      />
                      <div className="comment-edit-actions">
                        <button type="button" onClick={() => saveEdit(c.id || c._id)}>
                          Save
                        </button>
                        <button type="button" className="btn-muted" onClick={() => setEditingId(null)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="comment-body">{c.body}</p>
                  )}
                  {isMine && editingId !== (c.id || c._id) ? (
                    <div className="comment-actions">
                      <button
                        type="button"
                        className="btn-muted"
                        onClick={() => {
                          setEditingId(c.id || c._id);
                          setEditText(c.body);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn-danger"
                        onClick={() => deleteComment(c.id || c._id)}
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
