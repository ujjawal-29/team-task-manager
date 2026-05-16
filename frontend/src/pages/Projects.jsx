import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import './Projects.css';

function CreateProjectModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { project } = await api.projects.create({ name, description });
      onCreated(project);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>New project</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="pname">Name</label>
            <input
              id="pname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="pdesc">Description</label>
            <textarea
              id="pdesc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  const load = () => {
    setLoading(true);
    api.projects
      .list()
      .then(({ projects: list }) => setProjects(list))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div className="projects-page">
      <header className="page-header row">
        <div>
          <h1>Projects</h1>
          <p>Manage teams and tasks across projects</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setShowModal(true)}>
          + New project
        </button>
      </header>

      {loading && <p className="page-muted">Loading projects…</p>}
      {error && <p className="form-error">{error}</p>}

      {!loading && projects.length === 0 && (
        <div className="empty-state card">
          <p>No projects yet. Create your first project to get started.</p>
        </div>
      )}

      <div className="project-grid">
        {projects.map((p) => (
          <Link key={p.id} to={`/projects/${p.id}`} className="project-card card">
            <h3>{p.name}</h3>
            {p.description && <p className="project-desc">{p.description}</p>}
            <div className="project-meta">
              <span>{p._count?.tasks ?? 0} tasks</span>
              <span>{p.members?.length ?? 0} members</span>
            </div>
            <div className="project-stats">
              <span className="badge badge-todo">{p.taskStats?.todo ?? 0} todo</span>
              <span className="badge badge-progress">
                {p.taskStats?.inProgress ?? 0} active
              </span>
              <span className="badge badge-done">{p.taskStats?.done ?? 0} done</span>
            </div>
          </Link>
        ))}
      </div>

      {showModal && (
        <CreateProjectModal
          onClose={() => setShowModal(false)}
          onCreated={(p) => setProjects((prev) => [p, ...prev])}
        />
      )}
    </div>
  );
}
