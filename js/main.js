import { SceneManager } from './core/Engine.js';
import { MODELS } from './config/models.js';
import { Robot } from './entities/Robot.js';
import { Mosquito } from './entities/Mosquito.js';
import { Gun } from './entities/Gun.js';
import { Arcade } from './entities/Arcade.js';
import { ScrollManager } from './managers/ScrollManager.js';
import { UIManager } from './ui/Navbar.js';
import { renderContent } from './ui/ContentRenderer.js';
import * as THREE from 'three';
import { RobotChat } from './ui/RobotChat.js';

/**
 * ROBOT PORTFOLIO — Entry Point
 */

renderContent();

const canvas = document.querySelector('#bg');
const sceneManager = new SceneManager(canvas);
const clock = new THREE.Clock();
const cam = sceneManager.cameraCtrl.camera;

// ─── 3D Objects ───────────────────────────────────────────────────────────────

const robot = new Robot(sceneManager.scene);
// Gun receives the renderer so it can render its own HUD scene on top
const gun = new Gun(sceneManager.renderer, cam);
const mosquito = new Mosquito(sceneManager.scene, cam);
const arcade = new Arcade(sceneManager.scene);
window.arcade = arcade; // Debug only

// ─── Game & HUD State ─────────────────────────────────────────────────────────

let isGameActive = false;
let arcadeIsOpen = false; // Disables camera follow while zoomed into arcade
const overlay = document.getElementById('game-overlay');
const btnYes = document.getElementById('game-yes');
const btnNo = document.getElementById('game-no');

function updateHUD(onHome) {
  const isVisible = isGameActive && onHome;
  if (isVisible) {
    gun.enable();
    mosquito.enable();
  } else {
    gun.disable();
    mosquito.disable();
  }
}

// ─── Mouse Pointer Control ───────────────────────────────────────────────────

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let arcadeHovered = false;

window.addEventListener('pointermove', (e) => {
  const nx = (e.clientX / window.innerWidth) * 2 - 1;
  const ny = -(e.clientY / window.innerHeight) * 2 + 1;
  mouse.set(nx, ny);

  // Arcade hover raycasting (only when loaded and on home)
  if (arcade.loaded && arcade.isHome) {
    raycaster.setFromCamera(mouse, cam);
    const hits = raycaster.intersectObjects(arcade.meshes, false);
    const nowHovered = hits.length > 0;
    if (nowHovered !== arcadeHovered) {
      arcadeHovered = nowHovered;
      arcade.setHover(arcadeHovered, sceneManager.outlinePass);
    }
  } else if (arcadeHovered) {
    arcadeHovered = false;
    arcade.setHover(false, sceneManager.outlinePass);
  }

  if (!isGameActive) return;
  gun.updatePointer(nx, ny);
});

window.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return;
  // Disable 3D interactions when arcade is zoomed
  if (arcadeIsOpen) return;

  const nx = (e.clientX / window.innerWidth) * 2 - 1;
  const ny = -(e.clientY / window.innerHeight) * 2 + 1;

  // Arcade click — only when not in game mode and arcade is visible on home
  if (!isGameActive && arcade.loaded && arcade.isHome) {
    raycaster.setFromCamera(new THREE.Vector2(nx, ny), cam);
    const arcadeHits = raycaster.intersectObjects(arcade.meshes, false);
    if (arcadeHits.length > 0) {
      arcadeIsOpen = true;
      arcade.openArcade(sceneManager.cameraCtrl);
      return;
    }
  }

  if (!isGameActive) return;

  // 1. Check if we are clicking the Gun itself for Inspection Mode
  const isGunInteraction = gun.handleClick(nx, ny);

  // 2. If it wasn't a gun click, proceed with Firing & Hit detection
  if (!isGunInteraction) {
    gun.triggerFire();
    mosquito.checkHit(gun.muzzleNDC);
  }
});

// ─── Browser Scroll & Interaction Locking ─────────────────────────────────────
const preventScroll = (e) => {
  if (arcadeIsOpen) e.preventDefault();
};

window.addEventListener('wheel', preventScroll, { passive: false });
window.addEventListener('touchmove', preventScroll, { passive: false });
window.addEventListener('keydown', (e) => {
  if (arcadeIsOpen) {
    const keys = ['ArrowUp', 'ArrowDown', 'Space', 'PageUp', 'PageDown', 'Home', 'End'];
    if (keys.includes(e.code)) e.preventDefault();
  }
});

// ─── Game Overlay Logic ───────────────────────────────────────────────────────

if (btnYes && btnNo && overlay) {
  btnYes.addEventListener('click', () => {
    isGameActive = true;
    overlay.classList.remove('visible');
    updateHUD(true);
  });

  btnNo.addEventListener('click', () => {
    isGameActive = false;
    overlay.classList.remove('visible');
    updateHUD(false);
  });
}

// ─── Arcade Close Button ──────────────────────────────────────────────────────

document.getElementById('arcade-close')?.addEventListener('click', () => {
  const rp = robot.group.position;
  const homeTarget = { x: rp.x * 0.12 + 0.3, y: 0.9, z: 7 };
  const homeLookAt = { x: rp.x * 0.25, y: 0.3, z: rp.z };

  arcade.closeArcade(sceneManager.cameraCtrl, homeTarget, homeLookAt, () => {
    arcadeIsOpen = false;
  });
});


robot.load(MODELS.CHARACTERS.ROBOT, () => {
  arcade.load(MODELS.CHARACTERS.ARCADE);
  const scrollManager = new ScrollManager(robot, gun, mosquito, arcade, () => isGameActive);

  const ui = new UIManager();
  window.addEventListener('resize', () => sceneManager.onResize());

  // Initialize modular Chat UI mapped to 3D Robot
  const robotChat = new RobotChat(robot);

  function tick() {
    const dt = clock.getDelta();
    robot.update(dt, clock.elapsedTime);

    // Update mini-game components
    arcade.update(dt);
    if (isGameActive) {
      gun.update(dt);
      mosquito.update(dt);
    }

    // Only follow robot with camera when not zoomed into arcade
    if (!arcadeIsOpen) {
      const rp = robot.group.position;
      sceneManager.cameraCtrl.setTarget(rp.x * 0.12 + 0.3, 0.9, 7);
      sceneManager.cameraCtrl.setLookAt(rp.x * 0.25, 0.3, rp.z);
    }

    // Call modular Chat logic with full state context
    robotChat.update(cam, arcadeIsOpen, arcadeHovered);

    sceneManager.cameraCtrl.update(dt);

    sceneManager.render();
    gun.renderHUD(); // Draw gun on top of main scene
    requestAnimationFrame(tick);
  }

  tick();

  const loader = document.querySelector('#loader');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => {
      loader.remove();
      // Show game starting prompt only after loader (DISABLED for now)
      if (overlay) overlay.classList.add('visible');
    }, 800);
  }
});
