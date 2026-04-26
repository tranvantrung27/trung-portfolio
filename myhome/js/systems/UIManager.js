import { gsap } from 'gsap';
import { Events } from '../core/EventManager.js';

export class UIManager {
    constructor() {
        this.overlay = document.getElementById('overlay');
        this.startButton = document.getElementById('start-button');
        this.crosshair = document.getElementById('crosshair');
        this.prompt = document.getElementById('interact-prompt');
        this.audioIndicator = document.getElementById('audio-indicator');
        
        this.init();
    }

    init() {
        if (this.startButton) {
            this.startButton.addEventListener('click', () => {
                Events.emit('UI_START_CLICKED');
            });
        }
        this.playEntranceAnimation();
    }

    playEntranceAnimation() {
        if (!this.overlay) return;
        
        const tl = gsap.timeline({ delay: 0.8 });
        tl.to('.welcome-title', { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out' })
          .to('.controls-grid', { opacity: 1, y: 0, duration: 1, ease: 'power2.out' }, '-=0.8')
          .to('#start-button', { opacity: 1, y: 0, duration: 0.8, ease: 'back.out(1.7)' }, '-=0.6');
    }

    showOverlay(show) {
        if (!this.overlay) return;
        if (show) {
            this.overlay.style.display = 'flex';
            gsap.to(this.overlay, { opacity: 1, duration: 0.5 });
        } else {
            gsap.to(this.overlay, { 
                opacity: 0, 
                duration: 0.5, 
                onComplete: () => this.overlay.style.display = 'none' 
            });
        }
    }

    setCrosshair(visible) {
        if (this.crosshair) {
            this.crosshair.style.display = visible ? 'block' : 'none';
        }
    }

    setPrompt(html) {
        if (!this.prompt) return;
        if (html) {
            this.prompt.style.display = 'flex';
            this.prompt.innerHTML = html;
        } else {
            this.prompt.style.display = 'none';
        }
    }

    updateAudioState(isRunning) {
        if (this.audioIndicator) {
            if (isRunning) this.audioIndicator.classList.add('on');
            else this.audioIndicator.classList.remove('on');
        }
    }
}
