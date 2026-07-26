// src/services/api.js
import axios from 'axios';

// Prefer env, fall back to localhost:5050/api
const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5050/api';

console.log('[VanishLink] API_URL =', API_URL);

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Required for secure sharing device cookies
});

export default api;
