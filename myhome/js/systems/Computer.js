import * as THREE from 'three';
import { BaseEntity } from '../entities/BaseEntity.js';

export class Computer extends BaseEntity {
    constructor(scene, monitorBack, world) {
        super(scene, world);
        this.monitorBack = monitorBack;
        this.canvas = null;
        this.context = null;
        this.texture = null;
        this.time = 0;
    }

    async init() {
        if (!this.monitorBack) {
            console.error("[Computer] Monitor object NOT found!");
            return;
        }

        this.setupCanvas();
        this.setupMesh();

        this.isInitialized = true;
        console.log(`[Computer] Finalized with Auto-Size + User Calibration`);
    }

    setupCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = 1024;
        this.canvas.height = 640;
        this.context = this.canvas.getContext('2d');
        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.anisotropy = 16;
    }

    setupMesh() {
        const geometry = new THREE.PlaneGeometry(1, 1);
        const material = new THREE.MeshBasicMaterial({
            map: this.texture,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.monitorBack.add(this.mesh);

        const localBox = this.calculateBoundingBox();
        const size = new THREE.Vector3();
        localBox.getSize(size);
        const center = new THREE.Vector3();
        localBox.getCenter(center);

        const dims = [size.x, size.y, size.z].sort((a, b) => b - a);
        this.mesh.scale.set(dims[0] * 0.95, dims[1] * 0.95, 1);

        // Đặt ở giữa và hơi nhô ra phía trước (Z+) một chút để không bị z-fighting
        this.mesh.position.set(center.x, center.y, center.z + 0.05);

        // Áp dụng độ nghiêng đã cân chỉnh
        this.mesh.rotation.x = -0.210;
    }

    calculateBoundingBox() {
        const localBox = new THREE.Box3();
        if (this.monitorBack.isMesh) {
            this.monitorBack.geometry.computeBoundingBox();
            localBox.copy(this.monitorBack.geometry.boundingBox);
        } else {
            this.monitorBack.traverse(c => {
                if (c.isMesh) {
                    c.geometry.computeBoundingBox();
                    localBox.union(c.geometry.boundingBox);
                }
            });
        }
        return localBox;
    }

    update(delta) {
        if (!this.isInitialized || !this.context || !this.texture) return;
        this.time += delta;

        const ctx = this.context;
        const w = this.canvas.width, h = this.canvas.height;

        ctx.fillStyle = 'rgba(0, 10, 20, 0.3)';
        ctx.fillRect(0, 0, w, h);

        this.drawGrid(ctx, w, h);
        this.drawStatus(ctx, w, h);
        this.drawTechVisuals(ctx, w, h);

        this.texture.needsUpdate = true;
    }

    drawGrid(ctx, w, h) {
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i < w; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke(); }
        for (let i = 0; i < h; i += 40) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke(); }
    }

    drawStatus(ctx, w, h) {
        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 28px Outfit, sans-serif';
        ctx.fillText(`SYSTEM STATUS: ONLINE`, 60, 80);

        ctx.font = '20px Inter, sans-serif';
        ctx.fillStyle = 'rgba(0, 255, 136, 0.7)';
        ctx.fillText(`CPU LOAD: ${(Math.sin(this.time * 2) * 10 + 40).toFixed(1)}%`, 60, 130);
        ctx.fillText(`MEMORY: ${(Math.cos(this.time) * 5 + 64).toFixed(1)}GB`, 60, 170);
        ctx.fillText(`UPTIME: ${(this.time).toFixed(0)}s`, 60, 210);
    }

    drawTechVisuals(ctx, w, h) {
        // Pulse line
        ctx.beginPath(); ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 3;
        const pulseY = h * 0.7;
        ctx.moveTo(0, pulseY + Math.sin(this.time * 5) * 30);
        for (let x = 0; x < w; x += 10) ctx.lineTo(x, pulseY + Math.sin(this.time * 5 + x * 0.05) * 30);
        ctx.stroke();

        // Rotating circle
        ctx.save(); ctx.translate(w - 160, 160); ctx.rotate(this.time);
        ctx.strokeStyle = '#00ff88'; ctx.setLineDash([15, 15]);
        ctx.beginPath(); ctx.arc(0, 0, 80, 0, Math.PI * 2); ctx.stroke(); ctx.restore();

        // Scanning line
        const scanY = (this.time * 250) % h;
        const grad = ctx.createLinearGradient(0, scanY - 40, 0, scanY);
        grad.addColorStop(0, 'transparent'); grad.addColorStop(1, 'rgba(0, 255, 136, 0.2)');
        ctx.fillStyle = grad; ctx.fillRect(0, scanY - 40, w, 40);
    }
}
