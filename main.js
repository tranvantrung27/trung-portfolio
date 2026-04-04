import { SceneManager } from './js/core/engine.js';
import { Robot } from './js/objects/robot.js';
import { ScrollManager } from './js/animation/scroll.js';
import { UIManager } from './js/ui/navbar.js';
import { renderContent } from './js/ui/renderer.js';
import * as THREE from 'three';

/**
 * ROBOT PORTFOLIO — Entry Point (Static / GitHub Pages Ready)
 */

renderContent();

const canvas = document.querySelector('#bg');
const sceneManager = new SceneManager(canvas);
const clock = new THREE.Clock();

const robot = new Robot(sceneManager.scene);

robot.load('./assets/robot_animated.glb', () => {
  const scrollManager = new ScrollManager(robot);
  const ui = new UIManager();

  window.addEventListener('resize', () => sceneManager.onResize());

  function tick() {
    const dt = clock.getDelta();
    const elapsed = clock.elapsedTime;

    robot.update(dt, elapsed);

    const rp = robot.group.position;
    sceneManager.cameraCtrl.setTarget(rp.x * 0.12 + 0.3, 0.9, 7);
    sceneManager.cameraCtrl.setLookAt(rp.x * 0.25, 0.3, rp.z);
    sceneManager.cameraCtrl.update(dt);

    sceneManager.render();
    requestAnimationFrame(tick);
  }

  tick();

  const loader = document.querySelector('#loader');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => loader.remove(), 800);
  }
});
