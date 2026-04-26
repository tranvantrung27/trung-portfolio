export class BaseEntity {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.mesh = null;
        this.isInitialized = false;
    }

    async init() {
        this.isInitialized = true;
    }

    update(delta) {
        if (!this.isInitialized) return;
    }

    dispose() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
        }
    }
}
