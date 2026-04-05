import * as THREE from 'three';

/**
 * Laser — Dashed red beam attached to muzzle.
 * Auto-removes after a short duration.
 */
export class Laser {
  constructor(muzzle, { color = 0xff0000, length = 2, dashSize = 0.2, gapSize = 0.1, duration = 100 } = {}) {
    this.muzzle = muzzle;
    this.duration = duration;

    const material = new THREE.LineDashedMaterial({
      color,
      dashSize,
      gapSize,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
    });

    const points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, length, 0),
    ];

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    this.line = new THREE.Line(geometry, material);
    this.line.computeLineDistances();

    this.muzzle.add(this.line);

    this._timer = setTimeout(() => this.destroy(), this.duration);
  }

  destroy() {
    clearTimeout(this._timer);
    this.muzzle.remove(this.line);
    this.line.geometry.dispose();
    this.line.material.dispose();
  }
}
