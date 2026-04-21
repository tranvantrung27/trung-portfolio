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
  }

  toggleGoHomeView(active, shouldOpen = false) {
    if (active) {
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
        this.app.doraemonDoor.setVisible(true);
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
          this.app.sceneManager.cameraCtrl.setTarget(0, 1.0, 12);
          this.app.sceneManager.cameraCtrl.setLookAt(0, 0.5, 0);
        }
      }
    } else if (shouldOpen) {
      console.log('[ViewManager] Opening Door to Home...');
      // Logic for CLICKING the door
      if (this.app.doraemonDoor) {
        this.app.doraemonDoor.openInward();

        // Use dynamic sync from Central Config
        const sync = window._DOOR_CONFIG || { redirectDelay: 2.2 };
        setTimeout(() => {
          this.seamlessRedirect('./myhome/index.html');
        }, sync.redirectDelay * 1000);
      }
    } else {
      console.log('[ViewManager] Cancelling Go Home View');
      this.app.isGoHomeActive = false;
      document.body.classList.remove('go-home-active');
      document.documentElement.classList.remove('go-home-active');
      if (this.app.robot) this.app.robot.group.visible = true;
      if (this.app.arcade) this.app.arcade.group.visible = true;
      if (this.app.doraemonDoor) this.app.doraemonDoor.setVisible(false);
    }
  }

  /**
   * SPA-style transition to ensure audio continuity
   */
  async seamlessRedirect(url) {
    try {
      console.log(`[ViewManager] Seamlessly transitioning to: ${url}`);

      const response = await fetch(url);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // 1. Update Title & History
      document.title = doc.title;
      const historyUrl = url.replace('/index.html', '').replace('index.html', '');
      window.history.pushState({}, '', historyUrl);

      // 2. Inject Styles from the new page
      const newStyles = doc.querySelectorAll('style, link[rel="stylesheet"]');
      newStyles.forEach(style => document.head.appendChild(style.cloneNode(true)));

      // 3. Swap Content
      // We keep the old body for a split second to avoid visual flicker
      const newBodyContent = doc.body.innerHTML;

      // Smooth fade out of 3D scene (optional but recommended)
      if (this.app.renderer) {
        gsap.to(this.app.renderer.domElement, {
          opacity: 0,
          duration: 0.5,
          onComplete: () => {
            document.body.innerHTML = newBodyContent;
            // The magic whoosh sound continues because the page context is preserved!
          }
        });
      } else {
        document.body.innerHTML = newBodyContent;
      }

    } catch (error) {
      console.error('[ViewManager] Seamless transition failed, falling back to reload', error);
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
