import { createScene } from './scene.js';
import { CameraController } from './camera.js';
import { createRenderer } from './renderer.js';

/**
 * SceneManager — Orchestrates scene, camera, renderer.
 */
export class SceneManager {
  constructor(canvas) {
    this.scene = createScene();
    this.cameraCtrl = new CameraController();

    const { renderer } = createRenderer(canvas);
    this.renderer = renderer;
  }

  onResize() {
    this.cameraCtrl.onResize();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render() {
    this.renderer.render(this.scene, this.cameraCtrl.camera);
  }
}
