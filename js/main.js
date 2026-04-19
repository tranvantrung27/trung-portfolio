import App from './App.js';
import { initLoaderParticles } from './utils/loader-particles.js';

// Khởi chạy hệ thống hạt lấp lánh cho màn hình chờ ngay lập tức
initLoaderParticles('loader-canvas');

/**
 * ENTRY POINT
 * Initializes the Master App Class.
 */
const app = new App();
app.init().catch(err => {
  console.error('Failed to initialize Portfolio App:', err);
});
