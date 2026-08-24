import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const NEXTCLOUD_URL = 'http://10.147.17.1:7580';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    host: true,
    proxy: {
      '/remote.php': {
        target: NEXTCLOUD_URL,
        changeOrigin: true,
      },
      '/ocs': {
        target: NEXTCLOUD_URL,
        changeOrigin: true,
      },
      '/s/': {
        target: NEXTCLOUD_URL,
        changeOrigin: true,
      },
      '/index.php': {
        target: NEXTCLOUD_URL,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            // Remove frame blocking so OnlyOffice embeds seamlessly in Govind Drive
            delete proxyRes.headers['x-frame-options'];
            delete proxyRes.headers['content-security-policy'];
          });
        },
      },
      '/apps': {
        target: NEXTCLOUD_URL,
        changeOrigin: true,
      },
      '/core': {
        target: NEXTCLOUD_URL,
        changeOrigin: true,
      },
      '/dist': {
        target: NEXTCLOUD_URL,
        changeOrigin: true,
      },
      '/custom_apps': {
        target: NEXTCLOUD_URL,
        changeOrigin: true,
      },
    },
  },
});
