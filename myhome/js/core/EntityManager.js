export class EntityManager {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.entities = [];
    }

    add(entity) {
        this.entities.push(entity);
        return entity;
    }

    update(delta) {
        this.entities.forEach(entity => entity.update(delta));
    }

    dispose() {
        this.entities.forEach(entity => entity.dispose());
        this.entities = [];
    }
}
