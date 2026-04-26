import * as THREE from 'three';
import { CONFIG } from '../config/Config.js';
import { Events } from './EventManager.js';
import { Engine } from './Engine.js';
import { ResourceManager } from './ResourceManager.js';
import { EntityManager } from './EntityManager.js';

import { World } from './World.js';
import { Player } from './Player.js';
import { AiRobot } from '../entities/AiRobot.js';
import { Computer } from '../systems/Computer.js';
import { InteractionSystem } from '../systems/InteractionSystem.js';
import { UIManager } from '../systems/UIManager.js';
import { Brain } from '../ai/Brain.js';
import { VoiceListener } from '../ai/VoiceListener.js';

export class App {
    constructor() {
        this.engine = new Engine();
        this.resources = new ResourceManager();
        this.ui = new UIManager();
        this.clock = new THREE.Clock();
        this.isRunning = false;

        this.init();
    }

    async init() {
        try {
            // 1. Load Resources
            const modelUrl = import.meta.env.BASE_URL + CONFIG.PATHS.MODELS;
            const robotUrl = import.meta.env.BASE_URL + 'assets/models/home/ai_robot.glb';

            await Promise.all([
                this.resources.loadModel('world', modelUrl),
                this.resources.loadModel('robot', robotUrl)
            ]);

            // 2. Setup Core World
            this.world = new World(this.engine.scene);
            const worldData = await this.world.init(this.resources.get('world'));

            // 3. Setup Entities & Systems
            this.entities = new EntityManager(this.engine.scene, this.world);

            this.player = this.entities.add(new Player(this.engine.camera, this.engine.renderer.domElement, this.world));
            await this.player.init(this.resources);

            this.aiRobot = this.entities.add(new AiRobot(this.engine.scene, this.world, this.engine.camera));
            await this.aiRobot.init(this.resources);

            // 4. Set Initial Position FIRST (so robot can look at player)
            this.player.controls.getObject().position.copy(worldData.spawnInfo.position);
            this.engine.camera.lookAt(worldData.spawnInfo.lookAt);
            this.aiRobot.setupSpawnPosition(); // Recalculate rotation to look at player

            // 5. Initialize Computer Screen
            const computerTarget = this.world.computerScreenTarget || this.world.screenAnchor || this.world.pcTarget;
            if (computerTarget) {
                this.computer = this.entities.add(new Computer(this.engine.scene, computerTarget, this.world));
                await this.computer.init();
            }

            this.interactions = new InteractionSystem(this.engine, this.world, this.player, this.entities);

            // 6. Setup AI Brain & Voice
            this.brain = new Brain();
            let gotSpeechResult = false;
            this.isVoiceActive = false;
            this.lastVoiceTime = Date.now();
            this.idleThreshold = 10000; // 20 giây im lặng sẽ tự tắt

            this.voiceListener = new VoiceListener(
                () => { // onStart
                    gotSpeechResult = false;
                    const bubble = document.getElementById('voice-status-bubble');
                    if (bubble) {
                        bubble.innerText = "MON DANG NGHE...";
                        bubble.style.display = 'block';
                    }
                },
                async (text) => { // onResult
                    // CHỐNG ECHO: Nếu Mon đang nói thì bỏ qua mọi kết quả nhận diện
                    if (this.aiRobot.dialogue.isPlaying || this.aiRobot.dialogue.audioQueue.length > 0) {
                        console.log("[Voice] Đã chặn Echo từ Robot.");
                        return;
                    }

                    gotSpeechResult = true;
                    this.lastVoiceTime = Date.now(); // Reset thời gian im lặng khi có kết quả
                    const bubble = document.getElementById('voice-status-bubble');
                    if (bubble) {
                        bubble.innerText = "DANG SUY NGHI...";
                    }

                    // Tắt Mic tạm thời trong khi Mon đang chuẩn bị trả lời
                    if (this.voiceListener) this.voiceListener.stop();

                    // Reset trước khi bắt đầu stream mới
                    this.aiRobot.dialogue.stopAudio();

                    // --- PIPELINE STREAMING REALTIME ---
                    let sentenceBuffer = "";
                    const stream = this.brain.askStream(text);

                    for await (const chunk of stream) {
                        sentenceBuffer += chunk;

                        // Nếu gặp dấu ngắt câu -> Gửi đi nói luôn
                        if (/[.!?]/.test(sentenceBuffer)) {
                            // Tách câu và gửi đi
                            const sentences = sentenceBuffer.split(/([.!?])/);
                            for (let i = 0; i < sentences.length - 1; i += 2) {
                                const fullSentence = sentences[i] + sentences[i + 1];
                                this.aiRobot.say(fullSentence);
                            }
                            sentenceBuffer = sentences[sentences.length - 1];
                        }
                    }

                    // Gửi nốt phần còn lại nếu có
                    if (sentenceBuffer.trim()) {
                        this.aiRobot.say(sentenceBuffer);
                    }

                    if (bubble) {
                        bubble.style.display = 'none';
                    }
                },
                () => { // onEnd
                    const bubble = document.getElementById('voice-status-bubble');

                    // Nếu vẫn đang trong chế độ Voice Active và Mon KHÔNG nói -> Tự động khởi động lại Mic
                    if (this.isVoiceActive && !this.aiRobot.dialogue.isPlaying) {
                        setTimeout(() => {
                            if (this.isVoiceActive && this.voiceListener) {
                                this.voiceListener.start();
                            }
                        }, 1000);
                        return;
                    }

                    if (bubble) bubble.style.display = 'none';
                }
            );

            // 7. Global Event Listeners
            this.setupEvents();

            this.isRunning = true;
            this.animate();

        } catch (e) {
            console.error('[App] Init Error:', e);
        }
    }

