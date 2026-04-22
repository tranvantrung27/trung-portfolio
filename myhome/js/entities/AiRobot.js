import * as THREE from 'three';
import { Dialogue } from '../audio/Dialogue.js';

export class AiRobot {
    constructor(scene, world, camera) {
        this.scene = scene;
        this.world = world;
        this.camera = camera;

        this.robotMixer = null;
        this.exclamationSprite = null;
        this.exclamationTime = 0;
        this.robotMesh = null;
        this.dialogue = new Dialogue();
    }

    load() {
        try {
            this.world.loader.load(import.meta.env.BASE_URL + 'assets/models/home/ai_robot.glb', (gltf) => {
                const robot = gltf.scene;
                this.robotMesh = robot;

                // 1. Tìm vị trí spawn từ Empty node (được cấu hình trong Blender)
                let spawnNode = null;
                if (this.world && this.world.model) {
                    this.world.model.traverse(c => {
                        if (c.name.toLowerCase().includes('spawn_robot')) {
                            spawnNode = c;
                        }
                    });
                }

                if (spawnNode) {
                    const pos = new THREE.Vector3();
                    spawnNode.getWorldPosition(pos);
                    robot.position.copy(pos);
                    robot.lookAt(this.camera.position.x, robot.position.y, this.camera.position.z);
                    console.log(`[AiRobot] Spawned at: ${spawnNode.name}`);
                }

                // 2. CHỈNH SỬA VẬT LIỆU & FIX LỖI MẤT MẮT (QUAN TRỌNG)
                robot.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;

                        // FIX: Nếu là phần mắt hoặc bộ phận phát sáng xanh
                        const lowerName = child.name.toLowerCase();
                        if (lowerName.includes('blue_light') || lowerName.includes('eye')) {
                            child.visible = true;

                            // Ép Scale về 1 nếu bị Blender bóp nghẹt
                            if (child.scale.x < 0.0001) child.scale.set(1, 1, 1);

                            // Ép vị trí về 0 nếu bị Blender văng ra xa (Lỗi 196km)
                            if (child.position.length() > 1000) {
                                child.position.set(0, 0, 0);
                            }

                            if (child.material) {
                                child.material.emissiveIntensity = 0.8;
                                child.material.opacity = 1;
                                child.material.transparent = false;
                                if (child.material.emissive) {
                                    child.material.emissive.setHex(0x00aaff);
                                }
                            }
                        } else if (child.material) {
                            if (child.material.emissiveIntensity !== undefined) {
                                child.material.emissiveIntensity = 0.1;
                            }
                            child.material.envMapIntensity = 0.5;
                        }
                    }

                    // --- 🌟 DẤU ! MÀU XANH LÁ ---
                    if (child.name.toLowerCase() === 'hi') {
                        const canvas = document.createElement('canvas');
                        canvas.width = 128;
                        canvas.height = 128;
                        const ctx = canvas.getContext('2d');

                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';

                        // --- Vẽ Thủ Công Dấu ! để tùy chỉnh độ mập/ngắn ---
                        const color = '#00ff88'; // XANH LÁ
                        ctx.fillStyle = color;
                        ctx.strokeStyle = '#FFFFFF';
                        ctx.lineWidth = 6;

                        // 1. Vẽ Thân (Stick) - Ngắn hơn và To hơn
                        // (x, y, width, height)
                        const stickW = 30;
                        const stickH = 80;
                        const stickX = 64 - stickW / 2;
                        const stickY = -10;

                        // Vẽ hình chữ nhật bo góc nhẹ cho thân
                        ctx.beginPath();
                        ctx.roundRect(stickX, stickY, stickW, stickH, 8);
                        ctx.fill();
                        ctx.stroke();

                        // 2. Vẽ Chấm (Dot) - To rõ
                        const dotRadius = 16;
                        ctx.beginPath();
                        ctx.arc(64, 95, dotRadius, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.stroke();

                        const texture = new THREE.CanvasTexture(canvas);
                        const material = new THREE.SpriteMaterial({
                            map: texture,
                            transparent: true
                        });

                        const sprite = new THREE.Sprite(material);

                        // --- 🌀 FIX LỖI MÉO & NHỎ ---
                        // 1. Ta lấy một kích thước nền (ví dụ 0.8 cho to rõ)
                        const baseScale = 0.8;

                        // 2. Tính toán tỷ lệ bù trừ: Nếu cha cao hơn ngang, ta phải bóp chiều cao của con lại
                        // Công thức: spriteScaleY = baseScale * (parentScaleX / parentScaleY)
                        const parentScaleX = child.scale.x || 1;
                        const parentScaleY = child.scale.y || 1;
                        const aspectComp = parentScaleX / parentScaleY;

                        sprite.scale.set(baseScale, baseScale * aspectComp, 1);
                        sprite.position.y = 0.10;

                        child.add(sprite);
                        this.exclamationSprite = sprite;
                        this.exclamationTime = 0;
                    }

                    if (child.name.toLowerCase().includes('eye')) {
                        child.visible = true;
                        if (child.scale.x < 0.0001) child.scale.set(1, 1, 1);
                        if (child.scale.y < 0.0001) child.scale.set(1, 1, 1);
                        if (child.scale.z < 0.0001) child.scale.set(1, 1, 1);
                    }

                    // --- ĐĂNG KÝ TƯƠNG TÁC ---
                    if (child.isMesh) {
                        this.world.interactableObjects.push(child);
                        child.userData.isRobot = true;
                    }
                });

                // Tag cả root để chắc chắn Raycaster bắt được
                robot.userData.isRobot = true;

                this.scene.add(robot);

                // 3. Khởi chạy Animation
                if (gltf.animations && gltf.animations.length > 0) {
                    this.robotMixer = new THREE.AnimationMixer(robot);
                    const action = this.robotMixer.clipAction(gltf.animations[0]);
                    action.play();
                }
            });
        } catch (e) {
            console.error('[AiRobot] Lỗi khi load robot:', e);
        }
    }

    say(message, duration = 4000, shouldSpeak = true) {
        if (this.dialogue) {
            this.dialogue.say(message, duration, shouldSpeak);
        }
    }

    update(delta) {
        if (this.robotMixer) {
            this.robotMixer.update(delta);
        }

        if (this.exclamationSprite) {
            this.exclamationTime += delta;
            // this.exclamationSprite.position.y = 0.2 + Math.sin(this.exclamationTime * 2) * 0.06;
        }
    }
}
