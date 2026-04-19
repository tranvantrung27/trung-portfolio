# 🛡️ Developer Rules: Trung Portfolio (Persistent Knowledge)

This file contains the immutable rules and preferences for this project. All future development (by AI or human) MUST adhere to these standards.

## 🎨 Aesthetic Integrity (NEON SOUL)
- **Primary Theme**: Cyberpunk / Robot Future.
- **Color Palette**: MUST use vibrant Neons (Purple #8b5cf6, Blue #3b82f6).
- **Vibe**: Glowing, interactive, and "Alive".
- **RULE**: Do NOT attempt to convert to minimalist/slate styles unless explicitly requested with a double-confirmation.

## 🏛️ Technical Architecture (PRO STANDARD)
- **Engine**: Three.js with ES6 Modules.
- **Master Orchestrator**: `App.js` manages the lifecycle (`init`, `load`, `update`).
- **Entry Point**: `main.js` must remain minimalist.
- **Entities**: 3D objects (Robot, Arcade, etc.) must be isolated Classes in `js/entities/`.
- **Managers**: Logic flows (Scroll, Game, UI) must reside in `js/managers/`.

## 📐 Arcade Calibration Constants
- **Center Nudge**: 135px (to clear the top bezel).
- **Vertical Scale**: 1.05 (for tight-fit fill).
- These values are precisely measured for the 3D model. Do not change them.

## 🚀 Deployment Rules
- **Method**: Static build via Vite (`npm run build`).
- **Base Path**: Strictly use `./` (Relative) to support GitHub Pages and custom CDNs out-of-the-box.
- **Src Structure**: Keep folders logical and concise (phân chia hợp lí ngắn gọn).

---
*Created per User Request to ensure long-term maintainability.*
