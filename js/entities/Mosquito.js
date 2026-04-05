import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MODELS } from '../config/models.js';
import { SOUNDS } from '../managers/SoundManager.js';
import { gsap } from 'gsap';

/**
 * Mosquito — AI Drone mini-game for the HOME section.
 * Handles the drone targets, flight patterns, and hit detection.
 */
export class Mosquito {
  constructor(mainScene, camera) {
    this.mainScene = mainScene;
    this.camera = camera;

    // State
    this.active = false;
    this.isDead = false;
    this.loaded = false;
    this.time = 0;

    // Drone
    this.drone = null;
    this.hitMeshes = [];
    this._droneBaseY = 1.4;

    this.raycaster = new THREE.Raycaster();

    // Audio
    this.audioLoop = new Audio(SOUNDS.LOOPS.MOSQUITO);
    this.audioLoop.loop = true;
    this.audioLoop.volume = 0.13;
    this.audioHit = new Audio(SOUNDS.SFX.LASER_HIT);
    this.audioHit.volume = 0.75;
    this.audioLoopPlaying = false;

    this._loadModel();
  }

  _loadModel() {
    const loader = new GLTFLoader();
    loader.load(MODELS.CHARACTERS.MOSQUITO, (gltf) => {
      this.drone = gltf.scene;
      this.drone.visible = false;
      this.drone.scale.setScalar(0.5); // Adjust based on model size

      this.hitMeshes = [];
      this.drone.traverse(node => {
        if (node.isMesh) {
          this.hitMeshes.push(node);
          
          // Add some glow
          node.material.emissive = new THREE.Color(0x00e5ff);
          node.material.emissiveIntensity = 1.0;
        }
      });

      this.mainScene.add(this.drone);
      this._randomizeDrone();
      this.loaded = true;
      console.log('Mosquito: GLB loaded');
    });
  }

  _randomizeDrone() {
    if (!this.drone) return;
    const x = (Math.random() - 0.5) * 4.0;
    const y = 1.2 + Math.random() * 1.0;
    const z = -2.0 - Math.random() * 2;
    this.drone.position.set(x, y, z);
    this.drone.scale.setScalar(0.5);
    this._droneBaseY = y;
    this.isDead = false;
    if (this.active) this.drone.visible = true;
  }

  checkHit(shootPoint) {
    if (!this.active || this.isDead || !this.loaded) return false;

    if (!this.audioLoopPlaying) {
      this.audioLoop.play().catch(() => { });
      this.audioLoopPlaying = true;
    }

    this.raycaster.setFromCamera(shootPoint, this.camera);
    const hits = this.raycaster.intersectObjects(this.hitMeshes, true);
    
    if (hits.length > 0) {
      this._onHit();
      return true;
    }
    return false;
  }

  _onHit() {
    this.isDead = true;
    this.audioHit.currentTime = 0;
    this.audioHit.play().catch(() => { });

    const targetScale = this.drone.scale.x;
    gsap.timeline()
      .to(this.drone.scale, { x: targetScale * 1.8, y: targetScale * 1.8, z: targetScale * 1.8, duration: 0.08, ease: 'expo.out' })
      .to(this.drone.scale, {
        x: 0, y: 0, z: 0, duration: 0.25, ease: 'expo.in', onComplete: () => {
          if (this.drone) this.drone.visible = false;
        }
      });

    setTimeout(() => {
      if (this.active && this.drone) {
        this._randomizeDrone();
      }
    }, 1800);
  }

  enable() {
    if (this.active) return;
    this.active = true;
    if (this.drone && this.loaded) this.drone.visible = true;
    if (this.audioLoopPlaying) this.audioLoop.play().catch(() => { });
  }

  disable() {
    if (!this.active) return;
    this.active = false;
    if (this.drone) this.drone.visible = false;
    this.audioLoop.pause();
  }

  update(dt) {
    if (!this.active || !this.loaded) return;
    this.time += dt;

    if (this.drone && this.drone.visible && !this.isDead) {
      this.drone.position.y = this._droneBaseY + Math.sin(this.time * 2.2) * 0.2;
      this.drone.position.x += Math.sin(this.time * 0.7) * 0.003;
      this.drone.position.z += Math.cos(this.time * 0.5) * 0.002;
      this.drone.rotation.y += 0.05;
    }
  }
}

