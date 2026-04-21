import { gsap } from 'gsap';
import { SOUNDS } from '../managers/SoundManager.js';
import { leaderboardMgr } from '../managers/LeaderboardManager.js';

/**
 * Handles all cinematic transitions and high-level view states.
 * (Arcade Menu, Go Home View, AI Interaction Layouts)
 */
export class ViewManager {
  constructor(app) {
    this.app = app;

    // Arcade Menu Music
    this.arcadeMenuAudio = new Audio('./assets/sounds/gaming-sounds.mp3');
    this.arcadeMenuAudio.loop = true;
    this.arcadeMenuAudio.volume = 0.6;

    this._arcadeMusicTimeout = null;
    this.isTransitioning = false;

    this.createGoHomeBackButton();
  }

  createGoHomeBackButton() {
    this.backBtn = document.createElement('button');
    this.backBtn.id = 'go-home-back-btn';
    this.backBtn.innerHTML = '←';
    this.backBtn.title = 'Back to Portfolio';
    this.backBtn.addEventListener('click', () => {
      // Use pushState/popstate compatible navigation
      if (window.location.hash === '#gohome') {
        window.history.back();
      } else {
        this.toggleGoHomeView(false);
      }
    });
    document.body.appendChild(this.backBtn);
  }

  animateDoorEntrance() {
      if (!this.app.doraemonDoor) return;
      this.app.doraemonDoor.group.visible = true;
      gsap.fromTo(this.app.doraemonDoor.group.scale,
        { x: 0, y: 0, z: 0 },
        {
          x: 1.5,
          y: 1.5,
          z: 1.5,
          duration: 1.0,
          delay: 0.2,
          ease: 'expo.out'
        }
      );

      if (this.app.sceneManager && this.app.sceneManager.cameraCtrl) {
        this.app.sceneManager.cameraCtrl.setTarget(0, 0, 12);
        this.app.sceneManager.cameraCtrl.setLookAt(0, 0, 0);
      }
  }

  animateDoorExit() {
    if (!this.app.doraemonDoor) return;

    gsap.to(this.app.doraemonDoor.group.scale, {
      x: 0,
      y: 0,
      z: 0,
      duration: 0.8,
      ease: 'expo.in',
      onComplete: () => {
        this.app.doraemonDoor.setVisible(false);
        this.app.isGoHomeActive = false;

        // Restore camera to robot view
        if (this.app.robot) {
          const rp = this.app.robot.group.position;
          this.app.sceneManager.cameraCtrl.setTarget(rp.x * 0.12 + 0.3, 0.9, 7);
          this.app.sceneManager.cameraCtrl.setLookAt(rp.x * 0.25, 0.3, rp.z);
        }

        // Restore UI and entities
        document.body.classList.remove('go-home-active');
        document.documentElement.classList.remove('go-home-active');
        if (this.app.robot) this.app.robot.group.visible = true;
        if (this.app.arcade) this.app.arcade.group.visible = true;
      }
    });

    if (this.backBtn) this.backBtn.classList.remove('visible');
  }

  toggleGoHomeView(active, shouldOpen = false) {
    if (active) {
      if (this.app.isGoHomeActive) return; // Guard: Logic already running
      console.log('[ViewManager] Entering Go Home View');
      this.app.isGoHomeActive = true;

      document.body.classList.add('go-home-active');
      document.documentElement.classList.add('go-home-active');

      // Hide all 3D entities
      if (this.app.robot && this.app.robot.group) this.app.robot.group.visible = false;
      if (this.app.arcade && this.app.arcade.group) this.app.arcade.group.visible = false;
      if (this.app.mosquito && this.app.mosquito.drone) this.app.mosquito.drone.visible = false;
      if (this.app.gun && this.app.gun.hudGroup) this.app.gun.hudGroup.visible = false;

      // Show Doraemon Door
      if (this.app.doraemonDoor) {
        if (this.backBtn) this.backBtn.classList.add('visible');
        window.location.hash = 'gohome';

        // LAZY LOAD if not ready
        if (!this.app.doraemonDoor.isLoaded && !this.app.doraemonDoor.isLoading) {
            console.log('[ViewManager] Door not loaded. Triggering lazy load...');
            const MODELS = { DECORATION: { DORAEMON_DOOR: '/assets/models/doraemon_door.glb' } };
            
            // Temporary simple loader text
            const loaderDiv = document.createElement('div');
            loaderDiv.id = 'door-lazy-loader';
            loaderDiv.style.cssText = 'position:fixed; bottom:100px; left:50%; transform:translateX(-50%); color:#33ccff; font-family:Outfit; letter-spacing:2px; font-size:0.8rem; z-index:1000; animation:blink 1s infinite;';
            loaderDiv.textContent = 'INITIALIZING PORTAL...';
            document.body.appendChild(loaderDiv);

            this.app.doraemonDoor.load(MODELS.DECORATION.DORAEMON_DOOR, () => {
                loaderDiv.remove();
                this.app.doraemonDoor.setVisible(true);
                this.animateDoorEntrance();
            });
        } else if (this.app.doraemonDoor.isLoaded) {
            this.app.doraemonDoor.setVisible(true);
            this.animateDoorEntrance();
        }
      }
    } else if (shouldOpen) {
      if (!this.app.isGoHomeActive) return; // Prevent double transition
      this.app.isGoHomeActive = false; // Disable further interactions
      if (this.backBtn) this.backBtn.classList.remove('visible');
      
      console.log('[ViewManager] Opening Door to Home...');
      if (this.app.doraemonDoor) {
        this.app.doraemonDoor.openInward();

        // Use dynamic sync from Central Config
        const sync = window._DOOR_CONFIG || { redirectDelay: 1.5 };
        setTimeout(() => {
          this.seamlessRedirect('myhome/index.html');
        }, sync.redirectDelay * 1000);
      }
    } else {
      console.log('[ViewManager] Cancelling Go Home View');
      window.history.replaceState('', document.title, window.location.pathname);
      this.animateDoorExit();
    }
  }

