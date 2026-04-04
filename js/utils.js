/**
 * CONFIG — Central configuration for the robot portfolio.
 */
export const config = {
  camera: {
    fov: 45,
    near: 0.01,
    far: 100,
    startPos: [0.5, 1.0, 7],
    damping: 3,
  },

  robot: {
    scale: 0.9,
    states: {
      home:     { pos: [2.0, -1.0, 0],    rotY: -0.3 },
      projects: { pos: [4.5, -1.0, -3.5], rotY: -0.5 },
      skills:   { pos: [4.5, -1.0, -3.0], rotY: 0.3 },
      contact:  { pos: [1.5, -1.0, -1],   rotY: Math.PI },
    },
    floatAmplitude: 0.06,
    floatSpeed: 1.5,
    idleRotateSpeed: 0.0006,
    emissive: 0x222222,
    emissiveIntensity: 0.5,
  },

  lighting: {
    ambient:     { color: 0x6366f1, intensity: 0.7 },
    key:         { color: 0xffffff, intensity: 3.0,  pos: [5, 10, 5] },
    fill:        { color: 0xffffff, intensity: 1.5,  pos: [-5, 5, 5] },
    rim:         { color: 0x6366f1, intensity: 3.0,  pos: [5, 5, -5] },
    hemisphere:  { intensity: 1.0 },
  },
};

export function lerp(a, b, t) {
  return a + (b - a) * t;
}
