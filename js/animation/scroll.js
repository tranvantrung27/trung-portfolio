import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export class ScrollManager {
  constructor(robot) {
    this.robot = robot;
    this.currentState = 'home';
    this.init();
  }

  init() {
    ['home', 'projects', 'skills', 'contact'].forEach((id) => {
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
