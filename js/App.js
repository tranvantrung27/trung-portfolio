import * as THREE from 'three';
import { SceneManager } from './core/Engine.js';
import { MODELS } from './config/models.js';
import { Robot } from './entities/Robot.js';
import { Mosquito } from './entities/Mosquito.js';
import { Gun } from './entities/Gun.js';
import { Arcade } from './entities/Arcade.js';
import { ScrollManager } from './managers/ScrollManager.js';
import { UIManager } from './ui/Navbar.js';
import { renderContent } from './ui/ContentRenderer.js';
import { RobotChat } from './ui/RobotChat.js';
import { leaderboardMgr } from './managers/LeaderboardManager.js';
import { ProjectModal } from './ui/ProjectModal.js';
import { GameManager } from './games/GameManager.js';
import { config } from './utils/utils.js';
import { gsap } from 'gsap';

/**
 * MASTER APP CLASS
 * Orchestrates the entire 3D Portfolio ecosystem.
 * Following Big Project Standards: Separation of concerns, lifecycle management.
 */
export default class App {
  constructor() {
    this.canvas = document.querySelector('#bg');
    this.clock = new THREE.Clock();

    // Systems
    this.sceneManager = null;
    this.gameManager = null;
    this.scrollManager = null;
    this.uiManager = null;
    this.robotChat = null;
    this.projectModal = null;

    // Entities
    this.robot = null;
    this.gun = null;
    this.mosquito = null;
    this.arcade = null;

    // State
    this.isGameActive = false;
    this.arcadeIsOpen = false;
    this.isArcadeGameRunning = true;
    this.arcadeHovered = false;
    this.isGameOverProcessed = false;
    this.scoreModalTimeout = null; // Quản lý timeout của bảng điểm

    // Nhạc nền phòng Arcade (Chỉ kêu khi giao diện ở Menu Game)
    this.arcadeMenuAudio = new Audio('./assets/sounds/gaming-sounds.mp3');
    this.arcadeMenuAudio.loop = true;
    this.arcadeMenuAudio.volume = 0.6;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // EXPOSE FOR GLOBAL CLEANUP (Leaderboard resets)
    window.portfolioApp = this;
  }

  /**
   * Initialize all masters and start the loop
   */
  async init() {
    this.projectModal = new ProjectModal(() => {
      if (this.robot) this.robot.setPresenting(false);
    });

    renderContent((project, element) => {
      this.projectModal.open(project, element);
      if (this.robot) this.robot.setPresenting(true);
    });

    this.sceneManager = new SceneManager(this.canvas);
    this.gameManager = new GameManager();

    // Link gameManager to Arcade texture updates
    this.gameManager.onUpdateCallback = (canvas) => {
      if (this.arcade) this.arcade.updateGameTexture(canvas);
    };

    this.gameManager.onGameOver = () => {
      if (this.isGameOverProcessed) return;
      this.isGameOverProcessed = true;

      const finalScore = this.gameManager.currentGame?.score;

      if (finalScore > 0 && leaderboardMgr.playerName) {
        leaderboardMgr.saveScoreSilently(finalScore);
      }

      if (this.arcade && this.arcadeIsOpen && this.gameManager.currentGameId === 'snake') {
        this.arcade.triggerJumpScare(this.sceneManager.cameraCtrl);

        if (!document.getElementById('jumpscare-overlay')) {
          const overlay = document.createElement('div');
          overlay.id = 'jumpscare-overlay';
          overlay.style.position = 'fixed';
          overlay.style.top = '0';
          overlay.style.left = '0';
          overlay.style.width = '100vw';
          overlay.style.height = '100vh';
          overlay.style.display = 'flex';
          overlay.style.flexDirection = 'column';
          overlay.style.justifyContent = 'center';
          overlay.style.alignItems = 'center';
          overlay.style.pointerEvents = 'none';
          overlay.style.zIndex = '99999';

          overlay.innerHTML = `
            <style>
              @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0; } 100% { opacity: 1; } }
            </style>
            <h1 style="color: #ff3333; font-family: 'Courier New', monospace; font-size: 80px; text-shadow: 0 0 20px #ff3333, 0 0 40px #ff0000; margin: 0;">GAME OVER</h1>
            <p style="color: white; font-family: 'Courier New', monospace; font-size: 30px; animation: blink 1.5s infinite; text-shadow: 0 0 10px white; margin-top: 20px;">PRESS SPACE TO RESTART</p>
          `;
          document.body.appendChild(overlay);
        }

        if (finalScore > 0 && !leaderboardMgr.playerName) {
          this.scoreModalTimeout = setTimeout(() => {
            if (this.arcadeIsOpen) {
              leaderboardMgr.showSubmitModal(finalScore);
            }
          }, 2500);
        }
      }
    };

    this.gameManager.onGameRestart = () => {
      this.isGameOverProcessed = false;

      if (this.scoreModalTimeout) {
        clearTimeout(this.scoreModalTimeout);
        this.scoreModalTimeout = null;
      }

      leaderboardMgr.hideModal();

      if (this.arcade) {
        this.arcade.resetJumpScare();
      }
      const overlay = document.getElementById('jumpscare-overlay');
      if (overlay) overlay.remove();
    };

    this.gameManager.onGameLoad = (gameId) => {
      if (this.arcadeMenuAudio) this.arcadeMenuAudio.pause();
    };

    this.gameManager.onGameExit = () => {
      if (this.arcadeMenuAudio && this.arcadeIsOpen) {
        this.arcadeMenuAudio.currentTime = 0;
        this.arcadeMenuAudio.play().catch(e => console.warn(e));
      }
    };

    this.setupEntities();
    this.setupEvents();
    this.loadAssets();
  }

