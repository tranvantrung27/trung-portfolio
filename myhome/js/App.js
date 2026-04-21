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
import { Interactions } from './Interactions.js';

export class App {
    constructor() {
        this.renderer = null;
        this.camera = null;
        this.scene = null;
        this.composer = null;
        this.clock = new THREE.Clock();

        this.world = null;
        this.player = null;
        this.interactions = null;
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
        this.renderer.toneMappingExposure = 1.2;
        document.body.appendChild(this.renderer.domElement);

        // --- 2. Post Processing ---
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        
        const outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), this.scene, this.camera);
        outlinePass.edgeStrength = 4.0;
        outlinePass.edgeThickness = 1.0;
        outlinePass.visibleEdgeColor.set(0xffffff);
        this.composer.addPass(outlinePass);
        
        this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.4, 0.6, 0.98));
        this.composer.addPass(new OutputPass());

        // --- 3. Module Initialization ---
        this.world = new World(this.scene);
        this.player = new Player(this.camera, document.body, this.world);
        this.interactions = new Interactions(this.camera, this.scene, this.world, this.player, outlinePass);

        // --- 4. Environment & Loading ---
        const pmremGen = new THREE.PMREMGenerator(this.renderer);
        this.scene.environment = pmremGen.fromScene(new RoomEnvironment()).texture;

        try {
            const loadData = await this.world.load('/assets/models/home/home.glb');
            this.player.setupPhysics();
            
            // Initial Spawn
            this.player.controls.getObject().position.copy(loadData.spawnInfo.position);
            this.player.controls.getObject().lookAt(loadData.spawnInfo.lookAt);

            this.setupUI();
            this.animate();
        } catch (error) {
            console.error('[HomeApp] Failed to load world:', error);
        }

        this._boundResize = () => this.onResize();
        window.addEventListener('resize', this._boundResize);
    }

    destroy() {
        this.isRunning = false;
        window.removeEventListener('resize', this._boundResize);
        if (this.player && this.player.controls) this.player.controls.unlock();
        
        // Dispose GPU resources
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
            this.player.controls.lock();
            if (THREE.AudioContext.getContext().state !== 'running') {
                THREE.AudioContext.getContext().resume();
            }
        });

        this.player.controls.addEventListener('lock', () => {
            gsap.to(overlay, { 
                opacity: 0, 
                duration: 0.8, 
                ease: 'power2.inOut',
                onComplete: () => overlay.style.display = 'none' 
            });
        });

        this.player.controls.addEventListener('unlock', () => {
            overlay.style.display = 'flex';
            gsap.to(overlay, { opacity: 1, duration: 0.5 });
        });
    }
    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        if (!this.isRunning) return;
        requestAnimationFrame(() => this.animate());
        const delta = Math.min(this.clock.getDelta(), 0.05);

        this.player.update(delta);
        this.world.update(this.clock.getElapsedTime());
        this.interactions.update(this.world.scaleFactor);

        this.composer.render();
    }
}
