import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, query, orderBy, limit, onSnapshot, 
  doc, setDoc, getDoc, updateDoc, increment, serverTimestamp,
  where, getCountFromServer
} from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { isProfane } from "../utils/profanity-filter.js";

/**
 * LeaderboardManager - Handles global high scores and play counts via Firebase.
 */
class LeaderboardManager {
  constructor() {
    this.firebaseConfig = { 
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
      measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
    };

    // Initialize Firebase
    this.app = initializeApp(this.firebaseConfig);
    this.db = getFirestore(this.app);
    this.auth = getAuth(this.app);
    
    this.user = null;
    this.scores = [];
    this.personalBest = 0;
    this.userRank = "--";
    this.playerName = null;
    this._initialized = false;

    // UI Elements
    this.ui = {
      panel: document.getElementById('arcade-leaderboard'),
      list: document.getElementById('leaderboard-list'),
      totalPlays: document.getElementById('total-plays'),
      userRow: document.getElementById('user-status-row'),
      modal: document.getElementById('score-modal'),
      nameInput: document.getElementById('player-name'),
      submitBtn: document.getElementById('btn-submit-score'),
      skipBtn: document.getElementById('btn-skip-score'),
      warning: document.getElementById('profanity-warning')
    };

    this.setupAuth();
    this.setupModal();
  }

  setupAuth() {
    onAuthStateChanged(this.auth, (user) => {
      this.user = user;
      if (user) {
        this.startListening();
        this.fetchUserScore();
      } else {
        signInAnonymously(this.auth).catch(err => console.error("Auth Error:", err));
      }
    });
  }

  setupModal() {
    this.ui.submitBtn?.addEventListener('click', () => this.handleSubmit());
    this.ui.skipBtn?.addEventListener('click', () => this.hideModal());
  }

  /**
   * Listen to real-time updates for top 10 and total plays.
   */
  startListening() {
    // 1. Top 10 Leaderboard
    const q = query(collection(this.db, "leaderboard"), orderBy("score", "desc"), limit(10));
    onSnapshot(q, (snapshot) => {
      this.scores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      this.render();
    });

    // 2. Global Stats
    const statsDoc = doc(this.db, "metadata", "global_stats");
    onSnapshot(statsDoc, (snapshot) => {
      if (snapshot.exists()) {
        this.ui.totalPlays.innerText = snapshot.data().totalPlays || 0;
      }
    });
  }

