import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: 3007
  },
  preview: {
    port: 3007
  },
  plugins: [react()],
  base: '/poa/'
});