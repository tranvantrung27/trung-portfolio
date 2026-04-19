import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { gsap } from 'gsap';
import { config } from '../utils/utils.js';
import { SOUNDS } from '../managers/SoundManager.js';
import { SnakeJumpScare } from './SnakeJumpScare.js';

const OFF_SCREEN_X = 18; // Far right X — slides off screen to here

export class Arcade {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.isHome = true;
    this.loaded = false;
    this.meshes = [];

    this.jumpScare = new SnakeJumpScare(this.scene);

    const homeState = config.arcade.home;
    this.homePos = new THREE.Vector3(...homeState.pos);
    this.homeRotY = homeState.rotY;

    // Start off-screen to the right — will slide in after load
    this.group.position.set(OFF_SCREEN_X, homeState.pos[1], homeState.pos[2]);
    this.group.rotation.y = homeState.rotY;
    this.group.scale.setScalar(config.arcade.scale);

    this.scene.add(this.group);

    // 🔒 ONLY ADDING SCROLL ISOLATION LOGIC
    this.isOpen = false;
    this._scrollBlocker = (e) => {
      if (this.isOpen) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
      }
    };
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

            // 👉 NHẬN DIỆN MÀN HÌNH: Chấp nhận mọi Mesh có chữ 'screen' (không phân biệt hoa thường)
            const isScreen = child.name.toLowerCase().includes('screen') ||
              (child.material && child.material.name && child.material.name.toLowerCase().includes('screen'));

            if (isScreen) {
              const canvas = document.createElement('canvas');
              canvas.width = 512;
              canvas.height = 512;
              const ctx = canvas.getContext('2d');

              const tex = new THREE.CanvasTexture(canvas);
              if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;

              tex.flipY = true;
              tex.center.set(0.5, 0.5);
              tex.rotation = 0;

              const screenMat = new THREE.MeshBasicMaterial({
                map: tex,
                side: THREE.FrontSide,
                transparent: true,
                opacity: 1.0,
                polygonOffset: true,
                polygonOffsetFactor: -1,
                polygonOffsetUnits: -1
              });

              child.material = screenMat;
              child.renderOrder = 999999;

              this.screenMesh = child;
              this.screenMaterial = screenMat;
              this.screenTexture = tex;
              this.screenCanvas = canvas;
              this.screenCtx = ctx;

              // 📐 MEASURE SCREEN MESH (As suggested by user)
              const screenBox = new THREE.Box3().setFromObject(child);
              const screenSize = new THREE.Vector3();
              screenBox.getSize(screenSize);
              const screenCenter = new THREE.Vector3();
              screenBox.getCenter(screenCenter);

              // Store for calibration
              this.calibrationData = {
                width: screenSize.x,
                height: screenSize.y,
                center: screenCenter,
                aspectRatio: screenSize.x / screenSize.y
              };

              if (this.calibrationData.width > 0) {
                this.isCalibrated = true;
              }
            } else {
              const mat = Array.isArray(child.material) ? child.material[0] : child.material;
              const isMarquee = (mat && mat.name === 'Material.005') || child.name.includes('Text.001');

              if (isMarquee && mat) {
                if (Array.isArray(child.material)) {
                  child.material[0] = child.material[0].clone();
                } else {
                  child.material = child.material.clone();
                }
                this.marqueeMaterial = Array.isArray(child.material) ? child.material[0] : child.material;
                this.marqueeMaterial.emissive = new THREE.Color('#33ff77');
                this.marqueeMaterial.emissiveIntensity = 5.0;
                if (lowerName.includes('marquee')) {
                  this.marqueeMesh = child;
                }
              }
            }
            this.meshes.push(child);
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

        // Load snake jump scare via dedicated module
        const snakeUrl = config.models?.CHARACTERS?.SNAKE || './assets/models/snake.glb';
        this.jumpScare.load(snakeUrl);

        if (this.isHome) this._slideIn();
        if (callback) callback(this.group);
      },
      null,
      (error) => console.error('Arcade: Error loading GLB', error)
    );
  }

  show() {
    if (this.isHome) return;
    this.isHome = true;
    this._slideIn();
  }

  hide() {
    if (!this.isHome) return;
    this.isHome = false;
    this._slideOut();
  }

  _slideIn() {
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
    gsap.to(this.group.position, {
      x: OFF_SCREEN_X,
      duration: 0.55,
      ease: 'power3.in',
      overwrite: true,
    });
  }

  setHover(isHovered, outlinePass) {
    if (!outlinePass || !this.loaded) return;
    outlinePass.selectedObjects = isHovered ? this.meshes : [];
    document.body.style.cursor = isHovered ? 'pointer' : '';
  }

  openArcade(camCtrl) {
    if (!this.loaded) return;
    this.isOpen = true;

    // 🔒 LOCK SCROLL
    document.body.style.overflow = 'hidden';
    window.addEventListener('wheel', this._scrollBlocker, { passive: false });
    window.addEventListener('touchmove', this._scrollBlocker, { passive: false });

    const zoomSound = new Audio(SOUNDS.SFX.WHOOSH);
    zoomSound.volume = 0.6;
    zoomSound.play().catch(e => console.warn('Could not play zoom sound:', e));

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

    gsap.to(camCtrl.camera, {
      fov: 30,
      duration: 1.4,
      ease: 'power3.inOut',
      onUpdate: () => camCtrl.camera.updateProjectionMatrix(),
    });

    gsap.to(['.hero-content', '.scroll-indicator'], {
      opacity: 0, y: -20,
      duration: 0.4, ease: 'power2.in',
      pointerEvents: 'none',
    });

    gsap.to('#navbar', {
      y: -80,
      duration: 0.4,
      ease: 'power2.in',
    });

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

  closeArcade(camCtrl, homeTarget, homeLookAt, onComplete) {
    this.isOpen = false;
    this.resetJumpScare(); // <--- HIDE SNAKE WHEN ARCADE CLOSES

    // 🔓 RELEASE SCROLL
    document.body.style.overflow = '';
    window.removeEventListener('wheel', this._scrollBlocker);
    window.removeEventListener('touchmove', this._scrollBlocker);

    const backSound = new Audio(SOUNDS.SFX.WHOOSH);
    backSound.volume = 0.6;
    backSound.play().catch(e => console.warn('Could not play back sound:', e));

    const btn = document.getElementById('arcade-close');
    if (btn) {
      btn.style.opacity = '0';
      setTimeout(() => { btn.style.display = 'none'; }, 400);
    }

    document.body.style.overflow = '';

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

    gsap.to(camCtrl.camera, {
      fov: config.camera?.fov ?? 45,
      duration: 1.4, ease: 'power3.inOut',
      onUpdate: () => camCtrl.camera.updateProjectionMatrix(),
    });

    gsap.to(['.hero-content', '.scroll-indicator'], {
      opacity: 1, y: 0,
      duration: 0.5, ease: 'power2.out',
      delay: 0.3,
    });

    gsap.to('#navbar', {
      y: 0,
      duration: 0.4, ease: 'power2.out',
      delay: 0.2,
    });
  }

  updateGameTexture(gameCanvas) {
    if (!this.screenCtx || !this.loaded) return;

    // 1. Solid Retro Background
    this.screenCtx.fillStyle = '#010501';
    this.screenCtx.fillRect(0, 0, 512, 512);

    // 2. Draw Game Canvas to exact physical UV mapped bounds
    // Based on diagnostic measuring, the physical screen only maps 
    // the texture from Y=200 to Y=505.
    const finalX = 0;
    const finalY = 200;
    const finalW = 512;
    const finalH = 305;

    this.screenCtx.drawImage(gameCanvas, finalX, finalY, finalW, finalH);
    this.screenTexture.needsUpdate = true;
  }

  triggerJumpScare(camCtrl) {
    this.jumpScare.trigger(camCtrl, this.screenMesh, this.group);
  }

  resetJumpScare() {
    this.jumpScare.reset();
  }

  update(dt, isGameRunning = false) {
    this.jumpScare.update(dt);

    this.time = (this.time || 0) + dt;

    // Nhịp thở màn hình game: Chỉ nháy khi CHƯA bấm vào máy
    if (this.screenMaterial) {
      if (this.isOpen || isGameRunning) {
        // Khi đã bấm vào hoặc đang chơi: Giữ độ sáng 100% để trải nghiệm tốt nhất
        this.screenMaterial.color.setScalar(1.0);
      } else {
        // Khi ở xa: Nhấp nháy chậm chậm để thu hút (Pulse từ 0.3 -> 1.0)
        // Dùng color.setScalar để hoạt động được trên cả MeshBasicMaterial sếp vừa đổi
        const screenPulse = Math.sin(this.time * 2.0) * 0.35 + 0.65;
        this.screenMaterial.color.setScalar(screenPulse);
      }
    }
    
    // Chữ TRUNG giữ nguyên màu sắc rực rỡ nhưng không nháy
    if (this.marqueeMaterial) {
      this.marqueeMaterial.emissiveIntensity = 4.0;
    }

    if (!this.screenMaterial) return;

    if (isGameRunning || this.isOpen) {
      return; 
    }
  }
}
