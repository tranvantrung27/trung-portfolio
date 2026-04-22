export class VoiceListener {
    constructor(onStart, onResult, onEnd) {
        // Kiểm tra trình duyệt có hỗ trợ không
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.error("[Voice] Trình duyệt không hỗ trợ Speech Recognition.");
            this.recognition = null;
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'vi-VN'; 
        this.recognition.interimResults = true; 
        this.recognition.continuous = false;

        this.isListening = false;

        // Callbacks
        this.onStart = onStart;
        this.onResult = onResult;
        this.onEnd = onEnd;

        this.initEvents();
    }

    initEvents() {
        if (!this.recognition) return;

        this.lastTranscript = '';
        this.gotResultOnce = false;

        this.recognition.onstart = () => {
            this.lastTranscript = '';
            this.gotResultOnce = false;
            console.log("[Voice] Đang nghe...");
            this.isListening = true;
            if (this.onStart) this.onStart();
        };

        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    this.triggerResult(transcript);
                } else {
                    interimTranscript += transcript;
                }
            }
            if (interimTranscript) {
                this.lastTranscript = interimTranscript;
            }
        };

        this.recognition.onerror = (event) => {
            console.error("[Voice] Lỗi nhận diện:", event.error);
            this.isListening = false;
            if (event.error === 'not-allowed') {
                alert("Bạn chưa cấp quyền cho Micro! Hãy bấm vào icon ổ khóa trên thanh địa chỉ và chọn Allow.");
            }
        };

        this.recognition.onend = () => {
            console.log("[Voice] Ngừng nghe.");
            this.isListening = false;
            
            // Nếu mic đã dừng mà chưa gửi kết quả Final, hãy dùng kết quả tạm thời cuối cùng
            if (!this.gotResultOnce && this.lastTranscript.trim().length > 0) {
                this.triggerResult(this.lastTranscript);
            }

            if (this.onEnd) this.onEnd();
        };
    }

    triggerResult(text) {
        if (this.gotResultOnce) return;
        this.gotResultOnce = true;
        console.log("[Voice] Nhận diện xong:", text);
        if (this.onResult) this.onResult(text);
    }

    start() {
        if (this.recognition && !this.isListening) {
            try {
                this.recognition.start();
            } catch (e) {
                console.warn("[Voice] Start error:", e);
            }
        }
    }

    stop() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }
}
