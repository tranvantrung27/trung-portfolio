/**
 * UIManager — Smooth scroll, navbar active state, and hamburger toggle.
 */
export class UIManager {
  constructor() {
    this.navToggle = document.getElementById('navToggle');
    this.navLinks = document.getElementById('navLinks');
    this.links = document.querySelectorAll('.nav-link');
    this.init();
  }

  init() {
    this.initSmoothScroll();
    this.initActiveTracking();
    this.initHamburger();
  }

  initSmoothScroll() {
    this.links.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        this.closeMenu();
      });
    });
  }

  initActiveTracking() {
    window.addEventListener('scroll', () => {
      let current = '';
      document.querySelectorAll('section').forEach((section) => {
        if (window.pageYOffset >= section.offsetTop - 200) {
          current = section.id;
        }
      });
      this.links.forEach((link) => {
        link.classList.toggle(
          'active',
          link.getAttribute('href') === `#${current}`
        );
      });
    });
  }

  initHamburger() {
    if (!this.navToggle || !this.navLinks) return;

    this.navToggle.addEventListener('click', () => {
      this.navToggle.classList.toggle('active');
      this.navLinks.classList.toggle('open');
      document.body.style.overflow = this.navLinks.classList.contains('open') ? 'hidden' : '';
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('nav')) {
        this.closeMenu();
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        this.closeMenu();
      }
    });
  }

  closeMenu() {
    if (!this.navToggle || !this.navLinks) return;
    this.navToggle.classList.remove('active');
    this.navLinks.classList.remove('open');
    document.body.style.overflow = '';
  }
}
