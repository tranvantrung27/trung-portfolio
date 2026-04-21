import * as THREE from 'three';

export class Interactions {
    constructor(camera, scene, world, player, outlinePass) {
        this.camera = camera;
        this.scene = scene;
        this.world = world;
        this.player = player;
        this.outlinePass = outlinePass;

        this.raycaster = new THREE.Raycaster();
        this.interactObject = null;
        this.isSitting = false;
        this.sittingChair = null;

        this.prompt = document.getElementById('interact-prompt');
        this.initListeners();
    }

    initListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'KeyE') this.interact();
        });
    }

    interact() {
        const playerObj = this.player.controls.getObject();

        if (this.isSitting) {
            this.standUp(playerObj);
            return;
        }

        if (this.interactObject && this.interactObject.name.toLowerCase().includes('char1')) {
            this.sitDown(playerObj);
        }
    }

    sitDown(playerObj) {
        this.isSitting = true;
        this.sittingChair = this.interactObject;
        this.player.collisionEnabled = false;
        this.player.velocity.set(0, 0, 0);

        if (this.world.seatPoint) {
            const v = new THREE.Vector3();
            this.world.seatPoint.getWorldPosition(v);
            playerObj.position.set(v.x, v.y + (0.6 * this.world.scaleFactor), v.z);

            if (this.world.pcTarget) {
                const t = new THREE.Vector3();
                this.world.pcTarget.getWorldPosition(t);
                t.y += (0.2 * this.world.scaleFactor);
                
                const m = new THREE.Matrix4().lookAt(playerObj.position, t, new THREE.Vector3(0, 1, 0));
                const e = new THREE.Euler(0, 0, 0, 'YXZ').setFromRotationMatrix(m);
                // Look at screen
                this.camera.rotation.set(e.x - 0.15, e.y, 0, 'YXZ'); 
            } else {
                const q = new THREE.Quaternion();
                this.world.seatPoint.getWorldQuaternion(q);
                const e = new THREE.Euler(0, 0, 0, 'YXZ').setFromQuaternion(q);
                this.camera.rotation.set(e.x, e.y, 0, 'YXZ');
            }
        }
    }

    standUp(playerObj) {
        this.isSitting = false;
        this.player.collisionEnabled = true;
        
        if (this.world.standPoint) {
            const v = new THREE.Vector3();
            this.world.standPoint.getWorldPosition(v);
            playerObj.position.copy(v);
            
            if (this.world.pcTarget) {
                const t = new THREE.Vector3();
                this.world.pcTarget.getWorldPosition(t);
                t.y += (0.5 * this.world.scaleFactor);
                const m = new THREE.Matrix4().lookAt(playerObj.position, t, new THREE.Vector3(0, 1, 0));
                const e = new THREE.Euler(0, 0, 0, 'YXZ').setFromRotationMatrix(m);
                // Look straight horizontally when standing
                this.camera.rotation.set(0, e.y, 0, 'YXZ'); 
            }
        } else {
            playerObj.position.y += 0.5 * this.world.scaleFactor;
        }
        this.sittingChair = null;
    }

    update(sf) {
        if (!this.player.controls.isLocked) return;

        const pos = this.player.controls.getObject().position;
        let selectedForOutline = [];
        this.interactObject = null;

        if (!this.isSitting) {
            // Find nearby interactables
            this.world.interactableObjects.forEach(obj => {
                const worldPos = new THREE.Vector3();
                obj.getWorldPosition(worldPos);
                if (pos.distanceTo(worldPos) < 3.5 * sf) {
                    selectedForOutline.push(obj);
                }
            });

            // Target interactable
            this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
            this.raycaster.far = 2.5 * sf;
            const intersects = this.raycaster.intersectObjects(this.world.interactableObjects, true);
            
            if (intersects.length > 0) {
                let hitObj = intersects[0].object;
                // Traverse up to find the root interactable name
                while (hitObj.parent && !this.world.interactableObjects.includes(hitObj)) {
                    hitObj = hitObj.parent;
                }
                
                if (this.world.interactableObjects.includes(hitObj)) {
                    this.interactObject = hitObj;
                    selectedForOutline = [hitObj];
                    this.outlinePass.visibleEdgeColor.set(0xffffff);
                    
                    if (this.prompt) {
                        this.prompt.style.display = 'block';
                        this.prompt.innerText = 'Nhấn [E] để ngồi';
                    }
                }
            } else {
                if (this.prompt) this.prompt.style.display = 'none';
            }
        } else {
            if (this.prompt) {
                this.prompt.style.display = 'block';
                this.prompt.innerText = 'Nhấn [E] hoặc di chuyển để đứng dậy';
            }
            // Auto stand up on movement
            if (this.player.moveForward || this.player.moveBackward || this.player.moveLeft || this.player.moveRight) {
                this.interact();
            }
        }

        this.outlinePass.selectedObjects = selectedForOutline;
    }
}
