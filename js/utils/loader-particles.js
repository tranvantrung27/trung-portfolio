/**
 * LOADER PARTICLES
 * A minimalist particle system for the loading screen.
 * Designed to provide immediate visual feedback while the main app loads.
 */
export function initLoaderParticles(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let particles = [];
  let w, h;

  const resize = () => {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  };

  window.addEventListener('resize', resize);
  resize();

  class Particle {
    constructor() {
      this.init();
    }

    init() {
      this.x = Math.random() * w;
      this.y = Math.random() * h;
      this.size = Math.random() * 2;
      this.speedX = (Math.random() - 0.5) * 0.5;
      this.speedY = (Math.random() - 0.5) * 0.5;
      this.alpha = Math.random();
    }

    update() {
      this.x += this.speedX;
      this.y += this.speedY;

      if (this.x < 0 || this.x > w || this.y < 0 || this.y > h) {
        this.init();
      }
    }

    draw() {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (let i = 0; i < 100; i++) {
    particles.push(new Particle());
  }

  const animate = () => {
    if (!document.getElementById(canvasId)) return; // Stop if removed
    ctx.clearRect(0, 0, w, h);
    
    particles.forEach(p => {
      p.update();
      p.draw();
    });
    
    requestAnimationFrame(animate);
  };

  animate();
}
