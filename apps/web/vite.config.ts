import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const rootEnv = loadEnv(mode, '../../', '');
  const appEnv = loadEnv(mode, __dirname, '');
  const internalApiProxyTarget =
    process.env.INTERNAL_API_PROXY_TARGET ||
    appEnv.INTERNAL_API_PROXY_TARGET ||
    rootEnv.INTERNAL_API_PROXY_TARGET ||
    'http://127.0.0.1:3001';

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: [
        'gestionrequerimientos.onrender.com',
        '.onrender.com',
      ],
      proxy: {
        '/api': {
          target: internalApiProxyTarget,
          changeOrigin: true,
        },
      },
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(rootEnv.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(rootEnv.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@areas': path.resolve(__dirname, './src/areas'),
        '@shared': path.resolve(__dirname, './src/shared'),
        '@contracts': path.resolve(__dirname, '../../packages/contracts/src'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
        },
      },
    },
    preview: {
      port: 3000,
      host: '0.0.0.0',
    },
  };
});











