import axios from 'axios';

// In local dev, Vite's proxy (see vite.config.js) forwards '/api' to
// http://localhost:4000, so the default keeps working with no env var set.
// In production (Netlify frontend + Render backend on different domains),
// set VITE_API_BASE_URL in Netlify's environment variables to your Render
// backend URL, e.g. https://hrsofttech-backend.onrender.com/api
const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
