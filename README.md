<div align="center">
  
# 🤖 trung-portfolio — Interactive 3D Experience

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://tranvantrung27.github.io/trung-portfolio/)
[![Three.js](https://img.shields.io/badge/Three.js-r160-black?logo=three.js)](https://threejs.org/)
[![GSAP](https://img.shields.io/badge/GSAP-3.12.5-green?logo=green-sock)](https://greensock.com/gsap/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **"Where artificial intelligence meets immersive 3D art."**

</div>

---

## 🏗 Trạng thái dự án (Project Status)
> [!IMPORTANT]
> This project is currently under active development. Contributions, ideas, and feedback from the community are highly appreciated.
> 
> Bạn có thể xem trước dự án tại: https://tranvantrung27.github.io/trung-portfolio/

---

## 📽 Giới thiệu (Introduction)
Welcome to my personal portfolio — a cinematic, high-performance 3D interactive experience. 

It features a central 3D AI companion that responds dynamically to your navigation, creating a unique narrative as you explore my technical journey.

---

## 🎯 Mục tiêu (Goals)

- Build a **cinematic and immersive 3D web experience** from the ground up.
- Skills:
  - **AI & Machine Learning** (Deep Learning, Neural Networks)
  - **Computer Vision** (Object Detection, Image Processing)
  - **Flutter Development** (Cross-platform Smart Systems)
  - **AI Prompt Engineering** (ChatGPT, Claude, Gemini, etc.)
- Deliver a **modern product-like UI/UX** that feels premium and responsive.

---

## ✨ Tính năng (Features)

- **🤖 Interactive 3D Robot:** High-quality GLB model utilizing `AnimationMixer` for state-based reactions.
- **🎮 Scroll-Driven Interaction:** Seamlessly sync 3D animations with page navigation using GSAP.
- **🎥 Cinematic Camera:** Smoothly interpolated (`lerp`) camera movements for a floaty, high-end feel.
- **💡 Studio-Grade Lighting:** Dynamic Key, Rim, and Ambient lighting setup to emphasize textures.
- **🌫 Soft Shadows & Depth:** Integrated ground plane with soft shadows for environmental realism.
- **⚡ Smooth Performance:** Optimized rendering loop targeting a consistent **60 FPS**.
- **📱 Responsive UI:** A sleek, glassmorphic interface that adapts perfectly to any screen size.

---

## 🛠 Công nghệ (Tech Stack)

- **Graphics Engine:** [Three.js](https://threejs.org/) (via CDN)
- **Animation Framework:** [GSAP](https://greensock.com/gsap/) (ScrollTrigger)
- **Core Logic:** Vanilla JavaScript (ESM Modular Architecture)
- **Structure & Style:** HTML5, CSS3 (Modern Flex/Grid & Variables)

---

## 📁 Cấu trúc dự án (Project Structure)

```text
trung-portfolio/
├── assets/
│   └── robot_animated.glb     # Main 3D Asset
├── js/
│   ├── animation/
│   │   └── scroll.js          # GSAP & Interaction Logic
│   ├── core/
│   │   ├── camera.js          # Camera Setup & Controls
│   │   ├── engine.js          # Main Rendering Loop
│   │   ├── renderer.js        # WebGL Interface
│   │   └── scene.js           # Environment & Lighting
│   ├── objects/
│   │   └── robot.js           # Model Loader & Animation Logic
│   ├── ui/
│   │   └── navbar.js          # Interactive Navigation
│   └── utils.js               # Common Utilities
├── index.html                 # Entry Point & Import Maps
├── main.js                    # Bootstrap & Composition
└── style.css                  # UI Design System
```

---

## 🚀 Bắt đầu (Getting Started)

To run this project locally on your machine, follow these steps:

### 1. Điều kiện tiên quyết (Prerequisites)
Ensure you have [Node.js](https://nodejs.org/) installed on your system.

### 2. Sao chép kho lưu trữ (Clone the Repository)
```bash
git clone https://github.com/tranvantrung27/trung-portfolio.git
```

### 3. Cài đặt thư viện (Install Dependencies)
```bash
npm install
```

### 4. Chạy cục bộ (Run Locally)
Bạn có thể xem dự án bằng một trong các lựa chọn sau:

- **Lựa chọn A (Khuyên dùng - Sử dụng Vite):**
  ```bash
  npm run dev
  ```
  Trình duyệt sẽ tự động mở tại [http://localhost:5173](http://localhost:5173). Phương án này hỗ trợ **Hot Module Replacement (HMR)** giúp cập nhật thay đổi tức thì.

- **Lựa chọn B (Live Server trên VS Code):**
  Cài đặt extension **Live Server**, chuột phải vào file `index.html` và chọn **Open with Live Server**.

---

## 🌍 Triển khai (Deployment)

This portfolio is strictly static and requires **no build step**. It is deployed via **GitHub Pages**. Any changes pushed to the `main` branch are automatically updated at:
[https://tranvantrung27.github.io/trung-portfolio/](https://tranvantrung27.github.io/trung-portfolio/)

---

## 💖 Ghi nhận (Credits)

- **3D Model:** [Toy Robot Animated - Lowpoly](https://sketchfab.com/3d-models/toy-robot-animated-lowpoly-bc4df6071a1c4323b63198fbaa6c559d)
- **Author:** [rkmorello](https://sketchfab.com/rkmorello)
- **License:** [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

---

## ⭐ Hỗ trợ & Đóng góp (Support & Contributions)

- 🤝 **Contributions:** Ideas, bug reports, and pull requests are welcome!
- ⭐ **Support:** If you like this project, please give a **Star** to the repository!

Designed with ❤️ by **Trung**.
