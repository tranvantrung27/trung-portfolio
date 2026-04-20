import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * ScrollManager — Handles section-based robot state and drone lifecycle.
 *
 * @param {Robot}    robot       - the main 3D robot
 * @param {Mosquito} mosquito    - the drone instance
 * @param {Function} isGameActive - getter fn returning current game state flag
 */
export class ScrollManager {
  constructor(robot, gun, mosquito, arcade, isGameActive, app) {
    this.robot = robot;
    this.gun = gun;
    this.mosquito = mosquito;
    this.arcade = arcade;
    this.isGameActive = isGameActive; // Getter fn, e.g. () => isGameActive
    this.app = app;
    this.currentState = 'home';
    this.init();
  }

  init() {
    ['home', 'about', 'projects', 'skills', 'contact'].forEach((id) => {
      ScrollTrigger.create({
        trigger: `#${id}`,
        start: 'top center',
        end: 'bottom center',
        onEnter: () => this.onSectionEnter(id),
        onEnterBack: () => this.onSectionEnter(id),
      });
    });

    ScrollTrigger.create({
      trigger: 'main',
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => this.updateVisibility(self.progress),
    });
  }

  onSectionEnter(id) {
    if (this.currentState === id) return;
    this.currentState = id;
    this.robot.setState(id);

    // Arcade: only visible on home — slide in/out
    if (this.arcade) {
      if (id === 'home') {
        this.arcade.show();
      } else {
        this.arcade.hide();
      }
    }

    if (id === 'home') {
      // Re-enable HUD only if the user already said YES
      if (this.isGameActive()) {
        this.gun.enable();
        this.mosquito.enable();
      }
    } else {
      // Always disable HUD when leaving HOME — stops sounds, rendering & listeners
      this.gun.disable();
      this.mosquito.disable();
    }

    // AI UI Container visibility (Only show on 'about' section)
    const aiUIContainer = document.getElementById('ai-ui-container');
    if (aiUIContainer) {
      if (id === 'about') {
        aiUIContainer.classList.add('visible');
      } else {
        aiUIContainer.classList.remove('visible');
        if (this.app && this.app.isAIActive) {
          this.app.toggleAI();
        }
      }
    }

    // Special Entrance Animations
    if (id === 'projects') {
      gsap.fromTo('.project-card', 
        { y: 50, opacity: 0 }, 
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.15, ease: 'power3.out', delay: 0.2 }
      );
    }
  }

  updateVisibility(progress) {
    const sections = document.querySelectorAll('section');
    const total = sections.length;
    sections.forEach((s, i) => {
      const inView = progress >= i / total - 0.05 && progress < (i + 1) / total + 0.05;
      s.classList.toggle('visible', inView);
    });
    const indicator = document.querySelector('.scroll-indicator');
    if (indicator) indicator.style.opacity = progress > 0.03 ? '0' : '1';
  }
}
