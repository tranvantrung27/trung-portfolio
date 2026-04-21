import * as THREE from 'three';

/**
 * Handles all mouse, pointer, and keyboard interactions.
 * Centralizes raycasting logic for entity selection.
 */
export class InteractionManager {
  constructor(app) {
    this.app = app;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
  }

  handlePointerMove(e) {
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = -(e.clientY / window.innerHeight) * 2 + 1;
    this.mouse.set(nx, ny);

    if (this.app.robot) this.app.robot.setMouseTarget(nx, ny);

    const cam = this.app.sceneManager.cameraCtrl.camera;

    // Arcade Hover Logic
    if (this.app.arcade.loaded && this.app.arcade.isHome && !this.app.arcadeIsOpen) {
      this.raycaster.setFromCamera(this.mouse, cam);
      const hits = this.raycaster.intersectObjects(this.app.arcade.meshes, false);
      const nowHovered = hits.length > 0;

      if (nowHovered !== this.app.arcadeHovered) {
        this.app.arcadeHovered = nowHovered;
        this.app.arcade.setHover(this.app.arcadeHovered, this.app.sceneManager.outlinePass);
      }
    } else if (this.app.arcadeHovered) {
      this.app.arcadeHovered = false;
      this.app.arcade.setHover(false, this.app.sceneManager.outlinePass);
    }

    // Doraemon Door Interaction
    if (this.app.isGoHomeActive && this.app.doraemonDoor && this.app.doraemonDoor.group) {
      this.raycaster.setFromCamera(this.mouse, cam);
      
      // Ensure world matrices are up to date for reliable raycasting
      this.app.doraemonDoor.group.updateMatrixWorld(true);
      
      const hits = this.raycaster.intersectObject(this.app.doraemonDoor.group, true);
      const isDoorHovered = hits.length > 0;
      
      // if (isDoorHovered) console.log('[Interaction] Hovering over:', hits[0].object.name);
      
      this.app.doraemonDoor.setHover(isDoorHovered);
      document.body.style.cursor = isDoorHovered ? 'pointer' : 'default';
    } else {
      // Restore cursor if not in Go Home view and no other hover happened
      if (!this.app.arcadeHovered) document.body.style.cursor = 'default';
    }

    if (this.app.isGameActive) {
      this.app.gun.updatePointer(nx, ny);
    }
  }

  handlePointerDown(e) {
    if (e.button !== 0) return;

    // Go Home View - Click Door to open
    if (this.app.isGoHomeActive && this.app.doraemonDoor && this.app.doraemonDoor.group) {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = -(e.clientY / window.innerHeight) * 2 + 1;
      const cam = this.app.sceneManager.cameraCtrl.camera;
      
      this.raycaster.setFromCamera(new THREE.Vector2(nx, ny), cam);
      const hits = this.raycaster.intersectObject(this.app.doraemonDoor.group, true);
      
      if (hits.length > 0) {
        this.app.viewManager.toggleGoHomeView(false, true); // True means "Open and Go"
        return;
      } else {
        // Fallback: If clicking the general area of center screen, still try to open
        const dist = Math.sqrt(nx*nx + ny*ny);
        if (dist < 0.3) {
           this.app.viewManager.toggleGoHomeView(false, true);
           return;
        }
      }
    }

    if (this.app.arcadeIsOpen) return;

    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = -(e.clientY / window.innerHeight) * 2 + 1;
    const cam = this.app.sceneManager.cameraCtrl.camera;

    // Open Arcade on click if hovered
    if (!this.app.isGameActive && this.app.arcade.loaded && this.app.arcade.isHome) {
      this.raycaster.setFromCamera(new THREE.Vector2(nx, ny), cam);
      const hits = this.raycaster.intersectObjects(this.app.arcade.meshes, false);
      if (hits.length > 0) {
        this.app.openArcade();
        return;
      }
    }

    // Gun shooting logic
    if (this.app.isGameActive) {
      const isGunInteraction = this.app.gun.handleClick(nx, ny);
      if (!isGunInteraction) {
        this.app.gun.triggerFire();
        this.app.mosquito.checkHit(this.app.gun.muzzleNDC);
      }
    }
  }

  handleKeyDown(e) {
    if (this.app.arcadeIsOpen) {
      // If Esc is pressed and we are already in menu mode, close the arcade machine
      if (e.code === 'Escape' && this.app.gameManager.isMenuMode) {
        this.app.closeArcade();
        return;
      }

      this.app.gameManager.handleInput(e.code);

      const blockKeys = ['ArrowUp', 'ArrowDown', 'Space', 'Enter', 'PageUp', 'PageDown'];
      if (blockKeys.includes(e.code)) {
        e.preventDefault();
      }
    }
  }
}
