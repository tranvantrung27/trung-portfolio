import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { config } from '../utils/utils.js';

export class Robot {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.mixer = null;
    this.clock = new THREE.Clock();

    this.targetPos = new THREE.Vector3(...config.robot.states.home.pos);
    this.targetRotY = config.robot.states.home.rotY;
    this.targetOpacity = 1.0;
    this.currentOpacity = 1.0;
    this.targetScale = config.robot.scale;
    this.waveMeshes = new Array(7).fill(null);
    this.antennaMesh = null;
    this.mouseTarget = new THREE.Vector2(0, 0);
    this.isPresenting = false;

    this.group.position.set(...config.robot.states.home.pos);
    this.group.rotation.y = config.robot.states.home.rotY;
    this.group.scale.setScalar(config.robot.scale);
    this.scene.add(this.group);
  }

  load(url, callback) {
    const loader = new GLTFLoader();
    loader.load(url, (gltf) => {
      const model = gltf.scene;

      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          
          if (child.material) {
            // Keep materials solid to avoid "missing parts" glitch
            child.material.transparent = false;
            child.material.opacity = 1.0;
            child.material.depthWrite = true;

            const lowerName = child.name.toLowerCase();
            
            // Check for the antenna to anchor the chat bubble
            if (lowerName.includes('angten')) {
               this.antennaMesh = child;
            }

            const waveMatch = lowerName.match(/wave_(\d)/);
            
            if (waveMatch) {
              const index = parseInt(waveMatch[1]) - 1;
              if (index >= 0 && index < 7) {
                // Unique materials needed to animate them independently
                child.material = child.material.clone();
                // Base color extremely dark so it looks unlit when "Off"
                child.material.color = new THREE.Color(0x0a1a0a);
                // Pure Neon Green Light when turning "On"
                child.material.emissive = new THREE.Color(0x33ff33); 
                child.material.emissiveIntensity = 0.0;
                this.waveMeshes[index] = child.material;
              }
            } else {
              child.material.emissive = new THREE.Color(config.robot.emissive);
              child.material.emissiveIntensity = config.robot.emissiveIntensity;
            }
          }
        }
      });

      this.group.add(model);

      if (gltf.animations && gltf.animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(model);
        this.mixer.clipAction(gltf.animations[0]).play();
      }

      if (callback) callback(this.group);
    });
  }

  setState(stateName) {
    const state = config.robot.states[stateName];
    if (!state) return;
    this.targetPos.set(...state.pos);
    this.targetRotY = state.rotY;
    
    // Solid robot as requested
    this.targetOpacity = 1.0;
    
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      // Significantly smaller on mobile to avoid covering text if solid
      this.targetScale = (stateName === 'home') ? 0.5 : 0.35;
      if (stateName === 'home') this.targetPos.x = 1.5; // Push further right on mobile
    } else {
      this.targetScale = config.robot.scale;
    }
  }

  setPresenting(isPresenting) {
    this.isPresenting = isPresenting;
  }

  handleResponsiveLayout(factor) {
    // factor is relative to 1600px
    const width = window.innerWidth;
    
    // Scale down a bit more on smaller laptops
    this.targetScale = config.robot.scale * Math.max(0.7, factor);
    
    // Adjust the current target position X based on the factor
    // We only want to "squeeze" the X position
    // Base X for home is 2.0. If width is 1000px (factor 0.6) -> X becomes 1.2
    this.targetPos.x = this._baseStateX() * factor;
  }

  _baseStateX() {
    // Identify the base X coordinate for the current section from config
    // This is needed to keep the logic clean during transitions
    const states = config.robot.states;
    // We try to find which state we are closest to or current target
    // For now, let's just assume the most common is home=2.0
    // But a better way is to iterate and find the match
    for (const key in states) {
      if (Math.abs(this.targetPos.z - states[key].pos[2]) < 0.1) {
        return states[key].pos[0];
      }
    }
    return 2.0;
  }

  setMouseTarget(x, y) {
    this.mouseTarget.set(x, y);
  }

  update(dt, elapsedTime) {
    if (this.mixer) this.mixer.update(dt);
    
    // Smooth transitions
    this.group.position.lerp(this.targetPos, 3 * dt);
    
    // Combine base state rotation with subtle mouse tracking
    const mouseInfluence = this.isPresenting ? 0.05 : 0.25; 
    const presentationRot = this.isPresenting ? 0 : 0; // If presenting, stay centered
    const baseRot = this.isPresenting ? 0 : this.targetRotY;

    const finalRotY = baseRot + (this.mouseTarget.x * mouseInfluence);
    
    this.group.rotation.y += (finalRotY - this.group.rotation.y) * 3 * dt;
    
    // Subtle tilt based on vertical mouse
    const tiltInfluence = this.isPresenting ? 0.02 : 0.1;
    this.group.rotation.x += (-this.mouseTarget.y * tiltInfluence - this.group.rotation.x) * 3 * dt;

    this.group.scale.lerp(new THREE.Vector3().setScalar(this.targetScale), 3 * dt);
    
    // Floating logic - stabilize if presenting
    const floatAmp = this.isPresenting ? config.robot.floatAmplitude * 0.3 : config.robot.floatAmplitude;
    this.group.position.y = this.targetPos.y + Math.sin(elapsedTime * config.robot.floatSpeed) * floatAmp;
    this.targetRotY += config.robot.idleRotateSpeed;

    // --- Wave segment Battery Charging effect ---
    if (this.waveMeshes && this.waveMeshes.length > 0) {
      // Creates a loop from 0 to 8 over time
      const chargeLevel = Math.floor((elapsedTime * 3.0) % 9.0); 
      
      this.waveMeshes.forEach((mat, i) => {
        if (!mat) return;
        
        // Reverse the index so wave_7 (i=6) lights up first, down to wave_1 (i=0)
        const reverseIndex = 6 - i;
        
        // If the reversed index is below the current charge level, it illuminates brightly
        if (reverseIndex < chargeLevel) {
          mat.emissiveIntensity = 20.0; // Fully charged segment (Extreme glow)
        } else {
          // Completely unlit segments (Dead dark green plastic/glass)
          mat.emissiveIntensity = 0.0; 
        }
      });
    }
  }
}