    setupEvents() {
        Events.on('UI_START_CLICKED', () => this.startExperience());
        Events.on('PLAYER_LOCKED', () => {
            this.ui.showOverlay(false);
            this.ui.setCrosshair(true);
        });
        Events.on('PLAYER_UNLOCKED', () => {
            this.ui.showOverlay(true);
            this.ui.setCrosshair(false);
        });
        Events.on('UPDATE_PROMPT', (html) => this.ui.setPrompt(html));
        Events.on('ROBOT_INTERACTED', () => {
            this.aiRobot.say("Chào khách quý! Mon đã sẵn sàng rồi nè. (Bấm phím V để bắt đầu nói chuyện với Mon nhé!)", 6000);
        });

        Events.on('VOICE_START', () => {
            this.isVoiceActive = true;
            this.lastVoiceTime = Date.now(); // Reset khi bắt đầu
            if (this.voiceListener) this.voiceListener.start();
        });
        Events.on('VOICE_STOP', () => {
            this.isVoiceActive = false;
            if (this.voiceListener) this.voiceListener.stop();
        });
    }

    startExperience() {
        if (this.aiRobot && this.aiRobot.dialogue) this.aiRobot.dialogue.unlock();

        const audioCtx = THREE.AudioContext.getContext();
        if (audioCtx.state !== 'running') audioCtx.resume();

        if (this.player && this.player.controls) this.player.controls.lock();
    }

    animate() {
        if (!this.isRunning) return;
        requestAnimationFrame(() => this.animate());

        const now = Date.now();
        const delta = Math.min(this.clock.getDelta(), 0.1);

        // Nếu Mon đang nói thì liên tục cập nhật lastVoiceTime để không bị tính là "im lặng"
        if (this.aiRobot.dialogue.isPlaying || this.aiRobot.dialogue.audioQueue.length > 0) {
            this.lastVoiceTime = now;
        }

        // --- 1. Kiểm tra thời gian im lặng để tự tắt Mic ---
        if (this.isVoiceActive && (now - this.lastVoiceTime > this.idleThreshold)) {
            this.isVoiceActive = false;
            if (this.voiceListener) this.voiceListener.stop();

            // Xóa sạch text cũ trước khi hiện thông báo nghỉ
            this.aiRobot.dialogue.stopAudio();
            this.aiRobot.say("Cậu không nói gì nữa nên Mon xin phép đi nghỉ nhé. Khi nào cần hãy bấm V để gọi Mon nha!", 5000);

            Events.emit('VOICE_AUTO_STOP');
        }

        // --- 2. Tự động bật lại Mic sau khi Mon nói xong (Khử Echo) ---
        if (this.isVoiceActive && !this.aiRobot.dialogue.isPlaying && this.aiRobot.dialogue.audioQueue.length === 0) {
            if (this.voiceListener && !this.voiceListener.isListening) {
                // Thêm một chút delay để tránh hụt hơi
                if (!this.resumeMicTimeout) {
                    this.resumeMicTimeout = setTimeout(() => {
                        if (this.isVoiceActive && !this.aiRobot.dialogue.isPlaying) {
                            this.voiceListener.start();
                        }
                        this.resumeMicTimeout = null;
                    }, 500);
                }
            }
        }

        // --- 3. Kiểm tra người dùng quên đóng tủ (Mỗi 3 giây) ---
        if (!this.lastDrawerCheck) this.lastDrawerCheck = 0;
        if (now - this.lastDrawerCheck > 3000) {
            this.lastDrawerCheck = now;
            this.world.interactableObjects.forEach(obj => {
                if (obj.userData.isDrawer) {
                    if (obj.userData.isOpen) {
                        const drawerPos = new THREE.Vector3();
                        obj.getWorldPosition(drawerPos);
                        const dist = drawerPos.distanceTo(this.player.controls.getObject().position);

                        // Nếu đi xa quá 3m mà chưa nhắc
                        if (dist > 3 && !obj.userData.hasWarned) {
                            const name = obj.name.toLowerCase();
                            // Phân loại lời nhắc dựa trên tên tủ (giả định tủ 3 có chứa số 3 hoặc là tủ cuối)
                            if (name.includes('3')) {
                                this.aiRobot.say("Ôi chếttt!!! Mấy cọc tiền trong tủ đó ní ơi, đóng tủ dùm tuiii kẻo mất hết giờ!", 6000);
                            } else {
                                this.aiRobot.say("Ní đi mà quên đóng tủ kìaaa, quay lại đóng giúp Mon với!", 4000);
                            }
                            obj.userData.hasWarned = true;
                        }
                    } else {
                        // Reset trạng thái nhắc khi tủ đã đóng
                        obj.userData.hasWarned = false;
                    }
                }
            });
        }

        this.world.update(delta);
        this.entities.update(delta);
        this.interactions.update(delta, this.world.scaleFactor);

        this.ui.updateAudioState(THREE.AudioContext.getContext().state === 'running');
        this.engine.render();
    }

    destroy() {
        this.isRunning = false;
        this.entities.dispose();
        this.engine.dispose();
        console.log('[App] Destroyed.');
    }
}
