import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { CONFIG } from '../config/Config.js';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.model = null;

        // Collision groups
        this.floorObjects = [];
        this.wallObjects = [];
        this.propObjects = [];
        this.collisionBoxes = [];

        // Dynamic elements references (for other systems)
        this.pcFans = [];
        this.pcTarget = null;
        this.workGlobe = null;
        this.seatPoint = null;
        this.standPoint = null;
        this.interactableObjects = [];
        this.scaleFactor = 1.0;

        RectAreaLightUniformsLib.init();
    }

    async init(gltf) {
        this.model = gltf.scene;
        this.scene.add(this.model);

        this.calculateScaleFactor();
        this.setupEnvironment();
        this.processHierarchy();
        this.buildCollisionBoxes();
        this.setupLights();

        return {
            scaleFactor: this.scaleFactor,
            spawnInfo: this.getSpawnInfo()
        };
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
        const ambient = new THREE.AmbientLight(0xffffff, 0.05);
        this.scene.add(ambient);
        this.scene.add(new THREE.HemisphereLight(0xfff8f0, 0x8a7060, 0.1));
    }

    processHierarchy() {
        this.model.traverse((child) => {
            const name = child.name.toLowerCase();

            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                // 1. Floor logic
                if (/floor|san|surface|ground|carpet|rug|mat/i.test(name)) {
                    this.floorObjects.push(child);
                }
                // 2. Solid logic
                else if (/wall|door|ceiling|window|table|char|desk|sofa|bed|shelf|cabinet|wardrobe|bookcase|counter/i.test(name)) {
                    this.wallObjects.push(child);
                }

                this.applySpecialMaterials(child, name);
            }

            this.detectKeyPoints(child, name);
        });
    }

    applySpecialMaterials(child, name) {
        if (child.name === 'Object_22') {
            child.material.emissive = new THREE.Color(0xffffff);
            child.material.emissiveIntensity = 12; // Tăng lại lên 1.2
        }

        if (child.material) {
            child.material.side = THREE.DoubleSide;

            // Tự phát sáng cho các điểm đặt đèn (Bulbs)
            if (/light[1-6]/i.test(name)) {
                child.material.emissive = new THREE.Color(0xffffff);
                child.material.emissiveIntensity = 2.0;
            }

            // Xử lý các bề mặt lớn và dễ bị chói (tường, trần, bàn, CPU)
            if (/wall|ceiling|trần|tường|cột|pillar|surface_0|table|desk|bàn|cpu|case/i.test(name)) {
                child.material.roughness = 0.9; // Tăng độ nhám để giảm chói
                child.material.metalness = 0.05; // Giảm tính kim loại
                child.material.envMapIntensity = 0.3; // Giảm phản xạ môi trường
                if (child.material.emissive && !/light/i.test(name)) child.material.emissive.setHex(0x000000);
            }

            if (/frame|picture|photo|image|art/i.test(name)) {
                child.material.emissive = new THREE.Color(0x000000);
                child.material.roughness = 1.0;
            }
        }
    }

    detectKeyPoints(child, name) {
        // Interactables
        if (name.includes('char1')) this.interactableObjects.push(child);
        if (name.includes('drawer')) {
            this.interactableObjects.push(child);
            child.userData.isDrawer = true;
            child.userData.isOpen = false;
        }
        else if (name.includes('door_exit')) {
            console.log(`[World] Target Door Found: ${name}`);
            child.traverse(c => {
                if (c.isMesh) c.userData.isDoor = true;
            });
            child.userData.isDoor = true;
            this.interactableObjects.push(child);
        }

        // Vật phẩm trong tủ (Nhận diện các cọc tiền "money" hoặc có tiền tố "item_")
        const isItem = name.toLowerCase().startsWith('money') || name.toLowerCase().startsWith('item_');
        
        if (isItem) {
            let rootItem = child;
            // Leo lên tìm cha cao nhất mà vẫn giữ đúng tên item đó
            while (rootItem.parent && 
                   (rootItem.parent.name.toLowerCase().startsWith('money') || rootItem.parent.name.toLowerCase().startsWith('item_')) && 
                   rootItem.parent !== this.model) {
                rootItem = rootItem.parent;
            }

            rootItem.userData.isItem = true;
            // KHÔNG đánh dấu isItem ở mesh con để bắt buộc hệ thống phải leo lên cha
            this.interactableObjects.push(child);
        }

        // Anchors
        if (name.includes('seat_point')) this.seatPoint = child;
        if (name.includes('stand_point')) this.standPoint = child;
        if (name.includes('fans')) this.pcFans.push(child);
        if (name === 'work') this.workGlobe = child;

        // PC Target
        if (/pc|monitor|display/i.test(name) && !/light|chair|fan/i.test(name)) {
            const wp = new THREE.Vector3();
            child.getWorldPosition(wp);
            if (wp.length() > 0.1) this.pcTarget = child;
        }

        // Monitor Target (Ưu tiên screen_glass nhất vì đã được user cân chỉnh)
        if (/screen_glass/i.test(name)) {
            this.computerScreenTarget = child;
        } else if (/screen_anchor|display_screen|Object_4002/i.test(name)) {
            if (!this.computerScreenTarget) this.computerScreenTarget = child;
            if (name.includes('screen_anchor')) this.screenAnchor = child;
        }
    }

    setupLights() {
        const anchorNames = ['light1', 'light2', 'light3', 'light4', 'light5', 'light6'];
        this.model.traverse((child) => {
            if (anchorNames.includes(child.name)) {
                const pos = new THREE.Vector3();
                child.getWorldPosition(pos);

                const isWorkLight = ['light1', 'light2', 'light3', 'light5', 'light6'].includes(child.name);
                let intensityMultiplier = isWorkLight ? 1.5 : 5.0;
                if (['light1', 'light2', 'light5', 'light6'].includes(child.name)) intensityMultiplier = 50.0;

                const intensity = intensityMultiplier * this.scaleFactor;
                console.log(`[World] Creating light: ${child.name}, intensity: ${intensity.toFixed(2)}`);

                const spotAngle = isWorkLight ? Math.PI / 6 : Math.PI / 3.5;
                const spotLight = new THREE.SpotLight(0xfff5e0, intensity, 20 * this.scaleFactor, spotAngle, 1.0, 2.0);
                spotLight.position.copy(pos);

                const target = new THREE.Object3D();
                target.position.set(pos.x, pos.y - 5 * this.scaleFactor, isWorkLight ? pos.z + 1.8 * this.scaleFactor : pos.z);
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

            const dirInward = new THREE.Vector3().subVectors(houseCenter, dCenter).setY(0).setZ(0).normalize();
            const spawnPos = dCenter.clone().add(dirInward.multiplyScalar(0.5 * this.scaleFactor));
            const floorY = (this.roomBounds && !this.roomBounds.isEmpty()) ? this.roomBounds.min.y : houseBox.min.y;
            spawnPos.y = floorY + CONFIG.PLAYER.height * this.scaleFactor;

            const straightLookTarget = spawnPos.clone().add(dirInward.clone().multiplyScalar(5));
            return { position: spawnPos, lookAt: straightLookTarget };
        }

        return { position: new THREE.Vector3(0, CONFIG.PLAYER.height * this.scaleFactor, 5), lookAt: new THREE.Vector3(0, 1.6, 0) };
    }

    buildCollisionBoxes() {
        this.roomBounds = new THREE.Box3();
        for (const floor of this.floorObjects) this.roomBounds.expandByObject(floor);
        if (this.roomBounds.isEmpty()) this.roomBounds.setFromObject(this.model);

        const MAX_FURNITURE_XZ = 4.0 * this.scaleFactor;
        this.collisionBoxes = [];
        for (const obj of this.wallObjects) {
            const box = new THREE.Box3().setFromObject(obj);
            const size = box.getSize(new THREE.Vector3());
            if (Math.max(size.x, size.z) > MAX_FURNITURE_XZ) continue;
            if (size.x < 0.001 && size.z < 0.001) continue;
            this.collisionBoxes.push(box);
        }
    }

    update(delta) {
        this.pcFans.forEach(f => f.rotation.y += 0.3);
        if (this.workGlobe) this.workGlobe.rotation.y += 0.015;
    }
}
