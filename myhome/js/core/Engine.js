import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CONFIG } from '../config/Config.js';

export class Engine {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(CONFIG.RENDERER.clearColor);

        this.camera = new THREE.PerspectiveCamera(
            CONFIG.CAMERA.fov,
            window.innerWidth / window.innerHeight,
            CONFIG.CAMERA.near,
            CONFIG.CAMERA.far
        );
        this.camera.rotation.order = 'YXZ';

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = CONFIG.RENDERER.shadows;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = CONFIG.RENDERER.exposure;
        document.body.appendChild(this.renderer.domElement);

        this.setupEnvironment();
        this.setupPostProcessing();

        window.addEventListener('resize', () => this.onWindowResize());
    }

    setupEnvironment() {
        const environment = new RoomEnvironment(this.renderer);
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        this.scene.environment = pmremGenerator.fromScene(environment).texture;
    }

    setupPostProcessing() {
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));

        const bloom = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            CONFIG.BLOOM.strength,
            CONFIG.BLOOM.radius,
            CONFIG.BLOOM.threshold
        );
        this.composer.addPass(bloom);

        this.outlinePass = new OutlinePass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            this.scene,
            this.camera
        );
        this.outlinePass.edgeStrength = CONFIG.OUTLINE.edgeStrength;
        this.outlinePass.edgeGlow = CONFIG.OUTLINE.edgeGlow;
        this.outlinePass.edgeThickness = CONFIG.OUTLINE.edgeThickness;
        this.outlinePass.visibleEdgeColor.set(CONFIG.OUTLINE.visibleColor);
        this.outlinePass.hiddenEdgeColor.set(CONFIG.OUTLINE.hiddenColor);
        this.composer.addPass(this.outlinePass);

        this.composer.addPass(new OutputPass());
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);
    }

    render() {
        this.composer.render();
    }

    dispose() {
        this.renderer.dispose();
        this.composer.dispose();
        document.body.removeChild(this.renderer.domElement);
    }
}
