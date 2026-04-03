import Lenis from 'lenis';

/**
 * UIManager - Manages Lenis Smooth Scroll and Global UI states.
 */
export class UIManager {
  constructor() {
    this.lenis = new Lenis({
        lerp: 0.05,
        smoothWheel: true,
    });
    this.init();
  }

  init() {
    // 1. Navbar Navigation Click
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                this.lenis.scrollTo(targetSection, {
                    offset: 0,
                    duration: 2.0, // Slow, cinematic scroll
                    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
                });
            }
        });
    });

    // 2. Request animation loop for Lenis
    const raf = (time) => {
        this.lenis.raf(time);
        requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);

    // 3. Highlight Active Section in Navbar
    window.addEventListener('scroll', () => {
        let current = "";
        const sections = document.querySelectorAll('section');
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            if (window.pageYOffset >= sectionTop - 150) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });

    console.log('Premium UI Layer Initialized successfully.');
  }
}
