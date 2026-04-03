import * as THREE from '../core/three.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { config } from '../utils.js';

/**
 * Car - Wrapper Group Pattern
 * 
 * Structure:
 *   carGroup (this.group)        ← position + lookAt on curve
 *   └── carModel (this.model)    ← static rotation offset only
 * 
 * carGroup handles: position, direction (lookAt tangent)
 * carModel handles: orientation offset to align model's forward axis
 */
export class Car {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();   // Wrapper: moves + rotates along path
    this.model = null;                // Inner: static orientation offset
    this.loader = new GLTFLoader();
    this.curve = null;

    // Light Trail (buffer-limited, no memory leak)
    this.trailPoints = [];
    this.trailGeometry = new THREE.BufferGeometry();
    this.trailMaterial = new THREE.MeshBasicMaterial({
      color: config.trail.color,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    this.trailMesh = new THREE.Mesh(this.trailGeometry, this.trailMaterial);

    // Debug reference
    window.car_debug = this;
  }

  load(url, callback) {
    this.loader.load(url, (gltf) => {
      this.model = gltf.scene;

      /**
       * ORIENTATION OFFSET (applied once, never touched again)
       * 
       * GLB from Unity/Unreal often has a different forward axis.
       * We rotate the inner model so its "nose" points along -Z 
       * (Three.js default forward for lookAt).
       * 
       * Common offsets to try if car faces wrong way:
       *   Y = 0        → default
       *   Y = Math.PI  → 180° flip (facing backward → facing forward)
       *   Y = Math.PI/2 → 90° turn
       */
      this.model.rotation.set(0, Math.PI, 0);

      this.model.traverse((child) => {
        if (child.isMesh) {
          if (child.name.toLowerCase().includes('light')) {
            child.material.emissive = new THREE.Color(config.trail.color);
            child.material.emissiveIntensity = 15;
          }
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Nest model inside the wrapper group
      this.group.add(this.model);
      this.group.scale.set(1.5, 1.5, 1.5);

      this.scene.add(this.group);
      this.scene.add(this.trailMesh);

      if (callback) callback(this.group);
    });
  }

  setPath(curve) {
    this.curve = curve;
  }

  /**
   * Update car position and orientation each frame.
   * 
   * Logic:
   *   1. group.position = point on curve
   *   2. group.lookAt(point + tangent) → faces forward along path
   *   3. model inside already has its static offset → nose aligns correctly
   */
  update(progress) {
    if (!this.group || !this.curve) return;

    const p = Math.max(0, Math.min(0.999, progress));
    const point = this.curve.getPointAt(p);
    const tangent = this.curve.getTangentAt(p).normalize();

    // 1. Move the wrapper group to the curve point
    this.group.position.copy(point);

    // 2. Orient the wrapper group along the tangent
    //    Set up-vector BEFORE lookAt to prevent flipping
    this.group.up.set(0, 1, 0);
    const lookTarget = point.clone().add(tangent);
    this.group.lookAt(lookTarget);

    // 3. (Optional) Subtle banking tilt on the group's local Z
    //    Very low intensity so it doesn't cause visual issues
    this.group.rotateOnAxis(new THREE.Vector3(0, 0, 1), tangent.x * 0.08);

    // 4. Update light trail
    this.updateTrail(point);
  }

  updateTrail(point) {
    // Only add if moved enough (prevents z-fighting)
    if (this.trailPoints.length > 0) {
      if (point.distanceTo(this.trailPoints[this.trailPoints.length - 1]) < 0.1) return;
    }

    this.trailPoints.push(point.clone());
    if (this.trailPoints.length > config.trail.maxPoints) {
      this.trailPoints.shift();
    }
    if (this.trailPoints.length < 2) return;

    const vertices = [];
    const width = 0.3;
    for (let i = 0; i < this.trailPoints.length; i++) {
      const p = this.trailPoints[i];
      vertices.push(p.x, p.y + width, p.z);
      vertices.push(p.x, p.y - width, p.z);
    }
    this.trailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    this.trailGeometry.attributes.position.needsUpdate = true;
  }
}