  /**
   * SPA-style transition to ensure audio continuity
   */
  async seamlessRedirect(url) {
    if (this.isTransitioning) {
        console.warn('[ViewManager] Transition already in progress. Ignoring request.');
        return;
    }
    this.isTransitioning = true;

    try {
      console.log(`[ViewManager] Seamlessly transitioning to: ${url}`);
      
      // Clear trailing slashes for clean fetching
      const fetchUrl = url;
      const response = await fetch(fetchUrl);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');


      // 2. Inject Styles from the new page
      const newStyles = doc.querySelectorAll('style, link[rel="stylesheet"]');
      newStyles.forEach(style => document.head.appendChild(style.cloneNode(true)));

      // 3. Swap Content
      const newBodyContent = doc.body.innerHTML;
      
      if (this.app.renderer) {
        gsap.to(this.app.renderer.domElement, {
          opacity: 0,
          duration: 0.5,
          onComplete: async () => {
            // CRITICAL: Stop the main app loop and listeners
            if (this.app.destroy) this.app.destroy();
            
            document.body.innerHTML = newBodyContent;
            
            // BOOT THE HOME APP (SPA Way)
            if (url.includes('myhome')) {
                const { App: HomeApp } = await import('../../myhome/js/App.js');
                new HomeApp();
            }
          }
        });
      } else {
        if (this.app.destroy) this.app.destroy();
        document.body.innerHTML = newBodyContent;
        if (url.includes('myhome')) {
            const { App: HomeApp } = await import('../../myhome/js/App.js');
            new HomeApp();
        }
      }

      // 1. Update Title & History (ONLY AT THE END)
      document.title = doc.title;
      let historyUrl = url.replace('index.html', '');
      if (historyUrl.includes('myhome')) historyUrl = 'myhome/';
      if (historyUrl === '../' || historyUrl.includes('..')) historyUrl = './';
      window.history.pushState({}, '', historyUrl);

      this.isTransitioning = false;

    } catch (error) {
      console.error('[ViewManager] Seamless transition failed, falling back to reload', error);
      this.isTransitioning = false;
      
      // Safety: If it fails, just reload from the original URL
      window.location.href = url;
    }
  }

  openArcade() {
    this.app.arcadeIsOpen = true;
    this.app.isArcadeGameRunning = true;
    this.app.arcade.openArcade(this.app.sceneManager.cameraCtrl);

    if (this.app.robot) {
      this.app.robot.group.visible = false;
    }

    clearTimeout(this._arcadeMusicTimeout);
    this._arcadeMusicTimeout = setTimeout(() => {
      if (this.app.arcadeIsOpen && this.app.gameManager.isMenuMode && this.arcadeMenuAudio) {
        this.arcadeMenuAudio.play().catch(e => console.warn(e));
      }

      leaderboardMgr.setVisible(true);
      leaderboardMgr.incrementPlays();
    }, 1400);
  }

  closeArcade() {
    const rp = this.app.robot.group.position;
    const homeTarget = { x: rp.x * 0.12 + 0.3, y: 0.9, z: 7 };
    const homeLookAt = { x: rp.x * 0.25, y: 0.3, z: rp.z };

    this.app.arcade.closeArcade(this.app.sceneManager.cameraCtrl, homeTarget, homeLookAt, () => {
      this.app.arcadeIsOpen = false;
      if (this.app.robot) {
        this.app.robot.group.visible = true;
      }
    });

    if (this.app.arcade) {
      this.app.arcade.resetJumpScare();
    }
    const overlay = document.getElementById('jumpscare-overlay');
    if (overlay) overlay.remove();

    clearTimeout(this._arcadeMusicTimeout);
    if (this.arcadeMenuAudio) {
      this.arcadeMenuAudio.pause();
    }

    leaderboardMgr.setVisible(false);
  }
}
