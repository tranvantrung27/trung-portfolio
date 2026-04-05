import * as THREE from 'three';

/**
 * Spark — Muzzle flash particle burst.
 * Spawns N particles that scatter and fade, then self-clean.
 */
export class Spark {
  constructor(scene, origin, { count = 8, color = 0xffaa00, life = 0.2, spread = 2, forwardBias = 2 } = {}) {
    this.scene = scene;
    this.particles = [];
    this.active = true;

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.01, 4, 4),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 1,
          blending: THREE.AdditiveBlending,
        })
      );

      mesh.position.copy(origin);

      mesh.userData.vel = new THREE.Vector3(
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread,
        Math.random() * forwardBias
      );

      mesh.userData.life = life;
      mesh.userData.maxLife = life;

      this.scene.add(mesh);
      this.particles.push(mesh);
    }
  }

  update(dt) {
    if (!this.active) return;

    let allDead = true;

    for (const p of this.particles) {
      p.userData.life -= dt;

      if (p.userData.life <= 0) {
        this.scene.remove(p);
        p.geometry.dispose();
        p.material.dispose();
        continue;
      }

      allDead = false;

      p.position.addScaledVector(p.userData.vel, dt);
      p.material.opacity = p.userData.life / p.userData.maxLife;

      // Gravity pull
      p.userData.vel.y -= dt * 3;
    }

    if (allDead) {
      this.active = false;
      this.particles.length = 0;
    }
  }
}
