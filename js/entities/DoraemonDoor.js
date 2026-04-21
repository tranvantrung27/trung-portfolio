import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { gsap } from 'gsap';

export class DoraemonDoor {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.model = null;
    this.isLoading = false;
    this.isLoaded = false;
    this.isOpening = false;

    // Components
    this.pivot = null;
    this.doorLeafGroup = null;

    // SFX Assets
    this.ambientSound = new Audio('/assets/sounds/prop.mp3');
    this.ambientSound.loop = false;
    this.ambientSound.volume = 0.4;

    this.whooshSound = new Audio('/assets/sounds/magic whoosh.mp3');
    this.whooshSound.volume = 0.5;

    /**
     * DIRECTOR'S CONTROL PANEL (Chỉnh sửa thông số tại đây)
     * --------------------------------------------------
     */
    this.vfxConfig = {
      // 1. Hình dáng portal (Lúc mới hé cửa)
      softness: 0,
      rounded: 0,
      intensity: 1,

      // 2. Hình dáng portal (Lúc đạt cực đại/bay về camera)
      targetSoftness: 0.5,
      targetRounded: 0.5,
      targetIntensity: 3.0,

      // 3. Thời gian & Nhịp điệu (Sync với âm thanh tại đây)
      doorDuration: 1.5,      // Thời gian cửa mở ra
      explosionDelay: 1,      // Độ trễ trước khi ánh sáng bay (nên để < doorDuration)
      explosionDuration: 1.5, // Thời gian ánh sáng bay (Tăng để nghe tiếng whoosh dài hơn)
      redirectDelay: 2.2,     // Thời điểm chuyển trang (Tính từ lúc ánh sáng bắt đầu bay)

      // 4. Kích thước & Vị trí
      explosionScale: 150,
      explosionZ: 6,
      portalY: 1.9, // Lowered from 1.94 to match model drop
      portalZ: -0.2,
      angle: -2.04
    };

    // Export config to window for ViewManager sync
    window._DOOR_CONFIG = this.vfxConfig;

    this.portal = null;
    this.portalMaterial = null;
    this.initPortal();

