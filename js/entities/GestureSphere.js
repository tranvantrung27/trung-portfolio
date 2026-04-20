/**
 * GestureSphere - Updated to use the 2D Canvas-based "Magical Beads" system provided by the user.
 * Features: Multi-layered beads, dynamic rings, nebula background, and energy sparks.
 */
export class GestureSphere {
  constructor(canvas) {
    if (!canvas || typeof canvas.getContext !== 'function') {
      console.error('GestureSphere: Invalid canvas element provided');
      return;
    }
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Real CSS dimensions (populated by resize())
    this.W = 0;
    this.H = 0;
    this.DPR = 1;

    this.particles = [];
    this.rings = [];
    this.count = 1200;
    this.ringCount = 120;

    this.explodeT = 0;
    this.time = 0;
    this.rotX = 0.3;
    this.rotY = 0;
    this.handDetected = false;
    this.smoothHX = 0.5;
    this.smoothHY = 0.5;
    this.isOpen = false;
    this.center = { x: 0, y: 0 };

    this.resize();
    this._resizeHandler = () => this.resize();
    window.addEventListener('resize', this._resizeHandler);

    this.init();
  }

  resize() {
    const cv = this.canvas;
    this.DPR = window.devicePixelRatio || 1;
    const rect = cv.getBoundingClientRect();
    this.W = rect.width || cv.offsetWidth || window.innerWidth;
    this.H = rect.height || cv.offsetHeight || window.innerHeight;

    cv.width = this.W * this.DPR;
    cv.height = this.H * this.DPR;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0); // reset before re-scaling
    this.ctx.scale(this.DPR, this.DPR);
  }

  getLayers() {
    // Particle base size = container-relative (crisp at any DPI)
    const base = Math.min(this.W, this.H) * 0.005;
    return [
      { col: '#ffe066', r: base * 1.0, ring: 0.0 },
      { col: '#ffb347', r: base * 1.1, ring: 0.0 },
      { col: '#ff6ec7', r: base * 1.0, ring: 0.0 },
      { col: '#c084fc', r: base * 1.2, ring: 0.5 },
      { col: '#818cf8', r: base * 1.1, ring: 0.5 },
      { col: '#38bdf8', r: base * 1.2, ring: 0.5 },
      { col: '#f43f5e', r: base * 1.4, ring: 1.0 },
      { col: '#a855f7', r: base * 1.3, ring: 1.0 },
      { col: '#34d399', r: base * 1.3, ring: 1.0 },
      { col: '#fbbf24', r: base * 1.2, ring: 1.0 },
      { col: '#ec4899', r: base * 1.4, ring: 1.0 },
      { col: '#00e5ff', r: base * 1.3, ring: 1.0 },
    ];
  }

  init() {
    const LAYERS = this.getLayers();
    // Initialize Beads
    for (let i = 0; i < this.count; i++) {
      const phi = Math.acos(1 - 2 * (i + 0.5) / this.count);
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
      const layer = LAYERS[i % LAYERS.length];
      const rScale = 0.88 + layer.ring * 0.14 + (Math.random() - 0.5) * 0.06;

      this.particles.push({
        nx: Math.sin(phi) * Math.cos(theta),
        ny: Math.sin(phi) * Math.sin(theta),
        nz: Math.cos(phi),
        rScale,
        col: layer.col,
        baseR: layer.r + Math.random() * layer.r * 0.4,
        vx: (Math.random() - 0.5),
        vy: (Math.random() - 0.5),
        vz: (Math.random() - 0.5),
        vs: 1.2 + Math.random() * 3.5,
        phase: Math.random() * Math.PI * 2
      });
    }

    // Initialize Rings
    for (let i = 0; i < this.ringCount; i++) {
      const LAYERS = this.getLayers();
      this.rings.push({
        angle: (i / this.ringCount) * Math.PI * 2,
        tilt: Math.random() * Math.PI,
        col: LAYERS[i % LAYERS.length].col,
        r: Math.min(this.W, this.H) * 0.003 + Math.random() * Math.min(this.W, this.H) * 0.002,
        speed: 0.3 + Math.random() * 0.7
      });
    }
  }

  setExplode(active) {
    this.isOpen = active;
  }

  setHandState(detected, x, y) {
    this.handDetected = detected;
    if (detected) {
      this.handX = x;
      this.handY = y;
    }
  }

  update(dt, cardRect) {
    this.time += dt * 60;

    // Anchor center directly to the card using its screen rect (no jitter)
    if (cardRect) {
      const targetX = cardRect.left + cardRect.width / 2;
      const targetY = cardRect.top + cardRect.height / 2;
      // Smooth lerp so center follows scroll gracefully
      if (this.center.x === 0 && this.center.y === 0) {
        this.center.x = targetX;
        this.center.y = targetY;
      } else {
        this.center.x += (targetX - this.center.x) * Math.min(1, dt * 20);
        this.center.y += (targetY - this.center.y) * Math.min(1, dt * 20);
      }
      // Store card size for R calculation
      this._cardW = cardRect.width;
      this._cardH = cardRect.height;
    }

    const target = (this.handDetected && this.isOpen) ? 1 : 0;
    this.explodeT += (target - this.explodeT) * 0.065;

    if (this.handDetected) {
      this.smoothHX += (this.handX - this.smoothHX) * 0.12;
      this.smoothHY += (this.handY - this.smoothHY) * 0.12;
      this.rotY += (this.smoothHX - 0.5) * 0.09;
      this.rotX += (this.smoothHY - 0.5) * 0.04;
    } else {
      this.rotY += 0.010;
      this.rotX += 0.004;
    }
  }

  render() {
    const ctx = this.ctx;
    const W = this.W;
    const H = this.H;
    const CX = this.center.x;
    const CY = this.center.y;
    // R = relative to card size so sphere fits inside the card perfectly
    const cardMin = Math.min(this._cardW || 250, this._cardH || 250);
    const R = cardMin * 0.68;
    const fov = 800;
    const frame = this.time;

    ctx.clearRect(0, 0, W, H);

    const cosX = Math.cos(this.rotX), sinX = Math.sin(this.rotX);
    const cosY = Math.cos(this.rotY), sinY = Math.sin(this.rotY);

    // ── Background nebula ──
    const t1 = frame * 0.008;
    const nbx = CX + Math.cos(t1 * 0.7) * W * 0.05;
    const nby = CY + Math.sin(t1 * 0.5) * H * 0.04;
    const nb = ctx.createRadialGradient(nbx, nby, 0, CX, CY, R * 2.2);
    if (this.explodeT > 0.3) {
      nb.addColorStop(0, `rgba(255,100,60,${0.06 * this.explodeT})`);
      nb.addColorStop(0.4, `rgba(180,40,255,${0.04 * this.explodeT})`);
    } else {
      nb.addColorStop(0, 'rgba(80,40,200,0.10)');
      nb.addColorStop(0.4, 'rgba(140,60,255,0.05)');
    }
    nb.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath(); ctx.arc(CX, CY, R * 2.2, 0, Math.PI * 2);
    ctx.fillStyle = nb; ctx.fill();

    const rotate3 = (px, py, pz) => {
      const x1 = px * cosY + pz * sinY;
      const z1 = -px * sinY + pz * cosY;
      const y2 = py * cosX - z1 * sinX;
      const z2 = py * sinX + z1 * cosX;
      return [x1, y2, z2];
    };

    // ── Project beads ──
    const proj = this.particles.map((b) => {
      const e = this.explodeT * b.vs;
      const norm = Math.sqrt(b.vx ** 2 + b.vy ** 2 + b.vz ** 2) || 1;
      const px = (b.nx + b.vx / norm * e) * R * b.rScale;
      const py = (b.ny + b.vy / norm * e) * R * b.rScale;
      const pz = (b.nz + b.vz / norm * e) * R * b.rScale;

      const [x, y, z] = rotate3(px, py, pz);
      const sc = fov / (fov + z + R * 0.5);
      const sx = CX + x * sc, sy = CY + y * sc;

      const depth = (z + R) / (R * 2);
      const twinkle = 0.85 + 0.15 * Math.sin(frame * 0.07 + b.phase);
      const sz = b.baseR * sc * (0.5 + depth * 1.1) * twinkle;
      const alpha = (0.5 + depth * 0.5) * twinkle;

      return { sx, sy, sz, z, col: b.col, alpha, depth };
    });

    proj.sort((a, b) => a.z - b.z);

    // ── Ring orbits ──
    if (this.explodeT < 0.8) {
      const ra = (1 - this.explodeT);
      this.rings.forEach(rg => {
        rg.angle += rg.speed * 0.012;
        const px = Math.cos(rg.angle) * R * 1.05;
        const pz = Math.sin(rg.angle) * R * 1.05 * Math.cos(rg.tilt);
        const py = Math.sin(rg.angle) * R * 1.05 * Math.sin(rg.tilt);
        const [x, y, z2] = rotate3(px, py, pz);
        const sc = fov / (fov + z2 + R * 0.5);
        const sx = CX + x * sc, sy2 = CY + y * sc;
        const depth = (z2 + R) / (R * 2);
        ctx.save();
        ctx.globalAlpha = ra * 0.55 * (0.4 + depth * 0.6);
        ctx.beginPath();
        ctx.arc(sx, sy2, rg.r * sc * (0.6 + depth * 0.8), 0, Math.PI * 2);
        const rg2 = ctx.createRadialGradient(sx - rg.r * 0.3, sy2 - rg.r * 0.3, 0, sx, sy2, rg.r * sc * 1.5);
        rg2.addColorStop(0, '#fff');
        rg2.addColorStop(0.3, rg.col);
        rg2.addColorStop(1, rg.col + '00');
        ctx.fillStyle = rg2;
        ctx.fill();
        ctx.restore();
      });
    }

    // ── Draw beads ──
    proj.forEach(d => {
      if (d.sz < 0.3) return;
      ctx.save();
      ctx.globalAlpha = d.alpha;
      const g = ctx.createRadialGradient(
        d.sx - d.sz * 0.3, d.sy - d.sz * 0.3, d.sz * 0.02,
        d.sx, d.sy, d.sz * 0.85  // tight gradient = sharp, not blurry
      );
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.15, '#fff8f8');
      g.addColorStop(0.4, d.col);
      g.addColorStop(0.75, d.col + '88');
      g.addColorStop(1, d.col + '00');
      ctx.beginPath();
      ctx.arc(d.sx, d.sy, d.sz, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();

      // Specular highlight (only on bigger beads)
      if (d.sz > 0.8) {
        ctx.globalAlpha = d.alpha * 0.7;
        ctx.beginPath();
        ctx.arc(d.sx - d.sz * 0.28, d.sy - d.sz * 0.28, d.sz * 0.28, 0, Math.PI * 2);
        const hg = ctx.createRadialGradient(
          d.sx - d.sz * 0.28, d.sy - d.sz * 0.28, 0,
          d.sx - d.sz * 0.28, d.sy - d.sz * 0.28, d.sz * 0.28
        );
        hg.addColorStop(0, 'rgba(255,255,255,0.9)');
        hg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = hg;
        ctx.fill();
      }
      ctx.restore();
    });

    // ── Energy sparks ──
    if (this.explodeT > 0.1) {
      proj.forEach(d => {
        if (Math.random() > 0.92) {
          ctx.save();
          ctx.globalAlpha = this.explodeT * 0.7 * Math.random();
          ctx.strokeStyle = d.col;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(d.sx, d.sy);
          ctx.lineTo(
            d.sx + (Math.random() - 0.5) * 60 * this.explodeT,
            d.sy + (Math.random() - 0.5) * 60 * this.explodeT
          );
          ctx.stroke();
          ctx.restore();
        }
      });
    }

    // ── Core pulse ──
    const pulse = 0.5 + 0.5 * Math.sin(frame * 0.045);
    const coreR = R * (0.08 + 0.04 * pulse) * (1 - this.explodeT * 0.8);
    if (coreR > 1) {
      const core = ctx.createRadialGradient(CX, CY, 0, CX, CY, coreR * 3);
      core.addColorStop(0, 'rgba(255,255,255,0.95)');
      core.addColorStop(0.2, 'rgba(220,180,255,0.6)');
      core.addColorStop(0.5, 'rgba(140,80,255,0.2)');
      core.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(CX, CY, coreR * 3, 0, Math.PI * 2);
      ctx.fillStyle = core; ctx.fill();
    }
  }
}
