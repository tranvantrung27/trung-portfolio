import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Bullet } from './Bullet.js';
import { Laser } from './Laser.js';
import { Spark } from './Spark.js';
import { MODELS } from '../config/models.js';
import { SOUNDS } from '../managers/SoundManager.js';
import { gsap } from 'gsap';

/**
 * Gun — Calibrated HUD Weapon.
 * Focusing on Step-by-Step Orientation Calibration.
 */
export class Gun {
  constructor(mainRenderer, worldCamera) {
    this.renderer = mainRenderer;
    this.worldCamera = worldCamera;

    // ── HUD Scene & Camera ──────────────────────────────────────────────────
    this.hudScene = new THREE.Scene();
    this.hudCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 10);
    this.hudCamera.position.set(0, 0, 0);
    this.hudScene.add(this.hudCamera);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    this.hudScene.add(ambientLight);
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(5, 5, 5);
    this.hudScene.add(keyLight);

    // ── Models & Hierarchy ──────────────────────────────────────────────────
    this.modelWrapper = new THREE.Group();
    this.hudScene.add(this.modelWrapper);
    this.model = null;

    // State ──────────────────────────────────────────────────────────────────
    this.loaded = false;
    this.active = false;
    this.bullets = [];
    this.sparks = [];
    this.muzzle = null;

    // Interaction State
    this.isInspecting = false;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Cinematic Position & Rotation (User SPEC)
    this._basePos = new THREE.Vector3(1.0, -0.6, -1.5);
    this._baseRot = new THREE.Euler(0, Math.PI / 2, 0);

    this.targetPos = this._basePos.clone();
    this.targetRot = this._baseRot.clone();
    this.inspectOffsetRot = new THREE.Euler(0, 0, 0);
    this.lerpSpeed = 0.12;
    this.time = 0;

    // Audio
    this.fireSound = new Audio(SOUNDS.SFX.LASER_HIT);
    this.fireSound.volume = 0.4;


    this.crosshair = document.getElementById('crosshair');
    this.muzzleNDC = new THREE.Vector2();

    this._load(MODELS.WEAPONS.LAZER);