  async fetchUserScore() {
    if (!this.user) return;
    const userDoc = await getDoc(doc(this.db, "leaderboard", this.user.uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      this.personalBest = data.score || 0;
      this.playerName = data.name || null;
      
      // TÍNH TOÁN THỨ HẠNG THẬT (Tính xem có bao nhiêu người điểm cao hơn mình)
      const q = query(collection(this.db, "leaderboard"), where("score", ">", this.personalBest));
      const snapshot = await getCountFromServer(q);
      this.userRank = snapshot.data().count + 1;

      this.updateUserRow();
    } else {
      this.personalBest = 0;
      this.playerName = null;
      this.userRank = "--";
    }
  }

  /**
   * Record a play session. (Ensures only one increment per browser session to save Firebase quota)
   */
  incrementPlays() {
    const hasVisited = sessionStorage.getItem('arcade_session_recorded');
    if (hasVisited) return;

    const statsDoc = doc(this.db, "metadata", "global_stats");
    // Use increment to stay atomic
    setDoc(statsDoc, { totalPlays: increment(1) }, { merge: true })
      .then(() => {
        sessionStorage.setItem('arcade_session_recorded', 'true');
      })
      .catch(err => console.error("Increment plays failed:", err));
  }

  /**
   * Evaluates the new score and determines whether to show the modal or save silently.
   */
  async handleNewScore(score) {
    // Chỉ xử lý nếu điểm cao hơn kỷ lục cá nhân
    if (!this.user || score <= this.personalBest) return;

    this.pendingScore = score;

    if (this.playerName) {
      // Đã có tên -> Lưu ngầm luôn, không cần hỏi lại
      await this.saveScoreSilently(score);
    } else {
      // Chưa có tên -> Hiện bảng hỏi (Lần đầu tiên lọt top cá nhân)
      this.showSubmitModal();
    }
  }

  async saveScoreSilently(score) {
    if (!this.user || !this.playerName || score <= this.personalBest) return;
    try {
      const userRef = doc(this.db, "leaderboard", this.user.uid);
      await setDoc(userRef, {
        name: this.playerName,
        score: score,
        timestamp: serverTimestamp(),
        uid: this.user.uid
      }, { merge: true });
      this.personalBest = score;
      await this.fetchUserScore(); // Cập nhật lại thứ hạng thật
    } catch (err) {
      console.warn("Silent save failed:", err);
    }
  }

  /**
   * Show the score submission modal.
   */
  showSubmitModal() {
    // Xóa/Ẩn overlay Game Over cũ để tránh bị chồng chéo văn bản
    const gameOverOverlay = document.getElementById('jumpscare-overlay');
    if (gameOverOverlay) gameOverOverlay.style.display = 'none';
    
    this.ui.modal.classList.remove('hidden');
    this.ui.nameInput.focus();
  }

  hideModal() {
    this.ui.modal.classList.add('hidden');
    
    // DỌN DẸP JUMPSCARE & GAME OVER UI
    const gameOverOverlay = document.getElementById('jumpscare-overlay');
    if (gameOverOverlay) {
      gameOverOverlay.style.opacity = '0';
      setTimeout(() => gameOverOverlay.remove(), 400); // Fade out then remove
    }

    // Reset con rắn 3D
    if (window.portfolioApp && window.portfolioApp.arcade) {
      window.portfolioApp.arcade.resetJumpScare();
    }
  }

  async handleSubmit() {
    const name = this.ui.nameInput.value.trim().toUpperCase();
    
    if (name.length < 2) return;
    
    // Profanity Filter
    if (isProfane(name)) {
      this.ui.warning.classList.remove('hidden');
      return;
    }

    this.ui.warning.classList.add('hidden');
    
    try {
      if (this.user) {
        const userRef = doc(this.db, "leaderboard", this.user.uid);
        const userDoc = await getDoc(userRef);
        
        // Update only if score is higher
        if (!userDoc.exists() || this.pendingScore > (userDoc.data().score || 0)) {
          await setDoc(userRef, {
            name: name,
            score: this.pendingScore,
            timestamp: serverTimestamp(),
            uid: this.user.uid
          }, { merge: true });
          
          // Cập nhật state nội bộ
          this.playerName = name;
          this.personalBest = this.pendingScore;
          await this.fetchUserScore(); // Cập nhật lại thứ hạng thật
        }
      }
    } catch (err) {
      console.warn("Leaderboard save failed (probably rules):", err);
      // Vẫn cho ẩn modal để người dùng tiếp tục
    }

    this.hideModal();
  }

  render() {
    if (!this.ui.list) return;
    
    this.ui.list.innerHTML = this.scores.map((s, i) => `
      <div class="leaderboard-entry ${this.user && s.uid === this.user.uid ? 'active' : ''}">
        <span class="rank">#${i + 1}</span>
        <span class="name">${s.name}</span>
        <span class="score">${s.score}</span>
      </div>
    `).join('');

    // Update the persistent YOU row
    this.updateUserRow();
  }

  updateUserRow() {
    if (!this.ui.userRow || !this.user || !this.playerName) {
      if (this.ui.userRow) this.ui.userRow.classList.add('hidden');
      return;
    }
    
    this.ui.userRow.querySelector('.rank').innerText = `#${this.userRank}`;
    this.ui.userRow.querySelector('.name').innerText = `${this.playerName} (YOU)`;
    this.ui.userRow.querySelector('.score').innerText = this.personalBest;
    this.ui.userRow.classList.remove('hidden');
  }

  setVisible(visible) {
    if (visible) {
      this.ui.panel.classList.add('visible');
    } else {
      this.ui.panel.classList.remove('visible');
    }
  }
}

export const leaderboardMgr = new LeaderboardManager();
