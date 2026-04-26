import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { BaseEntity } from '../entities/BaseEntity.js';
import { CONFIG } from '../config/Config.js';
import { Events } from './EventManager.js';

export class Player extends BaseEntity {
    constructor(camera, domElement, world) {
        super(camera, world); // Camera is our "mesh container" for the player
        this.camera = camera;
        this.controls = new PointerLockControls(camera, domElement);
        
        // Physics state
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.collisionEnabled = true;

        // Constants
        this.FRICTION = 10.0;
        this.WALK_SPEED = 25.0;
        this.EYE_HEIGHT = CONFIG.PLAYER.height;
        this.PLAYER_RADIUS = 0.35;

        // Audio
        this.footstepSound = null;
        this.footstepDistAccum = 0;
        this.stepToggle = false;
        this.lastPos = new THREE.Vector3();
        this.moveStartTime = 0;
        this.STEP_LENGTH = 0.55;

        this.initInputs();
    }

    async init(resourceManager) {
        this.setupAudio();
        this.setupPhysics();
        this.isInitialized = true;
    }

    setupAudio() {
        const listener = new THREE.AudioListener();
        this.camera.add(listener);
        this.footstepSound = new THREE.Audio(listener);
        
        // Using common AudioLoader for now, but could be moved to ResourceManager
        new THREE.AudioLoader().load(import.meta.env.BASE_URL + 'assets/sounds/walk.mp3', (buffer) => {
            this.footstepSound.setBuffer(buffer);
            this.footstepSound.setLoop(false);
            this.footstepSound.setVolume(0.1);
        });
    }

    initInputs() {
        const onKeyDown = (e) => {
            switch (e.code) {
                case 'KeyW': this.moveForward = true; break;
                case 'KeyA': this.moveLeft = true; break;
                case 'KeyS': this.moveBackward = true; break;
                case 'KeyD': this.moveRight = true; break;
                case 'KeyN': this.collisionEnabled = !this.collisionEnabled; break;
            }
        };
        const onKeyUp = (e) => {
            switch (e.code) {
                case 'KeyW': this.moveForward = false; break;
                case 'KeyA': this.moveLeft = false; break;
                case 'KeyS': this.moveBackward = false; break;
                case 'KeyD': this.moveRight = false; break;
            }
        };
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);

