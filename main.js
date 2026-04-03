// main.js - Entry Point
import { SceneManager } from './src/core/engine.js'; 
import { Car } from './src/objects/car.js';
import { AnimationManager } from './src/animation/scroll.js';
import { UIManager } from './src/ui/navbar.js';

/**
 * ========================================
 * 3D PORTFOLIO ORCHESTRATOR
 * ========================================
 */

const canvas = document.querySelector('#bg');
const sceneManager = new SceneManager(canvas);

// Load the Highly-Detailed Bugatti Model
const GLB_URL = './bugatti_veyron__racing_car_-_unityunreal.glb';

sceneManager.loadModel(Car, GLB_URL, (car) => {
    console.log('Bugatti model loaded successfully.');
    
    // Enable Bloom (Glow) for the signature look - Step 5
    sceneManager.renderer.toggleBloom(true);
    
    // Initialize Animation & UI Layers after model is ready
    const animationManager = new AnimationManager(sceneManager);
    const uiManager = new UIManager();

    // Handle Window Resize
    window.addEventListener('resize', () => sceneManager.onResize());

    // Main Animation Loop
    function tick() {
        const dt = 0.016; 
        
        // Update modules
        animationManager.update(dt);
        sceneManager.cameraCtrl.update(dt);
        
        // Render current state
        sceneManager.render();
        
        requestAnimationFrame(tick);
    }
    
    // Kickstart the experience
    tick();

    // Fade out initial static loader state if any
    const loader = document.querySelector('#loader');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 1000);
    }
});
