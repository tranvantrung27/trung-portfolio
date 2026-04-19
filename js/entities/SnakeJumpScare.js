import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * SnakeJumpScare
 * Handles loading, scaling, and the 4-phase cinematic animation
 * of the 3D snake model that appears when the player loses in Snake.
 *
 * Phases:
 *   1 (0-3s)   : Crawl in a circle with body wave
 *   2 (3-4s)   : Raise head
 *   3 (3.5-4.5s): Open jaw + tongue wiggle
 *   4 (4s+)    : Lunge at camera + scale growth + camera shake
 */
export class SnakeJumpScare {
  constructor(scene) {
    this.scene = scene;  // THREE.Scene root
    this.model = null;
    this.mixer = null;
    this.animations = [];
    this.baseScale = 0.001;

    this._active = false;
    this._t = 0;
    this._camCtrl = null;
    this._bones = { head: null, jaw: null, tongue: [] };

    // Tải âm thanh hù dọa
    this.scareAudio = new Audio('./assets/sounds/snake.mp3');
  }

  /**
   * Load the snake GLB and normalize its scale.
   * @param {string} url - Path to snake.glb
   * @param {Function} [onLoaded] - Optional callback when ready
   */
  load(url, onLoaded) {
    const loader = new GLTFLoader();
    loader.load(url, (gltf) => {
      this.model = gltf.scene;
      this.model.visible = false;

      // Tính toán vùng bao (để canh chỉnh size)
      const box = new THREE.Box3().setFromObject(this.model);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);

      // Kích thước mong muốn lúc hiện ra (tăng lến 2.0 để dễ nhìn thấy)
      const TARGET_SIZE = 0.1;
      const rawScale = maxDim > 0 ? TARGET_SIZE / maxDim : 0.001;
      this.baseScale = Math.max(0.00001, Math.min(rawScale, 100));

      console.log(`[SnakeJumpScare] baseScale=${this.baseScale.toExponential(3)}`);

      this.model.scale.setScalar(0);

      // Disable frustum culling to prevent invisible rendering
      this.model.traverse(c => {
        if (c.isMesh) c.frustumCulled = false;
      });

      this.mixer = new THREE.AnimationMixer(this.model);

      this.tongueBones = [];
      this.model.traverse((child) => {
         if (child.isBone && child.name.toLowerCase().includes('tongue')) {
            this.tongueBones.push(child);
         }
      });
      this.animations = gltf.animations;

      this.scene.add(this.model);
      if (onLoaded) onLoaded();
    },
      undefined,
      (err) => console.error('[SnakeJumpScare] Load error:', err));
  }

  trigger(camCtrl, screenMesh, arcadeGroup) {
    if (!this.model) { console.warn('[SnakeJumpScare] trigger() called but model not loaded yet'); return; }

    // Đã bấm J là Reset lại để xem!
    this.reset();

    this._active = true;
    this._t = 0;
    this._zoomed = false;
    this._camCtrl = camCtrl;

    // Đặt vị trí rắn tại chính giữa màn hình máy game
    if (screenMesh && camCtrl && camCtrl.camera) {
      const box = new THREE.Box3().setFromObject(screenMesh);
      const screenCenter = new THREE.Vector3();
      box.getCenter(screenCenter);

      this.model.position.copy(screenCenter);

      // Dịch rắn về phía camera 0.3 đơn vị để CHẮC CHẮN nó nổi trên mặt kính
      const camera = camCtrl.camera;
      const toCam = new THREE.Vector3().subVectors(camera.position, screenCenter).normalize();
      this.model.position.addScaledVector(toCam, 0.3);

      // Thông số do bạn vừa tìm được:
      if (typeof this._rotX === 'undefined') {
         this._rotX = 0;
         this._rotY = -129;
         this._rotZ = -13;
         this._offsetX = 0.3;
         this._offsetY = -0.08;
         this._offsetZ = 0.27;
         this._scaleMult = 2.1;
      }
      this._basePos = this.model.position.clone();
      
      if (!this._startPos) this._startPos = new THREE.Vector3();
      if (!this._targetPos) this._targetPos = new THREE.Vector3();

      this._startPos.copy(screenCenter).addScaledVector(toCam, -1.5); // Thụt sâu vào đuôi máy Arcade

      this._targetPos.set(
        this._basePos.x + this._offsetX,
        this._basePos.y + this._offsetY,
        this._basePos.z + this._offsetZ
      );

      this.model.rotation.set(
        THREE.MathUtils.degToRad(this._rotX),
        THREE.MathUtils.degToRad(this._rotY),
        THREE.MathUtils.degToRad(this._rotZ)
      );
      
      // Bắt đầu cắm đầu tít bên trong máy (sâu -1.5)
      this.model.position.copy(this._startPos);

      // Cắt nhỏ nhó rình mồi
      this.model.scale.setScalar(this.baseScale * 0.3);



    } else {
      this.model.position.set(0, 0, 0);
    }

    // Use GLTF Animation tua nhanh
    if (this.animations && this.animations.length > 0) {
      if (!this.action) {
        this.action = this.mixer.clipAction(this.animations[0]);
      }
      this.action.reset();
      this.action.setEffectiveTimeScale(1.5); // chạy cực nhanh
      this.action.play();
      
      // Chạy luôn lập tức (Bỏ qua 0.5s rình mồi) để nhảy sổ ra gây giật mình bằng cách đặt time sát 15.70
      this.action.time = 15.69; 
    }

    this.model.visible = true;

    // Kích hoạt âm thanh rùng rợn sếp yêu cầu
    if (this.scareAudio) {
      this.scareAudio.currentTime = 0; // Chơi từ đầu
      this.scareAudio.volume = 1.0; // Max Volume
      this.scareAudio.play().catch(e => console.warn("Browser blocked audio autoplay", e));
    }

    console.log('[SnakeJumpScare] Triggered at relative front of camera.');
  }

  /**
   * Reset — hides the snake and stops all animation.
   * Call when player restarts.
   */
  reset() {
    if (!this.model) return;
    this._active = false;
    this._t = 0;
    this._zoomed = false;

    if (this.action) {
      this.action.stop();
    }

    this.model.scale.setScalar(0);
    this.model.visible = false;

    // Tắt loa khi ấn Restart
    if (this.scareAudio) {
      this.scareAudio.pause();
    }
  }

  /**
   * Per-frame update
   * @param {number} dt
   */
  update(dt) {
    if (!this._active) return;

    if (this.mixer) {
      this.mixer.update(dt);
    }

    if (this.action) {
      const curTime = this.action.time;

      if (curTime >= 15.70 && !this._zoomed) {
        this.action.time = 15.70; // Khóa cứng frame chuẩn để đầu không bị lệch vì lố frame
        this._zoomed = true;
        // DỪNG HẲN HOẠT ẢNH Ở FRAME HÁ MỒM (15.70)
        this.action.paused = true;
        this._zoomT = 0;

        // Lưu lại góc nguyên dạng của lưỡi ở frame 15.70
        if (this.tongueBones) {
           this.tongueBones.forEach(bone => {
             bone.userData.baseRotX = bone.rotation.x;
             bone.userData.baseRotY = bone.rotation.y;
           });
        }
      }

      if (this._zoomed) {
        this._zoomT += dt;
        // Giới hạn thời gian phóng to: Nó sẽ phóng to trong 0.5s rồi dừng
        const maxZoomTime = 0.5;
        const effectiveZoomT = Math.min(this._zoomT, maxZoomTime);

        // ==========================================
        //  ĐÂY LÀ PHẦN ZOOM (LỚN NHỎ) BẠN CẦN CHỈNH
        // ==========================================
        // TẠM TẮT ZOOM (để 0.0) ĐỂ BẠN CHỈNH GÓC QUAY TRƯỚC ĐÃ!
        // Chỉnh xong đúng mặt rắn thì hãy thay bằng 6.0 hoặc 9.0 nhé!
        // (UI Editor đang bọc scale nên ghi đè ở đây bằng cách dùng this._scaleMult)
        const BASE_SCALE_BEFORE_JUMP = 0.3; // Kích thước lúc bắt đầu lao tới
        const progress = effectiveZoomT / maxZoomTime; // Tỷ lệ từ 0 -> 1
        const currentScaleFactor = BASE_SCALE_BEFORE_JUMP + progress * (this._scaleMult - BASE_SCALE_BEFORE_JUMP); 
        this.model.scale.setScalar(this.baseScale * currentScaleFactor);

        // Nội suy tọa độ từ TRONG BỤNG MÁY (startPos) phóng vọt ra vị trí VÀNG (targetPos)
        if (this._startPos && this._targetPos) {
           this.model.position.lerpVectors(this._startPos, this._targetPos, progress);
        }

        // Cử động lưỡi Rắn uốn lượn hình sóng (Wave-like motion)
        if (this.tongueBones && this.tongueBones.length > 0) {
           const time = performance.now() * 0.001; // Giây
           
           // Áp dụng độ trễ pha (phase shift) để tạo sóng từ gốc lây lan ra ngọn
           const waveSpeed = 12; // Tốc độ vẫy (rad/s)
           
           this.tongueBones.forEach((bone) => {
              if (bone.userData.baseRotX !== undefined) {
                 // Nhận diện theo tên: Đốt ngọn (Outer/Tip) bao giờ cũng mang hậu tố số lớn hơn (02)
                 const isTip = bone.name.includes('02');
                 
                 // Đốt gốc (01) đi trước, uốn góc 0.15 Rad
                 // Đốt ngọn (02) đi sau, trễ pha góc Pi/2, uốn góc 0.25 Rad
                 const phaseDelay = isTip ? -Math.PI / 2 : 0;
                 const amplitudeX = isTip ? 0.3 : 0.15;
                 
                 // Chuyển động lượn gập lên xuống mô phỏng sóng cơ bắp
                 bone.rotation.x = bone.userData.baseRotX + Math.sin(time * waveSpeed + phaseDelay) * amplitudeX;
              }
           });
        }

        // Lao về phía trước nhưng dừng lại NGAY TẠI mặt cắt màn hình
        if (this._camCtrl && this._camCtrl.camera && this._zoomT <= maxZoomTime) {
          // TẮT LAO TỚI (Tịnh tiến) ĐỂ BẠN DỄ NHÌN ZOOM, nếu muốn nó lao tới thì bỏ comment 3 dòng dưới:
          // const camera = this._camCtrl.camera;
          // const dir = new THREE.Vector3().subVectors(camera.position, this.model.position).normalize();
          // this.model.position.addScaledVector(dir, dt * 1.5); 
        }

        // Rung giật màn hình (Chỉ rung trong tích tắc lúc zoom)
        // BĂN YÊU CẦU ĐÃ TẮT RUNG MÁY
        if (this._zoomT <= maxZoomTime) {
          /*
          const shakeAmt = Math.min(0.15, this._zoomT * 0.1);
          if (this._camCtrl && this._camCtrl.camera) {
            const camera = this._camCtrl.camera;
            camera.position.x += (Math.random() - 0.5) * shakeAmt;
            camera.position.y += (Math.random() - 0.5) * shakeAmt;
          }
          */
        }
      }
    }

    // CHẾ ĐỘ DEBUG: Bỏ tắt tự động ẩn để bạn có thể nhìn bao lâu tùy thích!
    // if (this._zoomed && this._zoomT > 1.5) {
    //   this._active = false;
    // }
  }
}
