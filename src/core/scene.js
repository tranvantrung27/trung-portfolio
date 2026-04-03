import * as THREE from './three.js';

export function createScene() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.012);

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xffffff, 2);
  mainLight.position.set(10, 20, 10);
  scene.add(mainLight);

  const blueLight = new THREE.PointLight(0x3b82f6, 50, 50);
  blueLight.position.set(-10, 5, -10);
  scene.add(blueLight);

  return scene;
}
