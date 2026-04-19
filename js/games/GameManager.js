import { Snake } from './Snake.js';
import { leaderboardMgr } from '../managers/LeaderboardManager.js';

/**
 * GameManager — Controls the Arcade state and current game instance.
 * Updates the game and renders it to a single persistent offscreen canvas.
 */
export class GameManager {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 512;
    this.canvas.height = 512;
    this.ctx = this.canvas.getContext('2d');

    this.games = {
      snake: new Snake(this.canvas),
      tetris: { id: 'tetris', name: 'TETRIS (SOON)' },
      breakout: { id: 'breakout', name: 'BREAKOUT (SOON)' },
    };

    this.gameList = Object.keys(this.games);
    this.selectedIndex = 0;
    this.isMenuMode = true; // Start in menu mode
    this.currentGame = null;
    this.onUpdateCallback = null;
    this.onGameOver = null; // Exposed for 3D state changes
    this.onGameRestart = null; // Hook to detect when player restarts the game
  }

  /**
   * Start a specific game by ID.
   * @param {string} gameId - 'snake', 'tetris', etc.
   */
  loadGame(gameId) {
    if (this.currentGame) this.currentGame.stop();

    const game = this.games[gameId];
    if (game && game.start) {
      this.currentGame = game;
      this.currentGameId = gameId;
      this.currentGame.start();
      
      // Hook Game Over
      this.currentGame.onGameOver = () => {
        if (this.onGameOver) this.onGameOver();
      };
      
      // Hook Game Restart
      this.currentGame.onGameRestart = () => {
        if (this.onGameRestart) this.onGameRestart();
      };

      this.isMenuMode = false;
      
      // Báo tín hiệu ra App.js để Tắt nhạc nền nếu cần
      if (this.onGameLoad) this.onGameLoad(gameId);
      
      return true;
    }
    return false;
  }

  /**
   * Exit current game and return to 3D menu.
   */
  exitGame() {
    if (this.currentGame) {
      this.currentGame.stop();
      this.currentGame = null;
    }
    this.isMenuMode = true;
    
    // Báo tín hiệu ra App.js để Bật lại nhạc nền
    if (this.onGameExit) this.onGameExit();
  }

  /**
   * Main logic update.
   */
  update(dt) {
    if (this.isMenuMode) {
      this.renderMenu();
    } else if (this.currentGame) {
      this.currentGame.update(dt);
      this.currentGame.render();
    }

    if (this.onUpdateCallback) {
      this.onUpdateCallback(this.canvas);
    }
  }

  /**
   * Draw the interactive menu on the 512x512 canvas.
   */
  renderMenu() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = '#051005';
    ctx.fillRect(0, 0, w, h);

    // Scanlines
    ctx.fillStyle = 'rgba(0, 255, 80, 0.05)';
    for (let i = 0; i < h; i += 4) ctx.fillRect(0, i, w, 2);

    ctx.fillStyle = '#00ff50';
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SELECT GAME', w / 2, h * 0.25);

    ctx.font = '24px "Courier New", monospace';
    this.gameList.forEach((id, index) => {
      const isSelected = index === this.selectedIndex;
      const text = isSelected ? `> ${id.toUpperCase()} <` : id.toUpperCase();

      ctx.fillStyle = isSelected ? '#ffffff' : '#00ff50';
      ctx.fillText(text, w / 2, h * 0.45 + index * 50);

      if (isSelected) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00ff50';
      } else {
        ctx.shadowBlur = 0;
      }
    });
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(0, 255, 80, 0.7)';
    ctx.font = '16px "Courier New", monospace';
    ctx.fillText('ARROWS to Select • SPACE to Start', w / 2, h * 0.85);
    ctx.fillText('Press ESC to Quit Game', w / 2, h * 0.91);
  }

  /**
   * Dispatch keyboard events.
   */
  handleInput(code) {
    // 🚪 GLOBAL ESC: Return to menu regardless of mode
    if (code === 'Escape') {
      this.exitGame();
      return;
    }

    if (this.isMenuMode) {
      if (code === 'ArrowUp') {
        this.selectedIndex = (this.selectedIndex - 1 + this.gameList.length) % this.gameList.length;
      }
      if (code === 'ArrowDown') {
        this.selectedIndex = (this.selectedIndex + 1) % this.gameList.length;
      }
      if (code === 'Space' || code === 'Enter') {
        this.loadGame(this.gameList[this.selectedIndex]);
      }
    } else if (this.currentGame) {
      this.currentGame.onKeyDown(code);
    }
  }
}
