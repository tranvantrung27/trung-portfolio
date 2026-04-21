import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.loader = new GLTFLoader();
        this.model = null;

        // Collision groups
        this.floorObjects = [];
        this.wallObjects = [];
        this.propObjects = [];

        // Dynamic elements
        this.pcFans = [];
        this.pcTarget = null;
        this.workGlobe = null;
        this.seatPoint = null;
        this.standPoint = null;
        this.interactableObjects = [];

        this.scaleFactor = 1.0;

        RectAreaLightUniformsLib.init();
    }

    async load(url) {
        return new Promise((resolve, reject) => {
            this.loader.load(url, (gltf) => {
                this.model = gltf.scene;
                this.scene.add(this.model);

                this.calculateScaleFactor();
                this.setupEnvironment();
                this.processHierarchy();
                this.setupLights();

                resolve({
                    model: this.model,
                    scaleFactor: this.scaleFactor,
                    spawnInfo: this.getSpawnInfo()
                });
            }, undefined, reject);
        });
    }

    calculateScaleFactor() {
        const box = new THREE.Box3().setFromObject(this.model);
        const size = new THREE.Vector3();
        box.getSize(size);

        let doorMesh = null;
        this.model.traverse(c => {
            if (c.isMesh && c.name.toLowerCase().includes('door')) doorMesh = c;
        });

        if (doorMesh) {
            const dBox = new THREE.Box3().setFromObject(doorMesh);
            this.scaleFactor = dBox.getSize(new THREE.Vector3()).y / 2.0;
        } else if (size.y > 20) {
            this.scaleFactor = size.y / 3.0;
        }
    }

    setupEnvironment() {
        // Ambient & hemisphere light for natural look
        const ambient = new THREE.AmbientLight(0xffffff, 1.2);
        this.scene.add(ambient);
        this.scene.add(new THREE.HemisphereLight(0xfff8f0, 0x8a7060, 1.0));

        const roomFill = new THREE.PointLight(0xfff5e0, 1.0, 0, 1.5);
        this.scene.add(roomFill);
    }

    processHierarchy() {
        this.model.traverse((child) => {
            const name = child.name.toLowerCase();

            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                // Categorize for physics/interaction
                if (name.includes('floor') || name.includes('object_8') || name.includes('san')) {
                    this.floorObjects.push(child);
                } else if (/wall|floor|san|ceiling|window|door/i.test(name)) {
                    this.wallObjects.push(child);
                } else if (/table|char|desk|cabinet|box|shelf|bed|sofa|furniture/i.test(name)) {
                    // Prop collision (AABB)
                    child.geometry.computeBoundingBox();
                    const box = new THREE.Box3().setFromObject(child);
                    const center = new THREE.Vector3();
                    box.getCenter(center);
                    
                    // Slightly shrink collision box for smoother behavior
                    const size = new THREE.Vector3();
                    box.getSize(size);
                    size.multiplyScalar(0.8);
                    box.setFromCenterAndSize(center, size);
                    
                    child.userData.box = box;
                    child.userData.center = center;
                    this.propObjects.push(child);
                }

                // Special Materials
                if (child.name === 'Object_22') { // Screen/Emissive
                    child.material.emissive = new THREE.Color(0xffffff);
                    child.material.emissiveIntensity = 5.0;
                }

                if (child.material) {
                    child.material.side = THREE.DoubleSide;
                    if (/frame|picture|photo|image|art/i.test(name)) {
                        child.material.emissive = new THREE.Color(0x000000);
                        child.material.roughness = 1.0;
                    }
                }
            }

            // Interactables & Animation anchors
            if (name.includes('char1')) this.interactableObjects.push(child);
            if (name.includes('seat_point')) this.seatPoint = child;
            if (name.includes('stand_point')) this.standPoint = child;

            if (/pc|monitor|display/i.test(name) && !/light|chair|fan/i.test(name)) this.pcTarget = child;
            if (name.includes('fans')) this.pcFans.push(child);
            if (name === 'work') this.workGlobe = child;
        });
    }

    setupLights() {
        const anchorNames = ['light1', 'light2', 'light3', 'light4', 'light5', 'light6'];
        this.model.traverse((child) => {
            if (anchorNames.includes(child.name)) {
                const pos = new THREE.Vector3();
                child.getWorldPosition(pos);
                
                const isWorkLight = child.name === 'light2' || child.name === 'light3';
                const intensity = isWorkLight ? 18 * this.scaleFactor : 35 * this.scaleFactor;
                
                const spotLight = new THREE.SpotLight(
                    0xfff5e0, 
                    intensity, 
                    20 * this.scaleFactor, 
                    isWorkLight ? Math.PI / 4.5 : Math.PI / 3.5, 
                    0.8, 
                    1.5
                );
                spotLight.position.copy(pos);
                
                const target = new THREE.Object3D();
                if (isWorkLight) {
                    target.position.set(pos.x, pos.y - 5 * this.scaleFactor, pos.z + 1.8 * this.scaleFactor);
                } else {
                    target.position.set(pos.x, pos.y - 5 * this.scaleFactor, pos.z);
                }
                this.scene.add(target);
                spotLight.target = target;
                
                spotLight.castShadow = true;
                spotLight.shadow.mapSize.set(512, 512);
                spotLight.shadow.bias = -0.001;
                this.scene.add(spotLight);
            }
        });
    }

    getSpawnInfo() {
        let doorMesh = null;
        this.model.traverse(c => {
            if (c.isMesh && c.name.toLowerCase().includes('door')) doorMesh = c;
        });

        if (doorMesh) {
            const houseBox = new THREE.Box3().setFromObject(this.model);
            const dCenter = new THREE.Vector3();
            new THREE.Box3().setFromObject(doorMesh).getCenter(dCenter);
            const houseCenter = new THREE.Vector3();
            houseBox.getCenter(houseCenter);

            const dirInward = new THREE.Vector3().subVectors(houseCenter, dCenter).setY(0).normalize();
            const spawnPos = dCenter.clone().add(dirInward.multiplyScalar(2.0 * this.scaleFactor));
            return { position: spawnPos, lookAt: houseCenter };
        }
        return { position: new THREE.Vector3(0, 1.6, 5), lookAt: new THREE.Vector3(0, 1.6, 0) };
    }

    update(elapsedTime) {
        this.pcFans.forEach(f => f.rotation.y += 0.3);
        if (this.workGlobe) this.workGlobe.rotation.y += 0.015;
    }
}