    window.addEventListener('resize', () => this._onResize());
  }

  _onResize() {
    this.hudCamera.aspect = window.innerWidth / window.innerHeight;
    this.hudCamera.updateProjectionMatrix();
  }

  _load(url) {
    new GLTFLoader().load(url, (gltf) => {
      this.model = gltf.scene;

      this.model.rotation.set(-0.08, -Math.PI / 2 - 1.3, 0.02);
      this.model.scale.setScalar(0.1);

      // Detect muzzle marker + style meshes
      this.model.traverse(node => {
        // Muzzle detection
        if (node.name.toLowerCase().includes('muzzle')) {
          this.muzzle = node;
        }

        if (!node.isMesh) return;
        node.material.depthTest = true;
        node.material.depthWrite = true;
        node.material.metalness = 1.0;
        node.material.roughness = 0.3;

        const nameLower = (node.name + (node.material.name || '')).toLowerCase();
        if (nameLower.includes('cyan') || nameLower.includes('glow') || nameLower.includes('emit') || nameLower.includes('light')) {
          node.material.emissive = new THREE.Color(0x00e5ff);
          node.material.emissiveIntensity = 1.5;
          node.userData.isEmissive = true;
        }
      });

      // Fallback if model has no muzzle marker
      if (!this.muzzle) {
        console.warn('⚠️ No muzzle marker found in model. Creating fallback at (0.35, 0.1, 0)');
        this.muzzle = new THREE.Object3D();
        this.muzzle.position.set(0.35, 0.1, 0);
        this.model.add(this.muzzle);
      }

      this.modelWrapper.add(this.model);
      this.modelWrapper.position.copy(this._basePos);
      this.modelWrapper.rotation.copy(this._baseRot);

      this.modelWrapper.visible = false;
      this.loaded = true;
    });
  }

  handleClick(nx, ny) {
    if (!this.active || !this.loaded) return false;
    this.mouse.set(nx, ny);
    this.raycaster.setFromCamera(this.mouse, this.hudCamera);
    const intersects = this.raycaster.intersectObjects(this.modelWrapper.children, true);

    if (intersects.length > 0) {
      if (!this.isInspecting) {
        this.enterInspection();
        return true;
      }
    } else if (this.isInspecting) {
      this.exitInspection();
      return true;
    }
    return false;
  }

  enterInspection() {
    this.isInspecting = true;
    this.inspectOffsetRot.set(0, 0, 0);
    if (this.crosshair) this.crosshair.style.opacity = '0';
  }

  exitInspection() {
    this.isInspecting = false;
    if (this.crosshair) this.crosshair.style.opacity = '1';
  }

  enable() {
    this.active = true;
    if (this.modelWrapper) this.modelWrapper.visible = true;
    if (this.crosshair) this.crosshair.style.display = 'block';
  }

  disable() {
    this.active = false;
    if (this.modelWrapper) this.modelWrapper.visible = false;
    if (this.crosshair) this.crosshair.style.display = 'none';
  }

  updatePointer(nx, ny) {
    if (!this.active) return;
    this.muzzleNDC.set(nx, ny);

    if (this.isInspecting) {
      this.inspectOffsetRot.y += nx * 0.03;
      this.inspectOffsetRot.x -= ny * 0.03;
    } else {
      // 1. Position Lag (weapon sway)
      this.targetPos.set(
        this._basePos.x + nx * 0.08,
        this._basePos.y + ny * 0.06,
        this._basePos.z
      );

      // 2. Aim towards crosshair (FPS style)
      this.targetRot.set(
        this._baseRot.x + ny * -0.15,
        this._baseRot.y + nx * 0.2,
        this._baseRot.z + nx * -0.03
      );
    }

    if (this.crosshair && !this.isInspecting) {
      const sx = (nx * 0.5 + 0.5) * window.innerWidth;
      const sy = (-ny * 0.5 + 0.5) * window.innerHeight;
      this.crosshair.style.transform = `translate3d(${sx - 8}px, ${sy - 8}px, 0)`;
    }
  }

  triggerFire() {
    if (!this.active || !this.loaded || this.isInspecting || !this.muzzle) return;

    // Recoil
    const currentPos = this.modelWrapper.position.clone();
    gsap.timeline()
      .to(this.modelWrapper.position, {
        z: currentPos.z + 0.12,
        duration: 0.04,
        ease: 'power4.out'
      })
      .to(this.modelWrapper.position, {
        z: currentPos.z,
        duration: 0.3,
        ease: 'elastic.out(1, 0.4)'
      });

    if (this.fireSound) {
      this.fireSound.currentTime = 0;
      this.fireSound.play().catch(e => console.warn('Gun: Sound blocked', e));
    }

    // Get muzzle world position
    const muzzlePos = new THREE.Vector3();
    this.muzzle.getWorldPosition(muzzlePos);

    // FPS Raycast: shoot towards crosshair (muzzleNDC) in HUD space
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(this.muzzleNDC, this.hudCamera);

    const target = raycaster.ray.origin.clone()
      .add(raycaster.ray.direction.clone().multiplyScalar(100));

    const dir = new THREE.Vector3()
      .subVectors(target, muzzlePos)
      .normalize();

    // Spawn Bullet tracer
    this.bullets.push(new Bullet(this.hudScene, muzzlePos, dir));

    // Spawn Laser beam (dashed, attached to muzzle)
    new Laser(this.muzzle);

    // Spawn Spark particles
    this.sparks.push(new Spark(this.hudScene, muzzlePos));

    if (this.crosshair) {
      this.crosshair.classList.add('shoot');
      setTimeout(() => this.crosshair.classList.remove('shoot'), 100);
    }
  }

  update(dt) {
    if (!this.active || !this.loaded) return;
    this.time += dt;

    if (this.isInspecting) {
      this.modelWrapper.position.lerp(new THREE.Vector3(0, 0, -1.0), this.lerpSpeed);
      this.model.rotation.x += (this.inspectOffsetRot.x - this.model.rotation.x) * this.lerpSpeed;
      this.model.rotation.y += (this.inspectOffsetRot.y + Math.PI - this.model.rotation.y) * this.lerpSpeed;

      this.modelWrapper.rotation.x *= 0.9;
      this.modelWrapper.rotation.y *= 0.9;
      this.modelWrapper.rotation.z *= 0.9;
    } else {
      this.modelWrapper.position.lerp(this.targetPos, this.lerpSpeed);

      // Gun aims towards world camera center target (FPS lookAt)
      try {
        if (!this._aimRay) {
          this._aimRay = new THREE.Raycaster();
          this._aimTarget = new THREE.Vector3();
        }
        
        if (this.hudCamera) {
          this._aimRay.setFromCamera(this.muzzleNDC, this.hudCamera);
          this._aimTarget.copy(this._aimRay.ray.origin)
            .addScaledVector(this._aimRay.ray.direction, 10);
            
          this.modelWrapper.lookAt(this._aimTarget);
          
          // The gun model is facing backwards internally when lookAt points -Z.
          // Test with a -90-degree turn (-Math.PI / 2).
          this.modelWrapper.rotateY(-Math.PI / 2);
          
          // Apply base rotations to preserve the tilt
          this.modelWrapper.rotateZ(this._baseRot.z);
          
          // FPS offset to keep weapon feel natural
          this.modelWrapper.rotation.x += 0.1;
        }
      } catch (e) {
        console.error("Gun update lookAt error:", e);
      }

      // Idle breathing sway
      this.modelWrapper.position.y += Math.sin(this.time * 2) * 0.001;
      this.modelWrapper.position.x += Math.cos(this.time * 1.5) * 0.0005;
    }

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.update(dt);
      if (!b.active) this.bullets.splice(i, 1);
    }

    // Tick spark particles
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.update(dt);
      if (!s.active) this.sparks.splice(i, 1);
    }

    const pulse = 1.0 + Math.sin(this.time * 3.5) * 0.4;
    this.model.traverse(node => {
      if (node.isMesh && node.userData.isEmissive) {
        node.material.emissiveIntensity = pulse;
      }
    });
  }

  renderHUD() {
    if (!this.active) return;
    this.renderer.autoClear = false;
    this.renderer.clearDepth();
    this.renderer.render(this.hudScene, this.hudCamera);
    this.renderer.autoClear = true;
  }
}
