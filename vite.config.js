import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  // Use './' for relative paths so it works on any sub-path (GitHub Pages or Custom Domain)
  // Use the repository name for the base path on GitHub Pages
  base: process.env.NODE_ENV === 'production' ? '/trung-portfolio/' : '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        myhome: resolve(__dirname, 'myhome/index.html'),
      },
    },
  }
});
