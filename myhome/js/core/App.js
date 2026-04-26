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

            // 6. Global Event Listeners
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
            this.aiRobot.say("Chào bro! Rất vui được gặp ông. (Giữ phím V để trò chuyện trực tiếp với Mon nhé!)", 6000);
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

        const delta = Math.min(this.clock.getDelta(), 0.1); // Cap delta to avoid physics glitches
        
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