        this.controls.addEventListener('lock', () => Events.emit('PLAYER_LOCKED'));
        this.controls.addEventListener('unlock', () => Events.emit('PLAYER_UNLOCKED'));
    }

    setupPhysics() {
        const sf = this.world.scaleFactor;
        this.EYE_HEIGHT = CONFIG.PLAYER.height * sf;
        this.PLAYER_RADIUS = 0.35 * sf;
        this.WALK_SPEED = 25.0 * sf;
        this._floorRay = new THREE.Raycaster();
        this._floorRay.ray.direction.set(0, -1, 0);
    }

    update(delta) {
        if (!this.isInitialized || !this.controls.isLocked) return;

        const player = this.controls.getObject();
        const pos = player.position;

        const STEPS = 3;
        const subDelta = delta / STEPS;
        let onFloor = false;

        for (let s = 0; s < STEPS; s++) {
            this.velocity.x -= this.velocity.x * this.FRICTION * subDelta;
            this.velocity.z -= this.velocity.z * this.FRICTION * subDelta;

            if (this.collisionEnabled) {
                this.velocity.y -= 9.8 * 22.0 * this.world.scaleFactor * subDelta;
            } else {
                this.velocity.y -= this.velocity.y * this.FRICTION * subDelta;
            }

            this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
            this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
            this.direction.normalize();

            if (this.moveForward || this.moveBackward) this.velocity.z -= this.direction.z * this.WALK_SPEED * subDelta;
            if (this.moveLeft || this.moveRight)       this.velocity.x -= this.direction.x * this.WALK_SPEED * subDelta;

            this.controls.moveRight(-this.velocity.x * subDelta);
            this.controls.moveForward(-this.velocity.z * subDelta);
            if (this.velocity.y !== 0) pos.y += this.velocity.y * subDelta;

            if (this.collisionEnabled) {
                this.handleSolidCollisions(pos);
            }

            if (this.collisionEnabled && this.world.floorObjects.length > 0) {
                this._floorRay.ray.origin.set(pos.x, pos.y + this.world.scaleFactor, pos.z);
                const hits = this._floorRay.intersectObjects(this.world.floorObjects, true);
                if (hits.length > 0) {
                    const targetY = hits[0].point.y + this.EYE_HEIGHT;
                    if (pos.y <= targetY + 0.1 * this.world.scaleFactor) {
                        pos.y = targetY;
                        this.velocity.y = 0;
                        onFloor = true;
                    }
                }
            }

            if (this.collisionEnabled && !onFloor && pos.y < this.EYE_HEIGHT) {
                pos.y = this.EYE_HEIGHT;
                this.velocity.y = 0;
            }
        }

        this.updateFootsteps(pos, delta, onFloor);
        this.lastPos.copy(pos);
    }

    handleSolidCollisions(pos) {
        const R  = this.PLAYER_RADIUS;
        const sf = this.world.scaleFactor;
        const bounds = this.world.roomBounds;
        if (bounds && !bounds.isEmpty()) {
            const margin = R + 0.01;
            if (pos.x < bounds.min.x + margin) { pos.x = bounds.min.x + margin; if (this.velocity.x < 0) this.velocity.x = 0; }
            if (pos.x > bounds.max.x - margin) { pos.x = bounds.max.x - margin; if (this.velocity.x > 0) this.velocity.x = 0; }
            if (pos.z < bounds.min.z + margin) { pos.z = bounds.min.z + margin; if (this.velocity.z < 0) this.velocity.z = 0; }
            if (pos.z > bounds.max.z - margin) { pos.z = bounds.max.z - margin; if (this.velocity.z > 0) this.velocity.z = 0; }
        }

        const boxes  = this.world.collisionBoxes;
        if (!boxes || boxes.length === 0) return;

        const feetY = pos.y - this.EYE_HEIGHT;
        const headY = pos.y + 0.1 * sf;

        for (const box of boxes) {
            if (box.max.y < feetY || box.min.y > headY) continue;
            const closestX = Math.max(box.min.x, Math.min(pos.x, box.max.x));
            const closestZ = Math.max(box.min.z, Math.min(pos.z, box.max.z));
            const dx = pos.x - closestX;
            const dz = pos.z - closestZ;
            const distSq = dx * dx + dz * dz;
            if (distSq >= R * R || distSq < 1e-8) continue;
            const dist = Math.sqrt(distSq);
            const nx = dx / dist;
            const nz = dz / dist;
            const pen = R - dist;
            pos.x += nx * (pen + 0.002);
            pos.z += nz * (pen + 0.002);
            const vDotN = this.velocity.x * nx + this.velocity.z * nz;
            if (vDotN < 0) {
                this.velocity.x -= nx * vDotN;
                this.velocity.z -= nz * vDotN;
            }
        }
    }

    updateFootsteps(pos, delta, onFloor) {
        const horizontalVel = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);
        const isMoving = horizontalVel > 1.0 && onFloor;
        if (isMoving) {
            this.moveStartTime += delta;
            if (this.moveStartTime > 0.15) {
                this.footstepDistAccum += new THREE.Vector2(pos.x, pos.z).distanceTo(new THREE.Vector2(this.lastPos.x, this.lastPos.z));
                if (this.footstepDistAccum >= (this.STEP_LENGTH * this.world.scaleFactor)) {
                    if (this.footstepSound && this.footstepSound.buffer) {
                        if (this.footstepSound.isPlaying) this.footstepSound.stop();
                        this.footstepSound.setPlaybackRate((this.stepToggle ? 0.92 : 1.0) + Math.random() * 0.05);
                        this.footstepSound.setVolume(0.12 + Math.random() * 0.05);
                        this.footstepSound.play();
                        this.stepToggle = !this.stepToggle;
                    }
                    this.footstepDistAccum -= (this.STEP_LENGTH * this.world.scaleFactor);
                }
            }
        } else {
            this.moveStartTime = 0;
            this.footstepDistAccum = 0;
        }
    }
}
