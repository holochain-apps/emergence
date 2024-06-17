import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { version } from './package.json';  // Import version from package.json

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
  build: {
    minify: false
  },
  server: {
    hmr: {
        host: 'localhost',
    },
    watch: {
        usePolling: true
    }
  },
  define: {
    '__APP_VERSION__': JSON.stringify(version)  // Define a global constant
  },
});

