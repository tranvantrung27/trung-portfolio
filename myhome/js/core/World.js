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
        this.collisionBoxes = [];

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
                this.buildCollisionBoxes();
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
        // Ambient & hemisphere light - GIẢM CỰC THẤP vì có RoomEnvironment
        const ambient = new THREE.AmbientLight(0xffffff, 0.05);
        this.scene.add(ambient);
        this.scene.add(new THREE.HemisphereLight(0xfff8f0, 0x8a7060, 0.1));

        // Bỏ PointLight roomFill vì nó làm cháy tường
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
                // 2. Solid logic: Structural + Furniture
                // Matches: wall*, door*, ceiling*, window* + table*, chair*, char*, desk*, sofa*, bed*, shelf*, cabinet*
                else if (/wall|door|ceiling|window|table|char|desk|sofa|bed|shelf|cabinet|wardrobe|bookcase|counter/i.test(name)) {
                    this.wallObjects.push(child);
                }
                // 3. Decorative items (lights, frames, etc.) are non-solid by default

                // Special Materials
                if (child.name === 'Object_22') { // Screen/Emissive
                    child.material.emissive = new THREE.Color(0xffffff);
                    child.material.emissiveIntensity = 1.5;
                }

                if (child.material) {
                    child.material.side = THREE.DoubleSide;
                    // --- TỰ CHỈNH TƯỜNG/TRẦN Ở ĐÂY ---
                    if (/wall|ceiling|trần|tường|cột|pillar|surface_0/i.test(name)) {
                        child.material.roughness = 0.6;        // CÀNG CAO CÀNG LÌ (GIẢM CHÓI). Mặc định: 1.0
                        child.material.metalness = 0.1;        // ĐỘ KIM LOẠI. Mặc định: 0.0
                        child.material.envMapIntensity = 0.8;  // ĐỘ PHẢN CHIẾU MÔI TRƯỜNG (ẢNH HƯỞNG MÀU SẮC). Mặc định: 1.0
                        if (child.material.emissive) child.material.emissive.setHex(0x000000);
                    }
                    if (/frame|picture|photo|image|art/i.test(name)) {
                        child.material.emissive = new THREE.Color(0x000000);
                        child.material.roughness = 1.0;
                    }
                }
            }

            // Interactables & Animation anchors
            if (name.includes('char1')) this.interactableObjects.push(child);

            // BẮT ĐẦU DEBUG: Bắt mọi object có tên chứa 'drawer'
            if (name.includes('drawer')) {
                // In ra tên gốc để debug xem tên chính xác là gì
                console.log(`[World Debug] Đã tìm thấy tủ: ${child.name} (isMesh: ${child.isMesh})`);

                this.interactableObjects.push(child);
                child.userData.isDrawer = true;
                child.userData.isOpen = false;
            }

            if (name.includes('door')) {
                console.log(`[World Debug] Đã tìm thấy cửa: ${child.name}`);
                this.interactableObjects.push(child);
                child.userData.isDoor = true;
            }

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

                const isWorkLight = ['light1', 'light2', 'light3', 'light5', 'light6'].includes(child.name);
                // --- TỰ CHỈNH CƯỜNG ĐỘ ĐÈN Ở ĐÂY ---
                let intensityMultiplier = isWorkLight ? 1.5 : 5.0;
                if (child.name === 'light1' || child.name === 'light2') {
                    intensityMultiplier = 1.0; // Tăng số này nếu thấy đèn 1, 2 bị tối quá
                }

                const intensity = intensityMultiplier * this.scaleFactor;

                const spotLight = new THREE.SpotLight(
                    0xfff5e0,
                    intensity,
                    20 * this.scaleFactor,
                    isWorkLight ? Math.PI / 4.5 : Math.PI / 3.5,
                    1.0, // Penumbra tối đa để cạnh đèn mềm mại
                    2.0  // Decay chuẩn vật lý để ánh sáng tản đều
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

            // Ép vector đi vào nhà CHỈ chạy dọc theo trục X (vô hiệu hóa trục Z)
            const dirInward = new THREE.Vector3().subVectors(houseCenter, dCenter).setY(0).setZ(0).normalize();

            // Lùi lại gần cửa (cách tâm cửa 1.5)
            const spawnPos = dCenter.clone().add(dirInward.multiplyScalar(0.5 * this.scaleFactor));

            // Ép camera ban đầu bằng mặt sàn gỗ thực tế, để không bị kẹt dưới móng nhà đen thui
            const floorY = (this.roomBounds && !this.roomBounds.isEmpty()) ? this.roomBounds.min.y : houseBox.min.y;
            spawnPos.y = floorY + 1.6 * this.scaleFactor;

            // Hướng mắt nhìn thẳng băng vào trong dọc trục X
            const straightLookTarget = spawnPos.clone().add(dirInward.clone().multiplyScalar(5));
            return { position: spawnPos, lookAt: straightLookTarget };
        }

        // Fallback if no door is found
        return { position: new THREE.Vector3(0, 1.6 * this.scaleFactor, 5), lookAt: new THREE.Vector3(0, 1.6 * this.scaleFactor, 0) };
    }

    // Pre-build collision data once at load (zero per-frame cost)
    buildCollisionBoxes() {
        // --- Room boundary from floor objects (keeps player INSIDE the room) ---
        this.roomBounds = new THREE.Box3();
        for (const floor of this.floorObjects) {
            this.roomBounds.expandByObject(floor);
        }
        // Fallback: use model bounds if no floor detected
        if (this.roomBounds.isEmpty()) {
            this.roomBounds.setFromObject(this.model);
        }

        // --- Furniture AABB (keeps player OUTSIDE objects like table/chair) ---
        // Filter: only add furniture-scale meshes (skip room-scale wall/ceiling meshes)
        // Room-scale threshold: if XZ footprint > 4m, it's structural, not furniture
        const MAX_FURNITURE_XZ = 4.0 * this.scaleFactor;
        this.collisionBoxes = [];
        for (const obj of this.wallObjects) {
            const box = new THREE.Box3().setFromObject(obj);
            const size = box.getSize(new THREE.Vector3());

            // Skip room-scale meshes (walls / ceiling / large floor panels)
            if (Math.max(size.x, size.z) > MAX_FURNITURE_XZ) {
                console.log(`[World] ❌ SKIPPED Collision for ${obj.name} (Quá to: ${size.x.toFixed(1)} x ${size.z.toFixed(1)})`);
                continue;
            }
            // Skip degenerate zero-size meshes
            if (size.x < 0.001 && size.z < 0.001) {
                console.log(`[World] ❌ SKIPPED Collision for ${obj.name} (Lỗi / Quá nhỏ)`);
                continue;
            }

            this.collisionBoxes.push(box);
        }

        const rb = this.roomBounds;
        console.log(
            `[World] Room bounds: X[${rb.min.x.toFixed(1)},${rb.max.x.toFixed(1)}] Z[${rb.min.z.toFixed(1)},${rb.max.z.toFixed(1)}]`,
            `| ${this.collisionBoxes.length} furniture boxes | scaleFactor=${this.scaleFactor.toFixed(3)}`
        );
    }

    update(elapsedTime) {
        this.pcFans.forEach(f => f.rotation.y += 0.3);
        if (this.workGlobe) this.workGlobe.rotation.y += 0.015;
    }
}
