import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import './ProjectDetail.css';

const STATUSES = [
  { value: 'TODO', label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'DONE', label: 'Done' },
];

function StatusBadge({ status }) {
  const map = {
    TODO: 'badge-todo',
    IN_PROGRESS: 'badge-progress',
    DONE: 'badge-done',
  };
  const label = STATUSES.find((s) => s.value === status)?.label || status;
  return <span className={`badge ${map[status]}`}>{label}</span>;
}

export default function ProjectDetail() {
  const { user } = useAuth();
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [membership, setMembership] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('tasks');

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    status: 'TODO',
    dueDate: '',
    assigneeId: '',
  });
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('MEMBER');
  const [formError, setFormError] = useState('');

  const isAdmin = membership?.role === 'ADMIN';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [projRes, tasksRes] = await Promise.all([
        api.projects.get(projectId),
        api.tasks.list(projectId),
      ]);
      setProject(projRes.project);
      setMembership(projRes.membership);
      setTasks(tasksRes.tasks);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      const body = {
        title: taskForm.title,
        description: taskForm.description || undefined,
        status: taskForm.status,
        dueDate: taskForm.dueDate || undefined,
        assigneeId: taskForm.assigneeId || undefined,
      };
      const { task } = await api.tasks.create(projectId, body);
      setTasks((prev) => [...prev, task]);
      setShowTaskModal(false);
      setTaskForm({ title: '', description: '', status: 'TODO', dueDate: '', assigneeId: '' });
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleStatusChange = async (task, status) => {
    try {
      const { task: updated } = await api.tasks.update(projectId, task.id, { status });
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await api.projects.addMember(projectId, { email: memberEmail, role: memberRole });
      await load();
      setShowMemberModal(false);
      setMemberEmail('');
      setMemberRole('MEMBER');
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleRoleChange = async (memberId, role) => {
    try {
      await api.projects.updateMember(projectId, memberId, { role });
      await load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm('Remove this member from the project?')) return;
    try {
      await api.projects.removeMember(projectId, memberId);
      await load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.tasks.remove(projectId, taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <p className="page-muted">Loading project…</p>;
  if (error) return <p className="form-error">{error}</p>;
  if (!project) return null;

  const members = project.members || [];

  return (
    <div className="project-detail">
      <Link to="/projects" className="back-link">
        ← Back to projects
      </Link>

      <header className="project-header">
        <div>
          <h1>{project.name}</h1>
          {project.description && <p className="project-desc">{project.description}</p>}
          <span className={`badge ${isAdmin ? 'badge-admin' : 'badge-member'}`}>
            {isAdmin ? 'Admin' : 'Member'}
          </span>
        </div>
        <div className="header-actions">
          {tab === 'tasks' && (
            <button type="button" className="btn-primary" onClick={() => setShowTaskModal(true)}>
              + Add task
            </button>
          )}
          {tab === 'team' && isAdmin && (
            <button type="button" className="btn-primary" onClick={() => setShowMemberModal(true)}>
              + Add member
            </button>
          )}
        </div>
      </header>

      <div className="tabs">
        <button
          type="button"
          className={tab === 'tasks' ? 'active' : ''}
          onClick={() => setTab('tasks')}
        >
          Tasks ({tasks.length})
        </button>
        <button
          type="button"
          className={tab === 'team' ? 'active' : ''}
          onClick={() => setTab('team')}
        >
          Team ({members.length})
        </button>
      </div>

      {tab === 'tasks' && (
        <div className="tasks-board">
          {tasks.length === 0 ? (
            <p className="empty-state card">No tasks yet. Create one to get started.</p>
          ) : (
            tasks.map((task) => {
              const overdue =
                task.dueDate &&
                new Date(task.dueDate) < new Date() &&
                task.status !== 'DONE';
              return (
                <div
                  key={task.id}
                  className={`task-card card status-${task.status.toLowerCase()}`}
                >
                  <div className="task-card-header">
                    <h3>{task.title}</h3>
                    <StatusBadge status={task.status} />
                  </div>
                  {task.description && (
                    <p className="task-card-desc">{task.description}</p>
                  )}
                  <div className="task-card-meta">
                    {task.assignee && (
                      <span>Assigned: {task.assignee.name}</span>
                    )}
                    {task.dueDate && (
                      <span className={overdue ? 'overdue' : ''}>
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                        {overdue && ' (overdue)'}
                      </span>
                    )}
                  </div>
                  <div className="task-card-actions">
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task, e.target.value)}
                      disabled={
                        !isAdmin &&
                        task.assigneeId !== user?.id &&
                        task.createdById !== user?.id
                      }
                    >
                      {STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    {isAdmin && (
                      <button
                        type="button"
                        className="btn-danger btn-sm"
                        onClick={() => handleDeleteTask(task.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === 'team' && (
        <div className="members-list">
          {members.map((m) => (
            <div key={m.id} className="member-card card">
              <div className="member-info">
                <span className="member-name">{m.user.name}</span>
                <span className="member-email">{m.user.email}</span>
              </div>
              <div className="member-actions">
                <span className={`badge ${m.role === 'ADMIN' ? 'badge-admin' : 'badge-member'}`}>
                  {m.role}
                </span>
                {isAdmin && m.userId !== membership?.userId && (
                  <>
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.id, e.target.value)}
                      className="role-select"
                    >
                      <option value="MEMBER">Member</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                    <button
                      type="button"
                      className="btn-danger btn-sm"
                      onClick={() => handleRemoveMember(m.id)}
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showTaskModal && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>New task</h2>
            <form onSubmit={handleCreateTask}>
              <div className="form-group">
                <label>Title</label>
                <input
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  rows={3}
                  value={taskForm.description}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, description: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={taskForm.status}
                  onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Due date</label>
                <input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Assign to</label>
                <select
                  value={taskForm.assigneeId}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, assigneeId: e.target.value })
                  }
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.user.id} value={m.user.id}>
                      {m.user.name}
                    </option>
                  ))}
                </select>
              </div>
              {formError && <p className="form-error">{formError}</p>}
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowTaskModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMemberModal && (
        <div className="modal-overlay" onClick={() => setShowMemberModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add team member</h2>
            <p className="modal-hint">User must already have an account.</p>
            <form onSubmit={handleAddMember}>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={memberRole} onChange={(e) => setMemberRole(e.target.value)}>
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              {formError && <p className="form-error">{formError}</p>}
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowMemberModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Add member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
