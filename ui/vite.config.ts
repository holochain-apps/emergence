import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

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
});

