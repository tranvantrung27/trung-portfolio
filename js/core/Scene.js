import * as THREE from 'three';
import { config } from '../utils/utils.js';

/**
 * Creates the 3D scene with cinematic studio lighting.
 * Background is transparent (CSS radial gradient shows through).
 */
export function createScene() {
  const scene = new THREE.Scene();

  scene.background = null;
  scene.environment = new THREE.Color(0x222233);
  scene.fog = new THREE.FogExp2(0x0f172a, 0.035);

  const ambient = new THREE.AmbientLight(config.lighting.ambient.color, config.lighting.ambient.intensity);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(config.lighting.key.color, config.lighting.key.intensity);
  keyLight.position.set(...config.lighting.key.pos);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 30;
  keyLight.shadow.camera.left = -10;
  keyLight.shadow.camera.right = 10;
  keyLight.shadow.camera.top = 10;
  keyLight.shadow.camera.bottom = -10;
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.normalBias = 0.02;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(config.lighting.fill.color, config.lighting.fill.intensity);
  fillLight.position.set(...config.lighting.fill.pos);
  scene.add(fillLight);

  const rimLight = new THREE.PointLight(config.lighting.rim.color, config.lighting.rim.intensity, 25);
  rimLight.position.set(...config.lighting.rim.pos);
  scene.add(rimLight);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1e293b, config.lighting.hemisphere.intensity);
  scene.add(hemiLight);

  const groundGeo = new THREE.PlaneGeometry(40, 40);
  const groundMat = new THREE.ShadowMaterial({ opacity: 0.3 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.2;
  ground.receiveShadow = true;
  scene.add(ground);

  return scene;
}
