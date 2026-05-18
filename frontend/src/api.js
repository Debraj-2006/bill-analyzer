// src/api.js — Centralized Axios instance
// Points to the deployed Render backend via VITE_API_URL environment variable.
// Falls back to localhost:8000 for local development.

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
  // Render free tier has a cold-start delay — give it up to 30 s
  timeout: 30000,
});

// Inject JWT token from localStorage into every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirect to /login on 401 Unauthorized, except when authenticating
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isLoginRequest = error.config?.url?.includes('/api/v1/auth/login');
      const isLoginPage = window.location.pathname === '/login';

      if (!isLoginRequest && !isLoginPage) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
