// ============================================================================
// Axios API Client
// ============================================================================
// Creates a pre-configured Axios instance for all API calls.
//
// Features:
//   - Base URL set to the backend server
//   - Automatically attaches JWT token to every request
//   - Handles 401 (unauthorized) errors globally
//
// All other service files (auth.service, chat.service, etc.) import this
// instance instead of using raw axios. This ensures consistent configuration.
// ============================================================================

import axios from 'axios';

// The API base URL. Can be overridden via environment variable.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create an Axios instance with default settings
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request Interceptor ─────────────────────────────────────────────────────
// Runs BEFORE every request. Automatically adds the JWT token
// from localStorage to the Authorization header.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response Interceptor ────────────────────────────────────────────────────
// Runs AFTER every response. If we get a 401 (unauthorized),
// clear the token and redirect to login.
api.interceptors.response.use(
  (response) => response, // Pass successful responses through
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // Only redirect if not already on login/register page
      if (!window.location.pathname.includes('/login') &&
          !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
