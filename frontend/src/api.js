import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000,
});

export const analyzeText = async (text, projectName) => {
  const formData = new FormData();
  formData.append('text', text);
  if (projectName) formData.append('project_name', projectName);
  const response = await api.post('/api/analyze', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const analyzeFile = async (file, projectName) => {
  const formData = new FormData();
  formData.append('file', file);
  if (projectName) formData.append('project_name', projectName);
  const response = await api.post('/api/analyze', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const analyzeManual = async (payload) => {
  const response = await api.post('/api/analyze/manual', payload);
  return response.data;
};

export const listProjects = async () => {
  const response = await api.get('/api/projects');
  return response.data;
};

export const getProjectDetail = async (projectId) => {
  const response = await api.get(`/api/projects/${projectId}`);
  return response.data;
};

export const exportProjectPdf = async (projectId) => {
  const response = await api.get(`/api/projects/${projectId}/export/pdf`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `ucp_report_${projectId}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const deleteProject = async (projectId) => {
  const response = await api.delete(`/api/projects/${projectId}`);
  return response.data;
};

export default api;
