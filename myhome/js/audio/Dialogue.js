export class Dialogue {
    constructor() {
        this.container = document.getElementById('robot-dialogue');
        this.textElement = document.getElementById('dialogue-text');
        this.audioElement = document.getElementById('robot-audio');
        this.timeout = null;

        // Queue System
        this.audioQueue = [];
        this.isPlaying = false;
        this.fullText = "";

        // TTS Config
        this.pollTimeout = null;
        this.useEdgeTTS = true;
        this.edgeVoice = "vi-VN-HoaiMyNeural";
        this.wasUnlocked = false;
    }

    // "Mở khóa" âm thanh
    unlock() {
        if (this.audioElement) {
            this.audioElement.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
            this.audioElement.play().then(() => {
                this.wasUnlocked = true;
                console.log("[Dialogue] System Unlocked");
            }).catch(e => { });
        }
    }

    // Dừng tất cả
    stopAudio() {
        this.audioQueue = [];
        this.isPlaying = false;
        this.fullText = "";

        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.currentTime = 0;
            this.audioElement.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
        }
        if (this.typeInterval) {
            clearInterval(this.typeInterval);
            this.typeInterval = null;
        }
        window.speechSynthesis.cancel();
    }

    typeWriter(text, speed = 30) {
        if (!this.textElement) return;

        // Hiệu ứng đánh chữ nối tiếp vào fullText
        let i = 0;
        if (this.typeInterval) clearInterval(this.typeInterval);

        this.typeInterval = setInterval(() => {
            if (i < text.length) {
                this.textElement.textContent += text.charAt(i);
                i++;
            } else {
                clearInterval(this.typeInterval);
                this.typeInterval = null;
            }
        }, speed);
    }

    say(message, duration = 4000, shouldSpeak = true) {
        if (!this.container || !this.textElement) return;

        this.container.classList.add('active');

        // Cập nhật text hiển thị (tích lũy)
        if (this.fullText === "") {
            this.textElement.textContent = "";
        }
        this.typeWriter(message);
        this.fullText += message;

        if (shouldSpeak) {
            this.audioQueue.push(message);
            if (!this.isPlaying) {
                this.processQueue();
            }
        }

        // Tự động ẩn sau khi ngừng nói một khoảng thời gian
        if (this.timeout) clearTimeout(this.timeout);
        this.timeout = setTimeout(() => {
            if (!this.isPlaying && this.audioQueue.length === 0) {
                this.container.classList.remove('active');
                this.fullText = "";
            }
        }, duration);
    }

    async processQueue() {
        if (this.audioQueue.length === 0) {
            this.isPlaying = false;
            // Ẩn bong bóng thoại sau khi kết thúc chuỗi âm thanh (delay 3s để khách kịp đọc xong)
            if (this.timeout) clearTimeout(this.timeout);
            this.timeout = setTimeout(() => {
                if (!this.isPlaying && this.audioQueue.length === 0) {
                    this.container.classList.remove('active');
                    this.fullText = "";
                }
            }, 3000);
            return;
        }

        this.isPlaying = true;
        const text = this.audioQueue.shift();

        try {
            await this.speakEdge(text);
        } catch (e) {
            console.error("[Dialogue] Queue Error:", e);
        }

        this.processQueue();
    }

    async speakEdge(text) {
        return new Promise(async (resolve) => {
            if (!this.audioElement) return resolve();

            try {
                const cleanText = text
                    .replace(/[^\p{L}\p{N}\s.,!?]/gu, '')
                    .replace(/\s+/g, ' ')
                    .trim();

                if (!cleanText) return resolve();

                // Proxy đã tự động xử lý Fallback (Edge -> Google)
                const url = `/api/tts?text=${encodeURIComponent(cleanText)}&voice=${this.edgeVoice}`;
                const res = await fetch(url);
                if (!res.ok) throw new Error("TTS Proxy Error");

                const blob = await res.blob();
                const audioUrl = URL.createObjectURL(blob);
                
                this.audioElement.src = audioUrl;
                this.audioElement.onended = () => { resolve(); URL.revokeObjectURL(audioUrl); };
                this.audioElement.onerror = () => {
                    console.warn("[Audio] Error playing TTS");
                    resolve();
                };
                await this.audioElement.play();

            } catch (e) {
                console.warn("[Dialogue] Remote TTS Failed:", e);
                resolve(); // Không dùng Native Fallback nữa để giữ tính nhất quán
            }
        });
    }

    // Đã loại bỏ speakNative để đảm bảo chỉ dùng 1 loại giọng nói duy nhất
}
