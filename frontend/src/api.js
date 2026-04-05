import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000,
});

export const analyzeText = async (text) => {
  const formData = new FormData();
  formData.append('text', text);
  const response = await api.post('/api/analyze/detail', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const analyzeFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/api/analyze/detail', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export default api;
