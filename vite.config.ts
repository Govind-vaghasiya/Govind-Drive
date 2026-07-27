import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fork, ChildProcess } from 'child_process';
import path from 'path';

function expressServerPlugin(): Plugin {
  let serverProcess: ChildProcess | null = null;

  const startServer = () => {
    if (serverProcess) return;
    try {
      serverProcess = fork(path.resolve(__dirname, 'server.js'), [], {
        stdio: 'inherit',
      });
      console.log('🚀 Express backend server automatically started on port 3001');
    } catch (err) {
      console.error('Failed to start Express backend server:', err);
    }
  };

  return {
    name: 'express-server-plugin',
    configureServer(server) {
      startServer();

      server.httpServer?.on('close', () => {
        if (serverProcess) {
          serverProcess.kill();
          serverProcess = null;
        }
      });
    },
    configurePreviewServer(server) {
      startServer();

      server.httpServer?.on('close', () => {
        if (serverProcess) {
          serverProcess.kill();
          serverProcess = null;
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), expressServerPlugin()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});

