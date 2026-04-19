import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js';
import { createScene } from './Scene.js';
import { CameraController } from './Camera.js';
import { createRenderer } from './Renderer.js';

/**
 * SceneManager — Orchestrates scene, camera, renderer + post-processing.
 * Also exposes a HUD scene rendered on top (same renderer, autoClear:false).
 */
export class SceneManager {
  constructor(canvas) {
    this.scene = createScene();

    // HUD scene: rendered AFTER main scene, same renderer — no extra canvas needed
    this.hudScene = new THREE.Scene();

    // Orthographic camera for HUD (covers [-1,1] in both axes)
    this.hudCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);
    this.hudCamera.position.z = 1;

    this.cameraCtrl = new CameraController();

    const { renderer } = createRenderer(canvas);
    this.renderer = renderer;

    // ─── Post-processing ────────────────────────────────────────
    const size = new THREE.Vector2(window.innerWidth, window.innerHeight);
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(this.scene, this.cameraCtrl.camera));

    // Outline pass — used for arcade hover highlight
    this.outlinePass = new OutlinePass(size, this.scene, this.cameraCtrl.camera);
    this.outlinePass.edgeStrength = 5.0;
    this.outlinePass.edgeGlow = 0.7;
    this.outlinePass.edgeThickness = 2.0;
    this.outlinePass.visibleEdgeColor.set('#ffffff');
    this.outlinePass.hiddenEdgeColor.set('#ff3333');
    this.outlinePass.selectedObjects = [];
    this.composer.addPass(this.outlinePass);

    // Gamma correction so output matches original colour profile
    this.composer.addPass(new ShaderPass(GammaCorrectionShader));
  }

  onResize() {
    this.cameraCtrl.onResize();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  render() {
    // Render through composer (includes outline pass)
    this.renderer.autoClear = true;
    this.composer.render();
  }

  renderHUD() {
    // HUD pass — rendered directly after composer, no clear
    this.renderer.autoClear = false;
    this.renderer.render(this.hudScene, this.hudCamera);
    this.renderer.autoClear = true;
  }
}
