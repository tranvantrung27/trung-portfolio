import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class ResourceManager {
    constructor() {
        this.loader = new GLTFLoader();
        this.audioLoader = new THREE.AudioLoader();
        this.assets = new Map();
        this.total = 0;
        this.loaded = 0;
    }

    async loadModel(name, url) {
        this.total++;
        return new Promise((resolve, reject) => {
            this.loader.load(url, (gltf) => {
                this.assets.set(name, gltf);
                this.loaded++;
                this.checkProgress();
                resolve(gltf);
            }, undefined, reject);
        });
    }

    async loadAudio(name, url) {
        this.total++;
        return new Promise((resolve, reject) => {
            this.audioLoader.load(url, (buffer) => {
                this.assets.set(name, buffer);
                this.loaded++;
                this.checkProgress();
                resolve(buffer);
            }, undefined, reject);
        });
    }

    get(name) {
        return this.assets.get(name);
    }

    checkProgress() {
        const progress = (this.loaded / this.total) * 100;
        // Có thể emit event progress ở đây nếu muốn làm loading bar
    }
}
