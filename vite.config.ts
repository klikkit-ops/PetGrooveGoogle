import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Generate build version based on timestamp
  const buildVersion = mode === 'production' 
    ? Date.now().toString(36).toUpperCase() 
    : 'dev';
  const buildTime = new Date().toISOString();

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    define: {
      'import.meta.env.VITE_BUILD_VERSION': JSON.stringify(buildVersion),
      'import.meta.env.VITE_BUILD_TIME': JSON.stringify(buildTime),
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  };
});
