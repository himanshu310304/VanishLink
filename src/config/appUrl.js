// src/config/appUrl.js
// Computes the base URL used in short links / QR codes

const DEV_LAN_IP = import.meta.env.VITE_DEV_LAN_IP;
const VITE_DEV_PORT = import.meta.env.VITE_DEV_PORT || '5173'; // fallback to default dev port
let APP_BASE_URL = import.meta.env.VITE_APP_URL;

// If VITE_APP_URL is not set, fall back smartly
if (!APP_BASE_URL) {
  if (DEV_LAN_IP) {
    // Dev LAN mode – use LAN IP with dev port
    APP_BASE_URL = `http://${DEV_LAN_IP}:${VITE_DEV_PORT}`;
  } else {
    // Default to current origin (localhost in dev, real domain in prod)
    APP_BASE_URL = window.location.origin;
  }
}

export { APP_BASE_URL };
