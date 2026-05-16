const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      data.error ||
      data.errors?.[0]?.msg ||
      `Request failed (${res.status})`;
    throw new Error(message);
  }

  return data;
}

export const api = {
  signup: (body) => request('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),
  dashboard: () => request('/dashboard'),
  projects: {
    list: () => request('/projects'),
    get: (id) => request(`/projects/${id}`),
    create: (body) => request('/projects', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) =>
      request(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    remove: (id) => request(`/projects/${id}`, { method: 'DELETE' }),
    addMember: (id, body) =>
      request(`/projects/${id}/members`, { method: 'POST', body: JSON.stringify(body) }),
    updateMember: (projectId, memberId, body) =>
      request(`/projects/${projectId}/members/${memberId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    removeMember: (projectId, memberId) =>
      request(`/projects/${projectId}/members/${memberId}`, { method: 'DELETE' }),
  },
  tasks: {
    list: (projectId, params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request(`/projects/${projectId}/tasks${q ? `?${q}` : ''}`);
    },
    create: (projectId, body) =>
      request(`/projects/${projectId}/tasks`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    update: (projectId, taskId, body) =>
      request(`/projects/${projectId}/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    remove: (projectId, taskId) =>
      request(`/projects/${projectId}/tasks/${taskId}`, { method: 'DELETE' }),
  },
};
