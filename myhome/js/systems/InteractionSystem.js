import * as THREE from 'three';
import { gsap } from 'gsap';
import { Events } from '../core/EventManager.js';
import { CONFIG } from '../config/Config.js';
import { SOUNDS } from '../../../js/managers/SoundManager.js';

export class InteractionSystem {
    constructor(engine, world, player, entityManager) {
        this.engine = engine;
        this.world = world;
        this.player = player;
        this.entityManager = entityManager;

        this.raycaster = new THREE.Raycaster();
        this.interactObject = null;
        this.isSitting = false;
        this.sitPromptTime = 0; 
        
        this.inspectingItem = null; // Vật phẩm đang được xem
        this.inspectOriginalState = null; // Lưu trạng thái cũ để trả lại

        // Audio
        this.audioDrawerOpen = new Audio(SOUNDS.SFX.DRAWER_OPEN);
        this.audioDrawerClose = new Audio(SOUNDS.SFX.DRAWER_CLOSE);
        this.audioDrawerOpen.volume = 1.0;
        this.audioDrawerClose.volume = 1.0;
        this.audioDrawerOpen.playbackRate = 2;
        this.audioDrawerClose.playbackRate = 2;

        this.initListeners();
    }

    initListeners() {
        this.voiceActive = false;
        document.addEventListener('keydown', (e) => {
            if (e.code === 'KeyE') this.interactE();
            if (e.code === 'KeyF') this.interactF();
            if (e.code === 'KeyV' && !e.repeat) {
                this.voiceActive = !this.voiceActive;
                if (this.voiceActive) Events.emit('VOICE_START');
                else Events.emit('VOICE_STOP');
            }
        });

        Events.on('VOICE_AUTO_STOP', () => {
            this.voiceActive = false;
        });

        document.addEventListener('keyup', (e) => {
            // Đã chuyển sang chế độ bấm thả thông minh, không cần STOP ở keyup nữa
        });

        // Debug: Click chuột để xem tên vật thể
        window.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Chuột trái
                this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.engine.camera);
                const intersects = this.raycaster.intersectObjects(this.world.model.children, true);
                if (intersects.length > 0) {
                    const obj = intersects[0].object;
                    console.log(`[Debug Click] Object: "${obj.name}" | Parent: "${obj.parent ? obj.parent.name : 'None'}"`);
                }
            }
        });
    }

    interactE() {
        const playerObj = this.player.controls.getObject();

        // Nếu đang xem đồ, bấm E để trả lại
        if (this.inspectingItem) {
            this.putBackItem();
            return;
        }

        if (this.isSitting) {
            this.standUp(playerObj);
            return;
        }

        if (this.interactObject) {
            const ud = this.interactObject.userData;

            if (this.interactObject.name.toLowerCase().includes('char1')) {
                this.sitDown(playerObj);
            } else if (ud.isDrawer) {
                this.toggleDrawer(this.interactObject);
            } else if (ud.isRobot) {
                Events.emit('ROBOT_INTERACTED');
            } else if (ud.isDoor) {
                this.leaveHouse();
            }
        }
    }

    interactF() {
        // Nếu đang xem đồ, bấm F lần nữa để lấy (cất đi)
        if (this.inspectingItem) {
            this.finalizeCollection();
            return;
        }

        if (this.interactObject && this.interactObject.userData.isItem) {
            this.inspectItem(this.interactObject);
        }
    }

    inspectItem(item) {
        if (this.inspectingItem) return;
        this.inspectingItem = item;

        // Lưu trạng thái gốc
        this.inspectOriginalState = {
            parent: item.parent,
            position: item.position.clone(),
            rotation: item.rotation.clone(),
            scale: item.scale.clone()
        };

        // Tính toán tâm của vật thể để căn chỉnh chính xác
        const box = new THREE.Box3().setFromObject(item);
        const center = new THREE.Vector3();
        box.getCenter(center);
        const size = new THREE.Vector3();
        box.getSize(size);
        
        // Chuyển item sang Scene để quản lý độc lập
        this.engine.scene.add(item);
        
        // Tự động điều chỉnh scale để vừa tầm mắt (khoảng 0.15 units)
        const maxDim = Math.max(size.x, size.y, size.z);
        const scaleFactor = 0.2 / maxDim; 
        const targetScale = item.scale.clone().multiplyScalar(scaleFactor);

        // Hiệu ứng bay ra
        gsap.from(item.scale, {
            x: 0, y: 0, z: 0,
            duration: 0.5,
            ease: "back.out(1.7)"
        });
        
        gsap.to(item.scale, {
            x: targetScale.x, y: targetScale.y, z: targetScale.z,
            duration: 0.5
        });

        console.log(`[Interaction] Inspecting item: ${item.name} in Scene mode`);
    }

    putBackItem() {
        if (!this.inspectingItem) return;
        const item = this.inspectingItem;
        const state = this.inspectOriginalState;

        // Trả về parent cũ
        state.parent.add(item);
        
        gsap.to(item.position, {
            x: state.position.x, y: state.position.y, z: state.position.z,
            duration: 0.5, ease: "power2.inOut"
        });
        gsap.to(item.rotation, {
            x: state.rotation.x, y: state.rotation.y, z: state.rotation.z,
            duration: 0.5
        });
        gsap.to(item.scale, {
            x: state.scale.x, y: state.scale.y, z: state.scale.z,
            duration: 0.5,
            onComplete: () => {
                this.inspectingItem = null;
            }
        });
    }

    finalizeCollection() {
        if (!this.inspectingItem) return;
        const item = this.inspectingItem;

        gsap.to(item.scale, {
            x: 0, y: 0, z: 0,
            duration: 0.3,
            onComplete: () => {
                item.visible = false;
                this.inspectingItem = null;
                // Có thể xóa hoàn toàn khỏi scene nếu muốn
                item.parent.remove(item);
            }
        });
    }

    leaveHouse() {
        Events.emit('HOUSE_LEAVE');
        window.location.href = '../';
    }

    toggleDrawer(drawer) {
        if (drawer.userData.isAnimating) return;
        drawer.userData.isAnimating = true;
        drawer.userData.isOpen = !drawer.userData.isOpen;

        const sound = drawer.userData.isOpen ? this.audioDrawerOpen : this.audioDrawerClose;
        sound.currentTime = 0;
        sound.play().catch(e => { });

        const startPos = drawer.position.clone();
        if (drawer.userData.isOpen) drawer.translateY(-0.50);
        else drawer.translateY(0.50);

        const targetPos = drawer.position.clone();
        drawer.position.copy(startPos);

        gsap.to(drawer.position, {
            x: targetPos.x, y: targetPos.y, z: targetPos.z,
            duration: 0.7, ease: "power2.inOut",
            onComplete: () => drawer.userData.isAnimating = false
        });
    }

    sitDown(playerObj) {
        this.isSitting = true;
        this.sitPromptTime = 0; // Reset timer khi mới ngồi xuống
        this.player.collisionEnabled = false;
        this.player.velocity.set(0, 0, 0);
        Events.emit('SIT_DOWN');

        if (this.world.seatPoint) {
            const v = new THREE.Vector3();
            this.world.seatPoint.getWorldPosition(v);

            // Đặt vị trí ngay lập tức
            playerObj.position.set(v.x, v.y + (0.6 * this.world.scaleFactor), v.z);

            if (this.world.pcTarget) {
                const t = new THREE.Vector3();
                this.world.pcTarget.getWorldPosition(t);
                t.y += (0.2 * this.world.scaleFactor);

                const m = new THREE.Matrix4().lookAt(playerObj.position, t, new THREE.Vector3(0, 1, 0));
                const e = new THREE.Euler(0, 0, 0, 'YXZ').setFromRotationMatrix(m);

                // Xoay ngay lập tức
                this.engine.camera.rotation.set(e.x - 0.15, e.y + 1.0, 0, 'YXZ');
            }
        }
    }

    standUp(playerObj) {
        this.isSitting = false;
        this.player.collisionEnabled = true;
        Events.emit('STAND_UP');

        if (this.world.standPoint) {
            const v = new THREE.Vector3();
            this.world.standPoint.getWorldPosition(v);
            playerObj.position.copy(v);
        } else {
            playerObj.position.y += 0.5 * this.world.scaleFactor;
        }
    }

    update(delta, sf) {
        // Xoay vật phẩm đang inspect để trông sinh động
        if (this.inspectingItem) {
            const camera = this.engine.camera;
            const item = this.inspectingItem;

            // Tính toán vị trí trước mặt camera 0.8m trong Scene
            const viewPoint = new THREE.Vector3(0, 0, -0.8);
            viewPoint.applyQuaternion(camera.quaternion);
            viewPoint.add(camera.position);

            item.position.copy(viewPoint);
            
            // Tự xoay
            item.rotation.y += delta * 1.5;
            item.rotation.x += delta * 0.5;
            
            Events.emit('UPDATE_PROMPT', `Nhấn <span class="prompt-key">F</span> để lấy, <span class="prompt-key">E</span> để cất lại`);
            return;
        }

        if (!this.player.controls.isLocked) return;

        let selectedForOutline = [];
        this.interactObject = null;
        let promptHtml = null;

        if (!this.isSitting) {
            this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.engine.camera);
            this.raycaster.far = CONFIG.PLAYER.interactionDist * sf;
            const intersects = this.raycaster.intersectObjects(this.world.interactableObjects, true);

            if (intersects.length > 0) {
                // Tìm vật thể tương tác hợp lệ đầu tiên trong danh sách va chạm
                for (let i = 0; i < intersects.length; i++) {
                    let hitObj = intersects[i].object;

                    // Leo ngược lên để tìm Group cha được đánh dấu (Tủ, Cửa, Vật phẩm, Robot...)
                    while (hitObj && hitObj.parent &&
                        !hitObj.userData.isItem &&
                        !hitObj.userData.isDoor &&
                        !hitObj.userData.isDrawer &&
                        !hitObj.userData.isRobot &&
                        !hitObj.name.toLowerCase().includes('char1')) {
                        hitObj = hitObj.parent;
                    }

                    if (hitObj && (hitObj.userData.isItem || hitObj.userData.isDoor || hitObj.userData.isDrawer || hitObj.userData.isRobot || hitObj.name.toLowerCase().includes('char1'))) {
                        this.interactObject = hitObj;
                        selectedForOutline = [hitObj];
                        promptHtml = this.getPromptHtml(hitObj);
                        break; // Đã tìm thấy, thoát vòng lặp
                    }
                }
            }
        } else {
            // Khi đang ngồi, chỉ hiện hướng dẫn trong 1.5 giây đầu
            this.sitPromptTime += delta;
            if (this.sitPromptTime < 1.5) {
                promptHtml = `Nhấn <span class="prompt-key">E</span> hoặc di chuyển để đứng dậy`;
            }

            if (this.player.moveForward || this.player.moveBackward || this.player.moveLeft || this.player.moveRight) {
                this.interactE();
            }
        }

        this.engine.outlinePass.selectedObjects = selectedForOutline;
        Events.emit('UPDATE_PROMPT', promptHtml);
    }

    getPromptHtml(obj) {
        const n = obj.name.toLowerCase();
        const ud = obj.userData;

        if (n.includes('char1')) return `Nhấn <span class="prompt-key">E</span> để ngồi`;
        if (ud.isDrawer) return `<span class="prompt-key">E</span> để ${ud.isOpen ? 'đóng' : 'mở'} tủ`;
        if (ud.isRobot) return `Nhấn <span class="prompt-key">E</span> để trò chuyện`;
        if (ud.isDoor) return `Nhấn <span class="prompt-key">E</span> để rời nhà`;
        
        if (ud.isItem) return `Nhấn <span class="prompt-key">F</span> để lấy vật phẩm`;

        return `Nhấn <span class="prompt-key">E</span> để tương tác`;
    }
}
