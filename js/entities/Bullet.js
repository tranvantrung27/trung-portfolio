import * as THREE from 'three';

/**
 * Bullet — A visual "Red Tracer" laser projectile.
 * Optimized for the HUD scene to ensure perfect muzzle alignment.
 */
export class Bullet {
  constructor(scene, startPos, direction) {
    this.scene = scene;
    this.speed = 15.0; // Fast tracer
    this.active = true;
    this.time = 0;
    this.maxLife = 0.3; // Short life span

    // 1. Visual Beam (Cylinder pointing forward)
    const geo = new THREE.CylinderGeometry(0.005, 0.005, 0.25, 6);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff3333, // Slightly brighter red
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending, // Energy glow effect
    });
    
    this.mesh = new THREE.Mesh(geo, mat);

    // 2. Setup Initial Position & Orientation
    this.mesh.position.copy(startPos);
    
    // Orient cylinder (vertical by default) to point along the direction
    this.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());

    this.scene.add(this.mesh);
  }

  update(dt) {
    if (!this.active) return;
    this.time += dt;

    // 1. Move forward
    const forward = new THREE.Vector3(0, 1, 0).applyQuaternion(this.mesh.quaternion);
    this.mesh.position.addScaledVector(forward, this.speed * dt);

    // 2. Snappy fade out
    const lifeRatio = this.time / this.maxLife;
    this.mesh.material.opacity = Math.pow(1.0 - lifeRatio, 2); 

    // 3. Cleanup
    if (this.time >= this.maxLife) {
      this.destroy();
    }
  }

  destroy() {
    this.active = false;
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
