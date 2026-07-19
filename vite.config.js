import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',   // allow LAN access e.g. 192.168.x.x
    port: 5173,        // 👈 change back to 5173
    strictPort: true,
  },
});
