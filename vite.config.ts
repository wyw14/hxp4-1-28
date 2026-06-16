import { defineConfig } from 'vite';

export default defineConfig({
  root: 'client',
  server: {
    port: 41028,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:42028',
        changeOrigin: true
      }
    }
  }
});
