import * as THREE from '../core/three.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export class AnimationManager {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.progress = 0;
    this.lerpedProgress = 0;

    // Cinematic Path (Z axis goes from 200 to -300)
    this.curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 5, 200),     // Start far back in space (Cinematic)
        new THREE.Vector3(-15, 0, 100),   // Dataset
        new THREE.Vector3(25, -5, 0),      // AI Model
        new THREE.Vector3(-10, 8, -100),   // Flutter App
        new THREE.Vector3(5, 5, -200),     // Skills
        new THREE.Vector3(0, 0, -300),     // Contact
    ]);

    this.init();
  }

  init() {
    gsap.to(this, {
        progress: 1,
        scrollTrigger: {
            trigger: "main",
            start: "top top",
            end: "bottom bottom",
            scrub: true,
            onUpdate: (self) => this.updateUI(self.progress)
        }
    });
  }

  updateUI(p) {
    const sections = document.querySelectorAll('section');
    const index = Math.floor(p * (sections.length + 0.5));
    sections.forEach((s, i) => {
        if (i === Math.min(index, sections.length - 1)) {
            s.classList.add('visible');
        } else {
            s.classList.remove('visible');
        }
    });

    const indicator = document.querySelector('.scroll-indicator');
    if (indicator) {
        indicator.style.opacity = p > 0.05 ? '0' : '1';
    }
  }

  /**
   * Update frame (called by main loop).
   */
  update(dt) {
    this.lerpedProgress += (this.progress - this.lerpedProgress) * 0.1;
    
    if (this.sceneManager.carObj) {
      this.sceneManager.carObj.setPath(this.curve);
      this.sceneManager.carObj.update(this.lerpedProgress);

      const point = this.curve.getPointAt(this.lerpedProgress);
      const camOffset = new THREE.Vector3(8, 4, 12);
      const targetCamPos = point.clone().add(camOffset);
      
      this.sceneManager.cameraCtrl.setTarget(targetCamPos.x, targetCamPos.y, targetCamPos.z);
      this.sceneManager.cameraCtrl.camera.lookAt(this.sceneManager.carObj.group.position);
    }
  }
}
