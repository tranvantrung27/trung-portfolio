import * as THREE from 'three';
import { config } from '../utils/utils.js';

export class CameraController {
  constructor() {
    const c = config.camera;
    this.camera = new THREE.PerspectiveCamera(c.fov, window.innerWidth / window.innerHeight, c.near, c.far);
    this.camera.position.set(...c.startPos);
    this.targetPos = new THREE.Vector3(...c.startPos);
    this.lookTarget = new THREE.Vector3(0, 0, 0);
  }

  setTarget(x, y, z) { this.targetPos.set(x, y, z); }
  setLookAt(x, y, z) { this.lookTarget.set(x, y, z); }

  update(dt) {
    const factor = 1 - Math.exp(-config.camera.damping * dt);
    this.camera.position.lerp(this.targetPos, factor);
    this.camera.lookAt(this.lookTarget);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }
}
