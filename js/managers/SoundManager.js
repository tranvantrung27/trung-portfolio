/**
 * SOUNDS REGISTRY
 * Centralized audio assets for the portfolio.
 */
const BASE = import.meta.env.BASE_URL;

export const SOUNDS = {
  SFX: {
    LASER_HIT: `${BASE}assets/sounds/laser_hit.mp3`,
    WHOOSH: `${BASE}assets/sounds/whoosh__.mp3`,
    PROP: `${BASE}assets/sounds/prop.mp3`,
    DRAWER_OPEN: `${BASE}assets/sounds/home/drawer-open.mp3`,
    DRAWER_CLOSE: `${BASE}assets/sounds/home/drawer-closing.mp3`,
  },
  LOOPS: {
    MOSQUITO:  `${BASE}assets/sounds/mosquito.mp3`,
  }
};
