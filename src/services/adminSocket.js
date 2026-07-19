// src/services/adminSocket.js
import { io } from 'socket.io-client';

// base like http://192.168.1.5:5050/api -> http://192.168.1.5:5050
const RAW_API = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
const SOCKET_URL = RAW_API.replace(/\/api\/?$/, '');

export const adminSocket = io(SOCKET_URL, {
  transports: ['websocket'],
  autoConnect: true,
});
