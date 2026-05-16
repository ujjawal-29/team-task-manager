import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import './Dashboard.css';

function StatusBadge({ status }) {
  const map = {
    TODO: ['badge-todo', 'To Do'],
    IN_PROGRESS: ['badge-progress', 'In Progress'],
    DONE: ['badge-done', 'Done'],
  };
  const [cls, label] = map[status] || ['badge-todo', status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

function TaskRow({ task }) {
  const overdue =
    task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';

  return (
    <Link to={`/projects/${task.project.id}`} className={`task-row card status-${task.status.toLowerCase()}`}>
      <div className="task-row-main">
        <span className="task-title">{task.title}</span>
        <span className="task-project">{task.project.name}</span>
      </div>
      <div className="task-row-meta">
        <StatusBadge status={task.status} />
        {task.assignee && <span className="task-assignee">{task.assignee.name}</span>}
        {task.dueDate && (
          <span className={overdue ? 'due overdue' : 'due'}>
            {overdue ? 'Overdue: ' : 'Due: '}
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .dashboard()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="page-muted">Loading dashboard…</p>;
  if (error) return <p className="form-error">{error}</p>;
  if (!data) return null;

  const { summary, overdueTasks, myTasks, recentTasks } = data;

  return (
    <div className="dashboard">
      <header className="page-header">
        <h1>Dashboard</h1>
        <p>Overview of your projects and tasks</p>
      </header>

      <div className="stats-grid">
        <div className="stat-card card">
          <span className="stat-value">{summary.totalProjects}</span>
          <span className="stat-label">Projects</span>
        </div>
        <div className="stat-card card">
          <span className="stat-value">{summary.totalTasks}</span>
          <span className="stat-label">Total tasks</span>
        </div>
        <div className="stat-card card highlight">
          <span className="stat-value">{summary.myTasks}</span>
          <span className="stat-label">Assigned to me</span>
        </div>
        <div className="stat-card card danger">
          <span className="stat-value">{summary.overdue}</span>
          <span className="stat-label">Overdue</span>
        </div>
      </div>

      <div className="status-breakdown card">
        <h2>Tasks by status</h2>
        <div className="status-bars">
          {['TODO', 'IN_PROGRESS', 'DONE'].map((s) => (
            <div key={s} className="status-bar-item">
              <StatusBadge status={s} />
              <span className="status-count">{summary.byStatus[s]}</span>
            </div>
          ))}
        </div>
      </div>

      {overdueTasks.length > 0 && (
        <section className="dashboard-section">
          <h2>
            Overdue tasks
            <span className="badge badge-overdue">{overdueTasks.length}</span>
          </h2>
          <div className="task-list">
            {overdueTasks.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </div>
        </section>
      )}

      <section className="dashboard-section">
        <h2>My open tasks</h2>
        {myTasks.length === 0 ? (
          <p className="empty-state">No tasks assigned to you.</p>
        ) : (
          <div className="task-list">
            {myTasks.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-section">
        <h2>Recent activity</h2>
        {recentTasks.length === 0 ? (
          <p className="empty-state">No tasks yet. Create a project to get started.</p>
        ) : (
          <div className="task-list">
            {recentTasks.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
