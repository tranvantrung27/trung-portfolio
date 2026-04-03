/**
 * CONFIGURATION & MATH UTILITIES
 */
export const config = {
  // ---------- Camera ----------
  camera: {
    fov: 60,
    startPos: [0, 5, 200], // Start cinematic/distance view
    damping: 6.5,          // Higher = faster tracking
    shake: 0.1,
  },

  // ---------- Bloom Effect (Cinematic Glow) ----------
  bloom: {
    strength: 1.5,         // High intensity for the neon look
    radius: 0.8,
    threshold: 0.1,       // Catch most highlight colors
  },

  // ---------- Light Trail ----------
  trail: {
    maxPoints: 100, 
    color: 0x3b82f6,      // Electric Blue
    fadeSpeed: 0.05,
  },

  // ---------- Motion ----------
  motion: {
    ease: 'power2.inOut',
    lerp: 0.12,
  },
};

export function lerp(a, b, t) {
  return a + (b - a) * t;
}
