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
              child.material.emissive = new THREE.Color(0x3366ff);
              child.material.emissiveIntensity = 5.0;
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

        // Slide in from the right on first load
        this._slideIn();

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

  // update() is intentionally empty — GSAP handles all animation
  update() {}
}
