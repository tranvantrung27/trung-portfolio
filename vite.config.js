import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  // Use './' for relative paths so it works on any sub-path (GitHub Pages or Custom Domain)
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
});