  setupEntities() {
    const scene = this.sceneManager.scene;
    const cam = this.sceneManager.cameraCtrl.camera;
    const renderer = this.sceneManager.renderer;

    this.robot = new Robot(scene);
    this.gun = new Gun(renderer, cam);
    this.mosquito = new Mosquito(scene, cam);
    this.arcade = new Arcade(scene);
    window.arcade = this.arcade;
  }

  loadAssets() {
    // Safety Timeout: Force hide loader after 10s if assets hang
    const safetyTimeout = setTimeout(() => {
      console.warn('[App] Loading safety timeout reached. Forcing UI...');
      this.hideLoader();
    }, 5000);

    this.robot.load(MODELS.CHARACTERS.ROBOT, () => {
      clearTimeout(safetyTimeout);
      this.arcade.load(MODELS.CHARACTERS.ARCADE);

      this.scrollManager = new ScrollManager(
        this.robot, this.gun, this.mosquito, this.arcade,
        () => this.isGameActive
      );

      this.uiManager = new UIManager();
      this.robotChat = new RobotChat(this.robot);

      this.startLoop();
      this.hideLoader();
    });
  }

  setupEvents() {
    window.addEventListener('resize', () => this.sceneManager.onResize());

    window.addEventListener('pointermove', (e) => this.handlePointerMove(e));
    window.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));

    document.getElementById('arcade-close')?.addEventListener('click', () => this.closeArcade());
  }

  handlePointerMove(e) {
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = -(e.clientY / window.innerHeight) * 2 + 1;
    this.mouse.set(nx, ny);

    if (this.robot) this.robot.setMouseTarget(nx, ny);

    const cam = this.sceneManager.cameraCtrl.camera;

    if (this.arcade.loaded && this.arcade.isHome && !this.arcadeIsOpen) {
      this.raycaster.setFromCamera(this.mouse, cam);
      const hits = this.raycaster.intersectObjects(this.arcade.meshes, false);
      const nowHovered = hits.length > 0;

      if (nowHovered !== this.arcadeHovered) {
        this.arcadeHovered = nowHovered;
        this.arcade.setHover(this.arcadeHovered, this.sceneManager.outlinePass);
      }
    } else if (this.arcadeHovered) {
      this.arcadeHovered = false;
      this.arcade.setHover(false, this.sceneManager.outlinePass);
    }

    if (this.isGameActive) {
      this.gun.updatePointer(nx, ny);
    }
  }

  handlePointerDown(e) {
    if (e.button !== 0 || this.arcadeIsOpen) return;

    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = -(e.clientY / window.innerHeight) * 2 + 1;
    const cam = this.sceneManager.cameraCtrl.camera;

    if (!this.isGameActive && this.arcade.loaded && this.arcade.isHome) {
      this.raycaster.setFromCamera(new THREE.Vector2(nx, ny), cam);
      const hits = this.raycaster.intersectObjects(this.arcade.meshes, false);
      if (hits.length > 0) {
        this.openArcade();
        return;
      }
    }

    if (this.isGameActive) {
      const isGunInteraction = this.gun.handleClick(nx, ny);
      if (!isGunInteraction) {
        this.gun.triggerFire();
        this.mosquito.checkHit(this.gun.muzzleNDC);
      }
    }
  }

  handleKeyDown(e) {
    if (this.arcadeIsOpen) {
      // If Esc is pressed and we are already in menu mode, close the arcade machine
      if (e.code === 'Escape' && this.gameManager.isMenuMode) {
        this.closeArcade();
        return;
      }

      this.gameManager.handleInput(e.code);

      const blockKeys = ['ArrowUp', 'ArrowDown', 'Space', 'Enter', 'PageUp', 'PageDown'];
      if (blockKeys.includes(e.code)) {
        e.preventDefault();
      }
    }
  }

  openArcade() {
    this.arcadeIsOpen = true;
    this.isArcadeGameRunning = true;
    this.arcade.openArcade(this.sceneManager.cameraCtrl);

    if (this.robot) {
      this.robot.group.visible = false;
    }

    clearTimeout(this._arcadeMusicTimeout);
    this._arcadeMusicTimeout = setTimeout(() => {
      if (this.arcadeIsOpen && this.gameManager.isMenuMode && this.arcadeMenuAudio) {
        this.arcadeMenuAudio.play().catch(e => console.warn(e));
      }

      leaderboardMgr.setVisible(true);
      leaderboardMgr.incrementPlays();
    }, 1400);
  }

  closeArcade() {
    const rp = this.robot.group.position;
    const homeTarget = { x: rp.x * 0.12 + 0.3, y: 0.9, z: 7 };
    const homeLookAt = { x: rp.x * 0.25, y: 0.3, z: rp.z };

    this.arcade.closeArcade(this.sceneManager.cameraCtrl, homeTarget, homeLookAt, () => {
      this.arcadeIsOpen = false;
      if (this.robot) {
        this.robot.group.visible = true;
      }
    });

    if (this.arcade) {
      this.arcade.resetJumpScare();
    }
    const overlay = document.getElementById('jumpscare-overlay');
    if (overlay) overlay.remove();

    clearTimeout(this._arcadeMusicTimeout);
    if (this.arcadeMenuAudio) {
      this.arcadeMenuAudio.pause();
    }

    leaderboardMgr.setVisible(false);
  }

  startLoop() {
    const tick = () => {
      const dt = this.clock.getDelta();
      const elapsed = this.clock.elapsedTime;

      this.robot.update(dt, elapsed);
      this.arcade.update(dt, this.isArcadeGameRunning);

      if (this.isArcadeGameRunning) {
        this.gameManager.update(dt);
      }

      if (this.isGameActive) {
        this.gun.update(dt);
        this.mosquito.update(dt);
      }

      if (!this.arcadeIsOpen) {
        const rp = this.robot.group.position;
        this.sceneManager.cameraCtrl.setTarget(rp.x * 0.12 + 0.3, 0.9, 7);
        this.sceneManager.cameraCtrl.setLookAt(rp.x * 0.25, 0.3, rp.z);
      }

      // Chat & UI
      const cam = this.sceneManager.cameraCtrl.camera;
      this.robotChat.update(cam, this.arcadeIsOpen, this.arcadeHovered);
      this.sceneManager.cameraCtrl.update(dt);

      // Background Particles
      if (this.sceneManager.scene.userData.particles) {
        const p = this.sceneManager.scene.userData.particles;
        p.rotation.y += dt * 0.03;
        p.rotation.x += dt * 0.01;
      }

      this.sceneManager.render();
      this.gun.renderHUD();

      requestAnimationFrame(tick);
    };

    tick();
  }

  hideLoader() {
    const loader = document.querySelector('#loader');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => loader.remove(), 800);
    }
  }
}
