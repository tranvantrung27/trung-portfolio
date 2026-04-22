import * as THREE from 'three';
import { gsap } from 'gsap';

export class Interactions {
    constructor(camera, scene, world, player, outlinePass, aiRobot) {
        this.camera = camera;
        this.scene = scene;
        this.world = world;
        this.player = player;
        this.outlinePass = outlinePass;
        this.aiRobot = aiRobot;

        this.raycaster = new THREE.Raycaster();
        this.interactObject = null;
        this.isSitting = false;
        this.sittingChair = null;

        this.prompt = document.getElementById('interact-prompt');
        this.crosshair = document.getElementById('crosshair');
        this.initListeners();
    }

    initListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'KeyE') this.interact();
        });
    }

    interact() {
        const playerObj = this.player.controls.getObject();

        if (this.isSitting) {
            this.standUp(playerObj);
            return;
        }

        if (this.interactObject) {
            const name = this.interactObject.name.toLowerCase();
            if (name.includes('char1')) {
                this.sitDown(playerObj);
            } else if (this.interactObject.userData.isDrawer) {
                this.toggleDrawer(this.interactObject);
            } else if (this.interactObject.userData.isRobot) {
                this.aiRobot.say("Chào bro! Rất vui được gặp ông. (Giữ phím V để trò chuyện trực tiếp với Mon nhé!)", 6000);
            }
        }
    }

    toggleDrawer(drawer) {
        if (drawer.userData.isAnimating) return;

        drawer.userData.isAnimating = true;
        drawer.userData.isOpen = !drawer.userData.isOpen;

        console.log(`[Interaction] Tủ đang kéo là: ${drawer.name}`);

        // --- CHUẨN DEV AAA LÀ ĐÂY (Vừa an toàn trục Local, vừa mượt mà) ---
        // 1. Lưu lại điểm xuất phát hiện tại
        const startPos = drawer.position.clone();

        // 2. Dùng translateY để 'nháp' tương lai (Đổi qua trục Y theo yêu cầu của bạn)
        if (drawer.userData.isOpen) {
            drawer.translateY(-0.50); // Đảo dấu âm (-) để kéo ra ngoài 
        } else {
            drawer.translateY(0.50);  // Đẩy vào trong
        }

        // 3. Lấy cái tọa độ tương lai đó làm đích đến
        const targetPos = drawer.position.clone();

        // 4. Trả ngăn kéo về chỗ cũ lặp tức để chuẩn bị trễ
        drawer.position.copy(startPos);

        if (this.crosshair) this.crosshair.classList.remove('active');

        // 5. Thắp đèn GSAP cho nó trượt mượt mà đến tương lai kia (Thay vì giật cụp mất thẩm mỹ)
        gsap.to(drawer.position, {
            x: targetPos.x,
            y: targetPos.y,
            z: targetPos.z,
            duration: 0.4,
            ease: "power2.out",
            onComplete: () => {
                drawer.userData.isAnimating = false;
            }
        });
    }

    sitDown(playerObj) {
        this.isSitting = true;
        this.sittingChair = this.interactObject;
        this.player.collisionEnabled = false;
        this.player.velocity.set(0, 0, 0);
        if (this.crosshair) this.crosshair.style.display = 'none';

        if (this.world.seatPoint) {
            const v = new THREE.Vector3();
            this.world.seatPoint.getWorldPosition(v);
            playerObj.position.set(v.x, v.y + (0.6 * this.world.scaleFactor), v.z);

            if (this.world.pcTarget) {
                const t = new THREE.Vector3();
                this.world.pcTarget.getWorldPosition(t);
                t.y += (0.2 * this.world.scaleFactor);

                const m = new THREE.Matrix4().lookAt(playerObj.position, t, new THREE.Vector3(0, 1, 0));
                const e = new THREE.Euler(0, 0, 0, 'YXZ').setFromRotationMatrix(m);
                // Look at screen
                this.camera.rotation.set(e.x - 0.15, e.y, 0, 'YXZ');
            } else {
                const q = new THREE.Quaternion();
                this.world.seatPoint.getWorldQuaternion(q);
                const e = new THREE.Euler(0, 0, 0, 'YXZ').setFromQuaternion(q);
                this.camera.rotation.set(e.x, e.y, 0, 'YXZ');
            }
        }
    }

    standUp(playerObj) {
        this.isSitting = false;
        this.player.collisionEnabled = true;
        if (this.crosshair) this.crosshair.style.display = 'block';

        if (this.world.standPoint) {
            const v = new THREE.Vector3();
            this.world.standPoint.getWorldPosition(v);
            playerObj.position.copy(v);

            if (this.world.pcTarget) {
                const t = new THREE.Vector3();
                this.world.pcTarget.getWorldPosition(t);
                t.y += (0.5 * this.world.scaleFactor);
                const m = new THREE.Matrix4().lookAt(playerObj.position, t, new THREE.Vector3(0, 1, 0));
                const e = new THREE.Euler(0, 0, 0, 'YXZ').setFromRotationMatrix(m);
                // Look straight horizontally when standing
                this.camera.rotation.set(0, e.y, 0, 'YXZ');
            }
        } else {
            playerObj.position.y += 0.5 * this.world.scaleFactor;
        }
        this.sittingChair = null;
    }

    update(sf) {
        if (!this.player.controls.isLocked) return;

        const pos = this.player.controls.getObject().position;
        let selectedForOutline = [];
        this.interactObject = null;

        if (!this.isSitting) {
            // TẮT TÍNH NĂNG "SÁNG TẤT CẢ KHI LẠI GẦN"
            // Cái outline tự động khi lại gần chính là nguyên nhân làm OutlinePass bị lỗi render dẫn tới biến mất đồ vật!
            // Chúng ta chỉ highlight khi MẮT THỰC SỰ NHÌN VÀO (Raycaster).

            // Xóa logic `forEach` ở đây.


            // Target interactable
            this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
            this.raycaster.far = 2.5 * sf;
            const intersects = this.raycaster.intersectObjects(this.world.interactableObjects, true);

            if (intersects.length > 0) {
                let hitObj = intersects[0].object;

                // CÁCH 2 (DEBUG NGAY) theo phân tích của bạn:
                // console.log("Raycaster Hit Tường/Mặt ngoài ban đầu là:", hitObj.name);

                // CÁCH 1 (CHUẨN NHẤT): Leo lên parent đúng cách
                while (hitObj && 
                       !hitObj.name.toLowerCase().includes('drawer') && 
                       !hitObj.name.toLowerCase().includes('char1') &&
                       !hitObj.userData.isRobot) {
                    hitObj = hitObj.parent;
                }

                if (hitObj) {
                    this.interactObject = hitObj;
                    selectedForOutline = [hitObj];
                    this.outlinePass.visibleEdgeColor.set(0x00ff88); 

                    if (this.prompt) {
                        this.prompt.style.display = 'flex';
                        const n = hitObj.name.toLowerCase();
                        if (n.includes('char1')) {
                            this.prompt.innerHTML = `Nhấn <span class="prompt-key">E</span> để ngồi`;
                        } else if (hitObj.userData.isDrawer) {
                            this.prompt.innerHTML = `<span class="prompt-key">E</span> để ${hitObj.userData.isOpen ? 'đóng' : 'mở'} tủ`;
                        } else if (hitObj.userData.isRobot) {
                            this.prompt.innerHTML = `Nhấn <span class="prompt-key">E</span> để trò chuyện`;
                        } else {
                            this.prompt.innerHTML = `Nhấn <span class="prompt-key">E</span> để tương tác`;
                        }
                    }
                    if (this.crosshair) this.crosshair.classList.add('active');
                }
            } else {
                if (this.prompt) this.prompt.style.display = 'none';
                if (this.crosshair) this.crosshair.classList.remove('active');
            }
        } else {
            if (this.prompt) {
                this.prompt.style.display = 'flex';
                this.prompt.innerHTML = `Nhấn <span class="prompt-key">E</span> hoặc di chuyển để đứng dậy`;
            }
            // Auto stand up on movement
            if (this.player.moveForward || this.player.moveBackward || this.player.moveLeft || this.player.moveRight) {
                this.interact();
            }
        }

        this.outlinePass.selectedObjects = selectedForOutline;
    }
}