    this.group.visible = false;
    this.group.position.set(0, -1.25, 0); // Normalized floor position
    this.group.scale.setScalar(0);
    this.scene.add(this.group);
  }

  initPortal() {
    if (this.portal) this.group.remove(this.portal);
    const geometry = new THREE.PlaneGeometry(2, 3.5);
    this.portalMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uSoftness: { value: this.vfxConfig.softness },
        uRounded: { value: this.vfxConfig.rounded },
        uIntensity: { value: this.vfxConfig.intensity },
        uColor: { value: new THREE.Color(0xffffff) }
      },
      vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
      fragmentShader: `
            uniform float uSoftness;
            uniform float uRounded;
            uniform float uIntensity;
            uniform vec3 uColor;
            varying vec2 vUv;
            float sdBox(vec2 p, vec2 b, float r) {
                vec2 q = abs(p) - b + r;
                return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
            }
            void main() {
                vec2 p = vUv - 0.5;
                vec2 b = vec2(0.5, 0.5); 
                float d = sdBox(p, b, uRounded);
                float alpha = 1.0 - smoothstep(-uSoftness - 0.001, 0.0, d);
                vec3 finalColor = uColor * uIntensity;
                gl_FragColor = vec4(finalColor, alpha);
            }
        `,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.portal = new THREE.Mesh(geometry, this.portalMaterial);
    this.portal.position.set(0, this.vfxConfig.portalY, this.vfxConfig.portalZ);
    this.portal.renderOrder = 999;
    this.group.add(this.portal);
  }

  load(url, callback) {
    if (this.isLoading || this.isLoaded) return;
    this.isLoading = true;
    const loader = new GLTFLoader();
    loader.load(url, (gltf) => {
      this.model = gltf.scene;
      this.model.rotation.set(0, 0, 0);
      this.model.rotation.z = Math.PI;

      const box = new THREE.Box3().setFromObject(this.model);
      const center = box.getCenter(new THREE.Vector3());
      // Lower the model by 0.2 units relative to the floor
      this.model.position.set(-center.x, -box.min.y - 0.2, -center.z);

      this.model.traverse((child) => {
        const name = child.name.toLowerCase();
        if (name === 'doorpivot' || name.includes('pivot')) this.pivot = child;
        if (name === 'cube001') this.doorLeafGroup = child;
      });

      if (this.pivot && this.doorLeafGroup) {
        this.pivot.attach(this.doorLeafGroup);
      }

      this.group.add(this.model);
      this.isLoaded = true;
      this.isLoading = false;
      if (callback) callback(this.group);
    });
  }

  setVisible(visible) {
    if (this.group.visible === visible) return;
    this.group.visible = visible;

    if (visible && !this.isOpening) {
      this.ambientSound.currentTime = 0;
      this.ambientSound.play().catch(() => { });
    } else {
      this.isOpening = false;
      this.ambientSound.pause();
      this.whooshSound.pause();
      this.whooshSound.currentTime = 0;
      if (this.pivot) this.pivot.rotation.set(0, 0, 0);
      if (this.portal) {
        this.portal.scale.set(1, 1, 1);
        this.portal.position.set(0, this.vfxConfig.portalY, this.vfxConfig.portalZ);
        this.portalMaterial.uniforms.uSoftness.value = this.vfxConfig.softness;
        this.portalMaterial.uniforms.uRounded.value = this.vfxConfig.rounded;
        this.portalMaterial.uniforms.uIntensity.value = this.vfxConfig.intensity;
        this.portalMaterial.depthTest = true;
      }
    }
  }

  setHover(isHovered) {
    if (!this.portalMaterial || this.isOpening) return;

    // Smooth transition for hover effect
    gsap.to(this.portalMaterial.uniforms.uIntensity, {
      value: isHovered ? this.vfxConfig.intensity + 0.5 : this.vfxConfig.intensity,
      duration: 0.3,
      ease: 'power2.out'
    });
  }

  openInward(onComplete) {
    if (this.isOpening || !this.pivot) return;
    this.isOpening = true;

    this.ambientSound.pause();
    this.ambientSound.currentTime = 0;

    const axisV = new THREE.Vector3(0, 1, 0);
    const targetAngle = this.vfxConfig.angle;

    const tl = gsap.timeline({
      onComplete: () => {
        if (onComplete) onComplete();
      }
    });

    // PHASE 1: Door Open
    const proxy = { t: 0 };
    tl.to(proxy, {
      t: 1,
      duration: this.vfxConfig.doorDuration,
      ease: 'power2.inOut',
      onUpdate: () => {
        const currentAngle = targetAngle * proxy.t;
        this.pivot.rotation.set(0, 0, 0);
        this.pivot.rotateOnAxis(axisV, currentAngle);
      }
    }, 0);

    // PHASE 2: Morphing Flight & Action SFX
    tl.add(() => {
      if (this.portal) this.portal.material.depthTest = false;
      this.whooshSound.currentTime = 0;
      this.whooshSound.play().catch(() => { });
    }, this.vfxConfig.explosionDelay);

    // Morphing
    tl.to(this.portalMaterial.uniforms.uSoftness, {
      value: this.vfxConfig.targetSoftness,
      duration: this.vfxConfig.explosionDuration,
      ease: 'power2.inOut'
    }, this.vfxConfig.explosionDelay);

    tl.to(this.portalMaterial.uniforms.uRounded, {
      value: this.vfxConfig.targetRounded,
      duration: this.vfxConfig.explosionDuration,
      ease: 'power2.inOut'
    }, this.vfxConfig.explosionDelay);

    tl.to(this.portalMaterial.uniforms.uIntensity, {
      value: this.vfxConfig.targetIntensity,
      duration: this.vfxConfig.explosionDuration,
      ease: 'power2.inOut'
    }, this.vfxConfig.explosionDelay);

    // Flight
    tl.to(this.portal.scale, {
      x: this.vfxConfig.explosionScale,
      y: this.vfxConfig.explosionScale,
      duration: this.vfxConfig.explosionDuration,
      ease: 'expo.in'
    }, this.vfxConfig.explosionDelay);

    tl.to(this.portal.position, {
      z: this.vfxConfig.explosionZ,
      duration: this.vfxConfig.explosionDuration,
      ease: 'expo.in'
    }, this.vfxConfig.explosionDelay);
  }

  update(dt, elapsedTime) {
    if (this.portalMaterial && this.group.visible && !this.isOpening) {
      const breathing = Math.sin(elapsedTime * 2) * 0.05;
      this.portalMaterial.uniforms.uIntensity.value = Math.min(3.0, this.vfxConfig.intensity + breathing);
    }
  }
}
