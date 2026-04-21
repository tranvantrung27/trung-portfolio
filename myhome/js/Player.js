import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

export class Player {
    constructor(camera, domElement, world) {
        this.camera = camera;
        this.world = world;
        this.controls = new PointerLockControls(camera, domElement);
        
        // Physics state
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.canJump = false;
        this.collisionEnabled = true;

        // Constants (will be scaled)
        this.FRICTION = 10.0;
        this.WALK_SPEED = 25.0;
        this.EYE_HEIGHT = 1.6;
        this.PLAYER_RADIUS = 0.25;

        // Audio
        this.footstepSound = null;
        this.footstepDistAccum = 0;
        this.stepToggle = false;
        this.lastPos = new THREE.Vector3();
        this.moveStartTime = 0;
        this.STEP_LENGTH = 0.55;

        this.initAudio();
        this.initInputs();
    }

    initAudio() {
        const listener = new THREE.AudioListener();
        this.camera.add(listener);
        this.footstepSound = new THREE.Audio(listener);
        new THREE.AudioLoader().load('/assets/sounds/walk.mp3', (buffer) => {
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
                case 'Space': 
                    if (this.canJump) { 
                        this.velocity.y += (180 * this.world.scaleFactor); 
                        this.canJump = false; 
                    } 
                    break;
                case 'KeyV': this.collisionEnabled = !this.collisionEnabled; break;
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
    }

    setupPhysics() {
        const sf = this.world.scaleFactor;
        this.EYE_HEIGHT = 1.6 * sf;
        this.PLAYER_RADIUS = 0.25 * sf;
        this.WALK_SPEED = 25.0 * sf;
    }

    update(delta) {
        if (!this.controls.isLocked) return;

        const player = this.controls.getObject();
        const pos = player.position;

        // Physics Sub-stepping for stability
        const steps = 4;
        const subDelta = delta / steps;
        let onFloor = false;

        const isMovingPhysically = this.velocity.length() > 0.05;

        for (let s = 0; s < steps; s++) {
            // Apply Friction
            this.velocity.x -= this.velocity.x * this.FRICTION * subDelta;
            this.velocity.z -= this.velocity.z * this.FRICTION * subDelta;
            
            // Apply Gravity
            if (this.collisionEnabled) {
                this.velocity.y -= Math.min(9.8 * 25.0 * this.world.scaleFactor, 9.8 * 50.0) * subDelta;
            } else {
                this.velocity.y -= this.velocity.y * this.FRICTION * subDelta;
            }

            // Input direction
            this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
            this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
            this.direction.normalize();

            if (this.moveForward || this.moveBackward) this.velocity.z -= this.direction.z * this.WALK_SPEED * subDelta;
            if (this.moveLeft || this.moveRight) this.velocity.x -= this.direction.x * this.WALK_SPEED * subDelta;

            // --- COLLISION LOGIC ---
            if (this.collisionEnabled && isMovingPhysically) {
                this.handleWallCollisions(pos);
                this.handlePropCollisions(pos);
            }

            // --- FLOOR DETECTION ---
            if (this.collisionEnabled && this.world.floorObjects.length > 0) {
                const ray = new THREE.Raycaster(pos.clone().setY(pos.y + (1.0 * this.world.scaleFactor)), new THREE.Vector3(0, -1, 0));
                const hits = ray.intersectObjects(this.world.floorObjects, true);
                if (hits.length > 0) {
                    const ty = hits[0].point.y + this.EYE_HEIGHT;
                    if (pos.y <= ty + 0.1 * this.world.scaleFactor) {
                        this.velocity.y = 0;
                        pos.y = ty;
                        this.canJump = true;
                        onFloor = true;
                    }
                }
            }

            // Min height safety
            if (this.collisionEnabled && !onFloor && pos.y < this.EYE_HEIGHT) {
                pos.y = this.EYE_HEIGHT;
                this.velocity.y = 0;
                this.canJump = true;
            }

            // Apply Move
            this.controls.moveRight(-this.velocity.x * subDelta);
            this.controls.moveForward(-this.velocity.z * subDelta);
            if (this.velocity.y !== 0) pos.y += (this.velocity.y * subDelta);
        }

        this.updateFootsteps(pos, delta, onFloor);
        this.lastPos.copy(pos);
    }

    handleWallCollisions(pos) {
        const yawQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, this.controls.getObject().rotation.y, 0));
        const contactRays = [
            new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1),
            new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0)
        ];

        const ray = new THREE.Raycaster();
        for (let i = 0; i < 4; i++) {
            const rDir = contactRays[i].clone().applyQuaternion(yawQuat);
            ray.set(pos.clone().setY(pos.y - 0.5 * this.world.scaleFactor), rDir);
            ray.far = this.PLAYER_RADIUS * 1.5;
            const hits = ray.intersectObjects(this.world.wallObjects, true);
            
            if (hits.length > 0 && hits[0].distance < this.PLAYER_RADIUS) {
                const hit = hits[0];
                const overlap = this.PLAYER_RADIUS - hit.distance;
                const normal = hit.face.normal.clone().applyMatrix3(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld)).normalize();
                
                const dotM = rDir.dot(normal);
                const pushNormal = (dotM > 0) ? normal.negate() : normal;
                pos.add(pushNormal.multiplyScalar(overlap * 1.1));
                
                const dotV = this.velocity.dot(pushNormal);
                if (dotV < 0) {
                    this.velocity.x -= pushNormal.x * dotV;
                    this.velocity.z -= pushNormal.z * dotV;
                }
            }
        }
    }

    handlePropCollisions(pos) {
        const nearbyProps = this.world.propObjects.filter(m => pos.distanceTo(m.userData.center) < 5.0 * this.world.scaleFactor);
        nearbyProps.forEach(obj => {
            const box = obj.userData.box;
            const closest = new THREE.Vector3(
                Math.max(box.min.x, Math.min(pos.x, box.max.x)),
                pos.y,
                Math.max(box.min.z, Math.min(pos.z, box.max.z))
            );
            const diff = new THREE.Vector3().subVectors(pos, closest);
            const dist = diff.length();
            
            if (dist < this.PLAYER_RADIUS) {
                const overlap = this.PLAYER_RADIUS - dist;
                const n = (dist === 0) ? new THREE.Vector3(0, 0, 1) : diff.normalize();
                pos.add(n.multiplyScalar(overlap * 1.1));
                
                const dotV = this.velocity.dot(n);
                if (dotV < 0) {
                    this.velocity.x -= n.x * dotV;
                    this.velocity.z -= n.z * dotV;
                }
            }
        });
    }

    updateFootsteps(pos, delta, onFloor) {
        const dMoved = new THREE.Vector2(pos.x, pos.z).distanceTo(new THREE.Vector2(this.lastPos.x, this.lastPos.z));
        const horizontalVel = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);
        const isMoving = horizontalVel > 1.0 && onFloor;

        if (isMoving) {
            this.moveStartTime += delta;
            if (this.moveStartTime > 0.15) {
                this.footstepDistAccum += dMoved;
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
