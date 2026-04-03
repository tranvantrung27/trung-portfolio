import * as THREE from '../core/three.js';
import { config } from '../utils.js';

export class CameraController {
  constructor() {
    this.camera = new THREE.PerspectiveCamera(config.camera.fov, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(...config.camera.startPos);
    this.targetPos = new THREE.Vector3(...config.camera.startPos);
    this.shakeIntensity = 0;
  }

  update(dt) {
    const lerpFactor = 1 - Math.exp(-config.camera.damping * dt);
    this.camera.position.lerp(this.targetPos, lerpFactor);

    if (this.shakeIntensity > 0) {
      const shake = new THREE.Vector3(
        (Math.random() - 0.5) * this.shakeIntensity,
        (Math.random() - 0.5) * this.shakeIntensity,
        (Math.random() - 0.5) * this.shakeIntensity
      );
      this.camera.position.add(shake);
      this.shakeIntensity *= 0.9;
    }
  }

  setTarget(x, y, z) {
    this.targetPos.set(x, y, z);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }
}
