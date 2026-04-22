import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { gsap } from 'gsap';

import { World } from './World.js';
import { Player } from './Player.js';
import { Interactions } from '../systems/Interactions.js';
import { AiRobot } from '../entities/AiRobot.js';
import { Brain } from '../ai/Brain.js';
import { VoiceListener } from '../ai/VoiceListener.js';

export class App {
    constructor() {
        this.renderer = null;
        this.camera = null;
        this.scene = null;
        this.composer = null;
        this.clock = new THREE.Clock();
        this.robotMixer = null;

        this.world = null;
        this.player = null;
        this.interactions = null;
        this.aiRobot = null;
        this.brain = null;
        this.voiceListener = null;
        this.isRunning = true;

        this.init();
    }

    async init() {
        // --- 1. Scene Setup ---
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050505);

        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 5000);
        this.camera.rotation.order = 'YXZ';

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        document.body.appendChild(this.renderer.domElement);

        // --- 2. Environment (RoomEnvironment cho phản chiếu kim loại đẹp) ---
        const environment = new RoomEnvironment(this.renderer);
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        this.scene.environment = pmremGenerator.fromScene(environment).texture;

        // --- 3. Modules ---
        this.world = new World(this.scene);
        this.player = new Player(this.camera, this.renderer.domElement, this.world);
        this.aiRobot = new AiRobot(this.scene, this.world, this.camera);
        this.brain = new Brain();
        // this.setupVoiceChat(); // TẠM ẨN ĐỂ PUSH GIT

        // --- 4. Loading ---
        try {
            const worldData = await this.world.load('/assets/models/home/myhome.glb');
            this.player.setupPhysics();
            
            // Spawn vị trí ban đầu
            this.player.controls.getObject().position.copy(worldData.spawnInfo.position);
            this.camera.lookAt(worldData.spawnInfo.lookAt);

            // Load Robot sau khi world đã xong
            this.aiRobot.load();

            // --- 5. Post Processing ---
            this.setupPostProcessing();
            
            this.interactions = new Interactions(
                this.camera, 
                this.scene, 
                this.world, 
                this.player, 
                this.outlinePass,
                this.aiRobot
            );

            this.setupUI();
            this.animate();
            
        } catch (e) {
            console.error('[App] Init Error:', e);
        }

        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupPostProcessing() {
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));

        const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.4, 0.4, 0.85);
        this.composer.addPass(bloom);

        this.outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), this.scene, this.camera);
        this.outlinePass.edgeStrength = 4.0;
        this.outlinePass.edgeGlow = 1.0;
        this.outlinePass.edgeThickness = 1.0;
        this.outlinePass.visibleEdgeColor.set(0x00ff88);
        this.outlinePass.hiddenEdgeColor.set(0x000000);
        this.composer.addPass(this.outlinePass);

        this.composer.addPass(new OutputPass());
    }

    setupUI() {
        const overlay = document.getElementById('overlay');
        const startButton = document.getElementById('start-button');
        if (!overlay || !startButton) return;

        overlay.style.display = 'flex';

        // Staggered Entrance Animation
        const tl = gsap.timeline({ delay: 0.5 });
        tl.to('.welcome-title', { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out' })
            .to('.controls-grid', { opacity: 1, y: 0, duration: 1, ease: 'power2.out' }, '-=0.8')
            .to('#start-button', { opacity: 1, y: 0, duration: 0.8, ease: 'back.out(1.7)' }, '-=0.6');

        startButton.addEventListener('click', () => {
            // Mở khóa âm thanh mỗi khi nhấn (để làm mới quyền của trình duyệt)
            if (this.aiRobot && this.aiRobot.dialogue) {
                this.aiRobot.dialogue.unlock();
            }

            // Luôn cố gắng resume AudioContext
            const audioCtx = THREE.AudioContext.getContext();
            if (audioCtx.state !== 'running') {
                audioCtx.resume().then(() => {
                    console.log("[App] AudioContext resumed successfully.");
                });
            }

            if (this.player && this.player.controls) {
                this.player.controls.lock();
            }
            gsap.to(overlay, { opacity: 0, duration: 0.5, onComplete: () => overlay.style.display = 'none' });
            const crosshair = document.getElementById('crosshair');
            if (crosshair) crosshair.style.display = 'block';
        });

        const crosshair = document.getElementById('crosshair');

        this.player.controls.addEventListener('lock', () => {
            gsap.to(overlay, {
                opacity: 0,
                duration: 0.8,
                onComplete: () => overlay.style.display = 'none'
            });
            if (crosshair) crosshair.style.display = 'block';
        });

        this.player.controls.addEventListener('unlock', () => {
            overlay.style.display = 'flex';
            gsap.to(overlay, { opacity: 1, duration: 0.5 });
            if (crosshair) crosshair.style.display = 'none';
        });

        // Listen for Key V (TẠM ẨN ĐỂ PUSH GIT)
        /*
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyV' && !e.repeat) {
                // 1. Dừng ngay lập tức âm thanh đang phát để tránh xung đột phần cứng
                if (this.aiRobot && this.aiRobot.dialogue) {
                    this.aiRobot.dialogue.stopAudio();
                }
                
                // 2. Nghỉ 50ms để phần cứng ổn định rồi mới bật Mic
                setTimeout(() => {
                    this.voiceListener.start();
                }, 50);
            }
            // MỚI: Phím T để kiểm tra âm thanh
            if (e.code === 'KeyT' && this.aiRobot && this.aiRobot.dialogue) {
                this.aiRobot.dialogue.testSound();
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'KeyV') {
                this.voiceListener.stop();
            }
        });
        */
    }

    setupVoiceChat() {
        const debugLog = document.getElementById('ai-log-content');
        const statusBubble = document.getElementById('voice-status-bubble');

        const log = (msg) => {
            if (!debugLog) return;
            const entry = document.createElement('div');
            entry.textContent = `${new Date().toLocaleTimeString()} - ${msg}`;
            debugLog.appendChild(entry);
            debugLog.scrollTop = debugLog.scrollHeight;
            if (debugLog.children.length > 20) debugLog.removeChild(debugLog.firstChild);
        };

        this.voiceListener = new VoiceListener(
            // Start
            () => {
                if (statusBubble) statusBubble.style.display = 'block';
                log("[Voice] Đang nghe...");
            },
            // Result (Gửi tới Brain)
            async (text) => {
                log(`[BẠN NÓI]: "${text}"`);
                
                log("[AI BRAIN]: Đang gửi câu hỏi tới Groq...");
                const answer = await this.brain.ask(text);
                log(`[AI BRAIN]: Đã trả lời.`);
                
                // Trả lời và tự động đọc (mặc định shouldSpeak = true)
                this.aiRobot.say(answer); 
            },
            // End
            () => {
                if (statusBubble) statusBubble.style.display = 'none';
                log("[Voice] Dừng nghe.");
            }
        );
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        if (this.composer) this.composer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        if (!this.isRunning) return;
        requestAnimationFrame(() => this.animate());

        const delta = this.clock.getDelta();
        if (this.world) this.world.update(delta);
        if (this.player) this.player.update(delta);
        if (this.aiRobot) this.aiRobot.update(delta);
        if (this.interactions) this.interactions.update(this.world ? this.world.scaleFactor : 1);
        
        this.updateAudioIndicator();
        this.render();
    }

    updateAudioIndicator() {
        const indicator = document.getElementById('audio-indicator');
        if (indicator) {
            const state = THREE.AudioContext.getContext().state;
            if (state === 'running') {
                indicator.classList.add('on');
            } else {
                indicator.classList.remove('on');
            }
        }
    }

    render() {
        if (this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }

    destroy() {
        this.isRunning = false;
        if (this.voiceListener) this.voiceListener.stop();

        const disposeObject = (obj) => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        };
        if (this.scene) this.scene.traverse(disposeObject);
        if (this.renderer) this.renderer.dispose();
        if (this.composer) this.composer.dispose();

        console.log('[HomeApp] Destroyed.');
    }
}
