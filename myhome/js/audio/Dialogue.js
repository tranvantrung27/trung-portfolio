export class Dialogue {
    constructor() {
        this.container = document.getElementById('robot-dialogue');
        this.textElement = document.getElementById('dialogue-text');
        this.audioElement = document.getElementById('robot-audio'); // Get persistent element
        this.timeout = null;

        // FPT.AI Config
        this.fptKey = import.meta.env.VITE_FPT_API_KEY;
        this.pollTimeout = null;
        this.useFPT = true;
        this.fptVoice = "banmai";
        this.wasUnlocked = false;
    }

    // "Mở khóa" âm thanh
    unlock() {
        return; // TẠM ẨN 
        if (this.audioElement) {
            this.audioElement.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
            this.audioElement.play().then(() => {
                this.wasUnlocked = true;
                console.log("[Dialogue] System Unlocked");
            }).catch(e => {
                console.warn("[Dialogue] Tag Unlock failed (expected on re-clicks):", e);
            });
        }

        const silentUtterance = new SpeechSynthesisUtterance("Mon");
        silentUtterance.volume = 0;
        window.speechSynthesis.speak(silentUtterance);
    }

    // testSound() {
    //     this.stopAudio();
    //     const msg = "🔊 Đang kiểm tra âm thanh... (Nếu không nghe thấy tiếng Beep, hãy kiểm tra loa máy tính)";
    //     this.textElement.innerText = msg;
    //     this.container.classList.add('active');
    //
    //     if (this.audioElement) {
    //         this.audioElement.src = "https://www.soundjay.com/buttons/sounds/button-20.mp3";
    //         this.audioElement.play().then(() => {
    //             console.log("[Test] Sound played successfully");
    //         }).catch(e => {
    //             console.error("[Test] Play failed:", e);
    //             this.speak("Hệ thống âm thanh đang bị chặn. Vui lòng click vào màn hình.");
    //         });
    //     }
    //
    //     setTimeout(() => {
    //         if (this.textElement.innerText === msg) {
    //             this.container.classList.remove('active');
    //         }
    //     }, 5000);
    // }

// Dừng tất cả âm thanh
stopAudio() {
    if (this.pollTimeout) {
        clearTimeout(this.pollTimeout);
        this.pollTimeout = null;
    }
    if (this.audioElement) {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
        // Purge buffer using silent data URI to maintain element readiness
        this.audioElement.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
    }
    window.speechSynthesis.cancel();
}

say(message, duration = 4000, shouldSpeak = true) {
    return; // TẠM ẨN ĐỂ PUSH GIT
    if (!this.container || !this.textElement) return;

    if (this.timeout) {
        clearTimeout(this.timeout);
    }

    this.textElement.innerText = message;
    this.container.classList.add('active');

    if (shouldSpeak) {
        if (this.useFPT) {
            this.speakFPT(message);
        } else {
            this.speak(message);
        }
    }

    this.timeout = setTimeout(() => {
        this.container.classList.remove('active');
        this.timeout = null;
    }, duration);
}

// --- PHƯƠNG THỨC 1: HỆ THỐNG MẶC ĐỊNH ---
speak(text) {
    if (!('speechSynthesis' in window)) return;
    this.stopAudio();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';

    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find(v => v.lang.toLowerCase().includes('vi'));
    if (viVoice) utterance.voice = viVoice;

    window.speechSynthesis.speak(utterance);
}

    // --- PHƯƠNG THỨC 2: FPT.AI (Mặc định với Polling) ---
    async speakFPT(text) {
    if (!this.fptKey || !this.audioElement) return;

    try {
        this.stopAudio();

        const response = await fetch('https://api.fpt.ai/hmi/tts/v5', {
            method: 'POST',
            headers: {
                'api-key': this.fptKey,
                'voice': this.fptVoice,
                'speed': ''
            },
            body: text
        });

        const data = await response.json();

        if (data.async) {
            const audioUrl = data.async;
            let attempts = 0;
            const maxAttempts = 15;
            const originalText = this.textElement.innerText;

            const pollAndPlay = () => {
                attempts++;

                this.audioElement.oncanplay = null;
                this.audioElement.onerror = null;
                this.audioElement.src = audioUrl;

                this.audioElement.oncanplay = () => {
                    this.pollTimeout = null;
                    this.textElement.innerText = originalText;
                    this.audioElement.play().catch(e => {
                        console.warn("[FPT] Play blocked, falling back to TTS");
                        this.speak(text);
                    });
                };

                this.audioElement.onerror = () => {
                    if (attempts < maxAttempts) {
                        this.pollTimeout = setTimeout(pollAndPlay, 1000);
                    } else {
                        this.pollTimeout = null;
                        this.textElement.innerText = originalText;
                        this.speak(text);
                    }
                };

                this.audioElement.load();
            };

            pollAndPlay();
        } else {
            this.speak(text);
        }
    } catch (e) {
        this.speak(text);
    }
}
}
