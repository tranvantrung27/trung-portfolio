/**
 * UIManager — Smooth scroll + navbar active state.
 * Lenis replaced with native smooth scroll (no CDN dependency needed).
 */
export class UIManager {
  constructor() {
    this.init();
  }

  init() {
    const navLinks = document.querySelectorAll('.nav-link');

    // Navbar click → smooth scroll
    navLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    // Active link tracking
    window.addEventListener('scroll', () => {
      let current = '';
      document.querySelectorAll('section').forEach((section) => {
        if (window.pageYOffset >= section.offsetTop - 200) {
          current = section.id;
        }
      });
      navLinks.forEach((link) => {
        link.classList.toggle(
          'active',
          link.getAttribute('href') === `#${current}`
        );
      });
    });
  }
}
