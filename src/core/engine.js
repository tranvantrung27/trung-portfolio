import { createScene } from './scene.js';
import { CameraController } from './camera.js';
import { createRenderer } from './renderer.js';
import * as THREE from './three.js';

export class SceneManager {
  constructor(canvas) {
    this.scene = createScene();
    this.cameraCtrl = new CameraController();
    const { renderer, composer, renderPass } = createRenderer(canvas);
    this.renderer = renderer;
    this.composer = composer;
    renderPass.scene = this.scene;
    renderPass.camera = this.cameraCtrl.camera;
    this.carObj = null; 
  }

  loadModel(CarClass, url, onLoad) {
    this.carObj = new CarClass(this.scene);
    this.carObj.load(url, (model) => {
      if (onLoad) onLoad(model);
    });
  }

  onResize() {
    this.cameraCtrl.onResize();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  render() {
    this.composer.render();
  }
}
