import * as THREE from 'three';
import { BaseEntity } from './BaseEntity.js';
import { Dialogue } from '../audio/Dialogue.js';

export class AiRobot extends BaseEntity {
    constructor(scene, world, camera) {
        super(scene, world);
        this.camera = camera;
        this.robotMixer = null;
        this.exclamationSprite = null;
        this.exclamationTime = 0;
        this.dialogue = new Dialogue();
    }

    async init(resourceManager) {
        const gltf = resourceManager.get('robot');
        if (!gltf) return;

        this.mesh = gltf.scene;
        this.setupSpawnPosition();
        this.processMaterials();
        this.setupAnimations(gltf);
        
        this.scene.add(this.mesh);
        this.isInitialized = true;
    }

    setupSpawnPosition() {
        let spawnNode = null;
        if (this.world && this.world.model) {
            this.world.model.traverse(c => {
                if (c.name.toLowerCase().includes('spawn_robot')) spawnNode = c;
            });
        }

        if (spawnNode) {
            const pos = new THREE.Vector3();
            spawnNode.getWorldPosition(pos);
            this.mesh.position.copy(pos);
            
            // Robot nhìn về phía người chơi (giữ độ cao y của robot)
            const target = new THREE.Vector3(this.camera.position.x, this.mesh.position.y, this.camera.position.z);
            this.mesh.lookAt(target);
            
            console.log(`[AiRobot] Spawned and rotated towards player`);
        }
    }

    processMaterials() {
        this.mesh.traverse((child) => {
            const lowerName = child.name.toLowerCase();

            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                if (lowerName.includes('blue_light') || lowerName.includes('eye')) {
                    child.visible = true;
                    if (child.scale.x < 0.0001) child.scale.set(1, 1, 1);
                    if (child.position.length() > 500) child.position.set(0, 0, 0);

                    if (child.material) {
                        child.material.emissiveIntensity = 0.8;
                        child.material.opacity = 1;
                        child.material.transparent = false;
                        if (child.material.emissive) child.material.emissive.setHex(0x00aaff);
                    }
                } else if (child.material) {
                    if (child.material.emissiveIntensity !== undefined) child.material.emissiveIntensity = 0.1;
                    child.material.envMapIntensity = 0.5;
                }

                this.world.interactableObjects.push(child);
                child.userData.isRobot = true;
            }

            if (lowerName === 'hi') {
                this.hiNode = child;
                this.createExclamationSprite();
            }
        });
        this.mesh.userData.isRobot = true;
    }

    createExclamationSprite() {
        const canvas = document.createElement('canvas');
        canvas.width = 128; canvas.height = 128;
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, 128, 128);
        ctx.fillStyle = '#00ff88';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 8;

        // Vẽ thân dấu chấm than
        const w = 24, h = 60;
        ctx.beginPath();
        ctx.roundRect(64 - w/2, 15, w, h, 10);
        ctx.fill();
        ctx.stroke();

        // Vẽ dấu chấm
        ctx.beginPath();
        ctx.arc(64, 100, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ 
            map: texture, 
            transparent: true, 
            depthTest: false,
            depthWrite: false
        });
        
        this.exclamationSprite = new THREE.Sprite(material);
        this.exclamationSprite.scale.set(0.2, 0.2, 1);
        this.mesh.add(this.exclamationSprite); // Gắn vào root của robot thay vì hiNode
    }

    setupAnimations(gltf) {
        if (gltf.animations && gltf.animations.length > 0) {
            this.robotMixer = new THREE.AnimationMixer(this.mesh);
            const action = this.robotMixer.clipAction(gltf.animations[0]);
            action.play();
        }
    }

    say(message, duration = 4000, shouldSpeak = true) {
        if (this.dialogue) this.dialogue.say(message, duration, shouldSpeak);
    }

    update(delta) {
        if (!this.isInitialized) return;
        if (this.robotMixer) this.robotMixer.update(delta);
        
        if (this.exclamationSprite && this.hiNode) {
            this.exclamationTime += delta;
            
            // Cập nhật vị trí theo hiNode nhưng không bị dính scale của nó
            const worldPos = new THREE.Vector3();
            this.hiNode.getWorldPosition(worldPos);
            this.exclamationSprite.position.copy(this.mesh.worldToLocal(worldPos));
            this.exclamationSprite.position.y += 0.3; // Offset lên trên một chút

            const pulse = 1.0 + Math.sin(this.exclamationTime * 5) * 0.15;
            this.exclamationSprite.scale.set(pulse * 0.2, pulse * 0.2, 1);
        }
    }
}
