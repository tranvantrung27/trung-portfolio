import { gsap } from 'gsap';

/**
 * ProjectModal — Handles the holographic detail view for projects.
 * Features: Glitch transitions, backdrop blur, and staggered content reveal.
 */
export class ProjectModal {
  constructor(onCloseCallback) {
    this.overlay = null;
    this.isOpen = false;
    this.onCloseCallback = onCloseCallback;
    this.init();
  }

  init() {
    // Create overlay if not exists
    if (!document.querySelector('.project-modal-overlay')) {
      const overlay = document.createElement('div');
      overlay.className = 'project-modal-overlay';
      overlay.innerHTML = `
        <div class="project-modal">
          <div class="modal-corner tl"></div>
          <div class="modal-corner br"></div>
          <button class="modal-close" aria-label="Close modal">×</button>
          <div class="modal-content">
            <!-- Dynamic Content Injected Here -->
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      this.overlay = overlay;
      
      // Close button listener
      this.overlay.querySelector('.modal-close').addEventListener('click', () => this.close());
      
      // Close on backdrop click
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) this.close();
      });

      // Close on ESC
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen) this.close();
      });
    } else {
      this.overlay = document.querySelector('.project-modal-overlay');
    }
  }

  open(project, sourceElement) {
    if (this.isOpen) return;
    this.isOpen = true;

    // Hide the grid
    const grid = document.querySelector('.project-grid');
    if (grid) grid.classList.add('grid-hidden');

    const content = this.overlay.querySelector('.modal-content');
    content.innerHTML = `
      <div class="modal-header-img">
        <img src="${project.image}" alt="${project.title}" />
      </div>
      <div class="modal-body">
        <div class="modal-tags">
          ${project.tags.map(t => `<span class="tag"><span class="tag-dot"></span>${t}</span>`).join('')}
        </div>
        <h2 class="gradient-text">${project.title}</h2>
        <p class="modal-desc">${project.longDesc}</p>
        
        <div class="modal-info-grid">
          <div class="info-item">
            <h4>Technologies Used</h4>
            <div class="tech-stack">
              ${project.tech.map(t => `<span class="tech-item">${t}</span>`).join('')}
            </div>
          </div>
          <div class="info-item">
            <h4>Project Links</h4>
            <div class="modal-cta">
              <a href="${project.links.demo || '#'}" target="_blank" class="modal-btn modal-btn-primary">LIVE DEMO</a>
              <a href="${project.links.github || '#'}" target="_blank" class="modal-btn modal-btn-outline">GITHUB SOURCE</a>
            </div>
          </div>
        </div>
      </div>
    `;

    this.overlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    // GSAP Entrance - Emerge from clicked element spot
    const tl = gsap.timeline();
    const modalEl = this.overlay.querySelector('.project-modal');
    
    // If we have a source element, start slightly smaller and from that general area
    tl.fromTo(modalEl, 
      { scale: 0.6, opacity: 0, y: 100, filter: 'blur(10px)' }, 
      { scale: 1, opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.8, ease: 'expo.out' }
    );
    
    tl.from('.modal-body > *', {
      opacity: 0,
      y: 30,
      duration: 0.5,
      stagger: 0.1,
      ease: 'power3.out'
    }, "-=0.4");
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    
    gsap.to(this.overlay.querySelector('.project-modal'), {
      scale: 0.9,
      opacity: 0,
      y: 40,
      duration: 0.4,
      ease: 'power2.inOut',
      onComplete: () => {
        this.overlay.classList.remove('open');
        document.body.style.overflow = '';
        
        // Show the grid back
        const grid = document.querySelector('.project-grid');
        if (grid) grid.classList.remove('grid-hidden');
        
        if (this.onCloseCallback) this.onCloseCallback();
      }
    });
  }
}
