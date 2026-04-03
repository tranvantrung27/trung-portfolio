import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { config } from '../utils.js';

export class Robot {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.mixer = null;
    this.clock = new THREE.Clock();

    this.targetPos = new THREE.Vector3(...config.robot.states.home.pos);
    this.targetRotY = config.robot.states.home.rotY;

    this.group.position.set(...config.robot.states.home.pos);
    this.group.rotation.y = config.robot.states.home.rotY;
    this.group.scale.setScalar(config.robot.scale);
    this.scene.add(this.group);
  }

  load(url, callback) {
    const loader = new GLTFLoader();
    loader.load(url, (gltf) => {
      const model = gltf.scene;

      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.emissive = new THREE.Color(config.robot.emissive);
            child.material.emissiveIntensity = config.robot.emissiveIntensity;
          }
        }
      });

      this.group.add(model);

      if (gltf.animations && gltf.animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(model);
        this.mixer.clipAction(gltf.animations[0]).play();
      }

      if (callback) callback(this.group);
    });
  }

  setState(stateName) {
    const state = config.robot.states[stateName];
    if (!state) return;
    this.targetPos.set(...state.pos);
    this.targetRotY = state.rotY;
  }

  update(dt, elapsedTime) {
    if (this.mixer) this.mixer.update(dt);
    this.group.position.lerp(this.targetPos, 3 * dt);
    this.group.rotation.y += (this.targetRotY - this.group.rotation.y) * 3 * dt;
    this.group.position.y = this.targetPos.y + Math.sin(elapsedTime * config.robot.floatSpeed) * config.robot.floatAmplitude;
    this.targetRotY += config.robot.idleRotateSpeed;
  }
}
