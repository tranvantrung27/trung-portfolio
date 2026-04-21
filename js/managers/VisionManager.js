/**
 * VisionManager - Updated to use the core MediaPipe Hands logic provided by the user.
 * Uses finger counting (tip vs pip) for robust Open/Closed gesture detection.
 */
export class VisionManager {
  constructor() {
    this.hands = null;
    this.camera = null;
    this.video = null;
    this.handCanvas = null;
    this.handCtx = null;
    
    this.isActive = false;
    this.handDetected = false;
    this.isOpen = false;
    this.handX = 0.5;
    this.handY = 0.5;
    
    this.onGestureUpdate = null;
  }

  async init(videoElement, handCanvasElement) {
    this.video = videoElement;
    this.handCanvas = handCanvasElement;
    this.handCtx = this.handCanvas.getContext('2d');

    // Load Scripts dynamically if not present (to match user's logic)
    await this.loadDependencies();

    this.hands = new window.Hands({
      locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
    });

    this.hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.6
    });

    this.hands.onResults(results => this.processResults(results));

    this.camera = new window.Camera(this.video, {
      onFrame: async () => {
        if (this.isActive) await this.hands.send({ image: this.video });
      },
      width: 640, height: 480
    });
  }

  async loadDependencies() {
    const scripts = [
      'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
      'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js',
      'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js'
    ];
    
    for (const src of scripts) {
      if (!document.querySelector(`script[src="${src}"]`)) {
        await new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = src;
          script.crossOrigin = 'anonymous';
          script.onload = resolve;
          document.head.appendChild(script);
        });
      }
    }
  }

  processResults(results) {
    this.handCanvas.width = this.video.videoWidth || 320;
    this.handCanvas.height = this.video.videoHeight || 240;
    this.handCtx.clearRect(0, 0, this.handCanvas.width, this.handCanvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const lm = results.multiHandLandmarks[0];
      this.handDetected = true;

      // Draw skeleton in the small preview
      window.drawConnectors(this.handCtx, lm, window.HAND_CONNECTIONS, {
        color: 'rgba(200,140,255,0.75)', lineWidth: 1.5
      });
      window.drawLandmarks(this.handCtx, lm, {
        color: '#e879f9', lineWidth: 1, radius: 2.5
      });

      // Palm center (wrist + 4 MCP joints)
      const refs = [0, 5, 9, 13, 17];
      let px = 0, py = 0;
      refs.forEach(i => { px += lm[i].x; py += lm[i].y; });
      this.handX = 1 - px / refs.length; // Mirrored
      this.handY = py / refs.length;

      // Logic from user: tip.y < pip.y means extended
      const tipIds = [8, 12, 16, 20];
      const pipIds = [6, 10, 14, 18];
      let extended = 0;
      tipIds.forEach((tip, i) => {
        if (lm[tip].y < lm[pipIds[i]].y) extended++;
      });
      // Thumb check
      if (Math.abs(lm[4].x - lm[9].x) > 0.1) extended++;

      const nowOpen = extended >= 3;
      this.isOpen = nowOpen;
      
      // Call every frame so the sphere receives continuous handX and handY updates
      if (this.onGestureUpdate) {
        this.onGestureUpdate(this.isOpen ? 'PALM' : 'FIST');
      }
    } else {
      this.handDetected = false;
      if (this.onGestureUpdate) this.onGestureUpdate('NONE');
    }
  }

  async start() {
    this.isActive = true;
    await this.camera.start();
  }

  stop() {
    this.isActive = false;
    if (this.camera) this.camera.stop();
    if (this.video && this.video.srcObject) {
      const tracks = this.video.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      this.video.srcObject = null;
    }
  }
}
