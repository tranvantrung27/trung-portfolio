import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { gsap } from 'gsap';
import { config } from '../utils/utils.js';

const OFF_SCREEN_X = 18; // Far right X — slides off screen to here

export class Arcade {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.isHome = true;
    this.loaded = false;
    this.meshes = []; // All meshes — used by OutlinePass

    const homeState = config.arcade.home;
    this.homePos = new THREE.Vector3(...homeState.pos);
    this.homeRotY = homeState.rotY;

    // Start off-screen to the right — will slide in after load
    this.group.position.set(OFF_SCREEN_X, homeState.pos[1], homeState.pos[2]);
    this.group.rotation.y = homeState.rotY;
    this.group.scale.setScalar(config.arcade.scale);

    this.scene.add(this.group);
  }

  load(url, callback) {
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        const model = gltf.scene;

        // Auto-scale to ~1.5 units height
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);

        const desiredHeight = 1.5;
        const autoScale = desiredHeight / size.y;
        model.scale.setScalar(autoScale);

        // Offset so bottom of model sits at y=0 (local group origin = floor level)
        const scaledMinY = box.min.y * autoScale;
        model.position.y = -scaledMinY;

        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material && child.name.toLowerCase().includes('screen')) {
              // Create dynamic text texture for the screen
              const canvas = document.createElement('canvas');
              canvas.width = 512;
              canvas.height = 512;
              const ctx = canvas.getContext('2d');

              // Flip the canvas vertically to fix UV orientation from Blender
              ctx.translate(0, 512);
              ctx.scale(1, -1);

              // Retro dark background
              ctx.fillStyle = '#051005';
              ctx.fillRect(0, 0, 512, 512);

              // Grid / Scanlines
              ctx.fillStyle = 'rgba(0, 255, 80, 0.15)';
              for (let i = 0; i < 512; i += 4) ctx.fillRect(0, i, 512, 2);

              // Neon text
              ctx.fillStyle = '#00ff50';
              ctx.font = 'bold 50px "Courier New", monospace';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('Coming soon', 240, 240);

              const tex = new THREE.CanvasTexture(canvas);
              if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
              tex.flipY = false; // Important for GLTF standard

              child.material.map = tex;
              child.material.emissiveMap = tex;
              child.material.emissive = new THREE.Color(0xffffff);
              child.material.emissiveIntensity = 3.0;

              // Save reference for blinking
              this.screenMaterial = child.material;
            }
            this.meshes.push(child); // Track for outline
          }
        });

        // Soft shadow blob beneath the machine
        const shadowGeo = new THREE.PlaneGeometry(1.0, 0.8);
        const shadowMat = new THREE.MeshBasicMaterial({
          color: 0x000000,
          transparent: true,
          opacity: 0.45,
          depthWrite: false,
        });
        const shadowBlob = new THREE.Mesh(shadowGeo, shadowMat);
        shadowBlob.rotation.x = -Math.PI / 2;
        shadowBlob.position.y = 0.001;
        this.group.add(shadowBlob);

        this.group.add(model);
        this.loaded = true;

        // Slide in from the right on first load, ONLY if we are still on the Home section
        if (this.isHome) {
          this._slideIn();
        }

        if (callback) callback(this.group);
      },
      null,
      (error) => console.error('Arcade: Error loading GLB', error)
    );
  }

  /** Called when entering the HOME section */
  show() {
    if (this.isHome) return;
    this.isHome = true;
    this._slideIn();
  }

  /** Called when leaving the HOME section */
  hide() {
    if (!this.isHome) return;
    this.isHome = false;
    this._slideOut();
  }

  _slideIn() {
    // Animate from off-screen right into home position
    gsap.fromTo(
      this.group.position,
      { x: OFF_SCREEN_X },
      {
        x: this.homePos.x,
        duration: 0.8,
        ease: 'power3.out',
        overwrite: true,
      }
    );
    gsap.to(this.group.position, {
      y: this.homePos.y,
      z: this.homePos.z,
      duration: 0.8,
      ease: 'power3.out',
      overwrite: false,
    });
  }

  _slideOut() {
    // Slide off to the right, out of view
    gsap.to(this.group.position, {
      x: OFF_SCREEN_X,
      duration: 0.55,
      ease: 'power3.in',
      overwrite: true,
    });
  }

  /**
   * Toggle the outline glow highlight on hover.
   * @param {boolean} isHovered
   * @param {OutlinePass} outlinePass - from sceneManager.outlinePass
   */
  setHover(isHovered, outlinePass) {
    if (!outlinePass || !this.loaded) return;
    outlinePass.selectedObjects = isHovered ? this.meshes : [];
    document.body.style.cursor = isHovered ? 'pointer' : '';
  }

  /**
   * Zoom camera into the arcade screen.
   * Hides UI elements for a cinematic feel.
   * @param {CameraController} camCtrl
   */
  openArcade(camCtrl) {
    if (!this.loaded) return;
    this.isOpen = true;
    document.body.style.overflow = 'hidden'; // Block scrolling while zoomed in

    // Play zoom sound effect
    const zoomSound = new Audio('/assets/sounds/whoosh__.mp3');
    zoomSound.volume = 0.6;
    zoomSound.play().catch(e => console.warn('Could not play zoom sound:', e));

    // ─ Camera: zoom close in front of the screen ─
    // Directly track position to avoid lerp lag spin
    // Stand slighly further back so the machine isn't too huge
    gsap.to(camCtrl.targetPos, {
      x: 5.5, y: 0.0, z: -1.5,
      duration: 1.4,
      ease: 'power3.inOut',
      onUpdate: () => camCtrl.camera.position.copy(camCtrl.targetPos)
    });
    gsap.to(camCtrl.lookTarget, {
      x: 6.5, y: -0.1, z: -2.5,
      duration: 1.4,
      ease: 'power3.inOut',
    });

    // Narrow FOV slightly (45 → 35 instead of 28 so it's not too tight)
    gsap.to(camCtrl.camera, {
      fov: 30,
      duration: 1.4,
      ease: 'power3.inOut',
      onUpdate: () => camCtrl.camera.updateProjectionMatrix(),
    });

    // Hide hero content and scroll indicator
    gsap.to(['.hero-content', '.scroll-indicator'], {
      opacity: 0, y: -20,
      duration: 0.4, ease: 'power2.in',
      pointerEvents: 'none',
    });

    // Slide navbar up
    gsap.to('#navbar', {
      y: -80,
      duration: 0.4,
      ease: 'power2.in',
    });

    // Show back button after zoom completes
    setTimeout(() => {
      const btn = document.getElementById('arcade-close');
      if (btn) {
        btn.style.display = 'flex';
        btn.style.opacity = '0';
        requestAnimationFrame(() => {
          btn.style.transition = 'opacity 0.4s';
          btn.style.opacity = '1';
        });
      }
    }, 1200);
  }

  /**
   * Zoom camera back out and restore all UI.
   * @param {CameraController} camCtrl
   * @param {Object} homeTarget
   * @param {Object} homeLookAt
   * @param {Function} onComplete
   */
  closeArcade(camCtrl, homeTarget, homeLookAt, onComplete) {
    this.isOpen = false;

    // Play zoom out sound effect
    const backSound = new Audio('/assets/sounds/whoosh__.mp3');
    backSound.volume = 0.6;
    backSound.play().catch(e => console.warn('Could not play back sound:', e));

    // Hide back button
    const btn = document.getElementById('arcade-close');
    if (btn) {
      btn.style.opacity = '0';
      setTimeout(() => { btn.style.display = 'none'; }, 400);
    }

    // Restore scrolling immediately
    document.body.style.overflow = '';

    // Restore camera position using precise home coordinates
    gsap.to(camCtrl.targetPos, {
      x: homeTarget ? homeTarget.x : 0.5,
      y: homeTarget ? homeTarget.y : 1.0,
      z: homeTarget ? homeTarget.z : 7,
      duration: 1.4, ease: 'power3.inOut',
      onUpdate: () => camCtrl.camera.position.copy(camCtrl.targetPos)
    });
    gsap.to(camCtrl.lookTarget, {
      x: homeLookAt ? homeLookAt.x : 0,
      y: homeLookAt ? homeLookAt.y : 0,
      z: homeLookAt ? homeLookAt.z : 0,
      duration: 1.4, ease: 'power3.inOut',
      onComplete: () => {
        if (onComplete) onComplete();
      }
    });

    // Restore FOV
    gsap.to(camCtrl.camera, {
      fov: config.camera?.fov ?? 45,
      duration: 1.4, ease: 'power3.inOut',
      onUpdate: () => camCtrl.camera.updateProjectionMatrix(),
    });

    // Restore hero content
    gsap.to(['.hero-content', '.scroll-indicator'], {
      opacity: 1, y: 0,
      duration: 0.5, ease: 'power2.out',
      delay: 0.3,
    });

    // Restore navbar
    gsap.to('#navbar', {
      y: 0,
      duration: 0.4, ease: 'power2.out',
      delay: 0.2,
    });
  }

  // GSAP handles zoom animation, but we handle screen blinking here
  update(dt) {
    if (!this.screenMaterial) return;

    // Stop blinking and leave screen fully on if zoomed in
    if (this.isOpen) {
      this.screenMaterial.emissiveIntensity = 3.5;
      return;
    }

    this.time = (this.time || 0) + dt;

    // Blink effect: 0.8s bright, 0.4s dim
    const cycle = this.time % 1.2;
    if (cycle < 0.8) {
      this.screenMaterial.emissiveIntensity = 3.5; // On
    } else {
      this.screenMaterial.emissiveIntensity = 0.5; // Off
    }
  }

}
