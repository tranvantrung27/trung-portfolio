import App from './App.js';

/**
 * ENTRY POINT
 * Initializes the Master App Class.
 * Following Big Project Standards: Minimalism at the entry hook.
 */
const app = new App();

// Execute the application cycle
app.init().catch(err => {
  console.error('Failed to initialize Portfolio App:', err);
});
