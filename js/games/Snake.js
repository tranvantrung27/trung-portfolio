import { BaseGame } from './BaseGame.js';

/**
 * Snake game — Retro style for arcade.
 */
export class Snake extends BaseGame {
  constructor(canvas) {
    super(canvas);
    this.reset();
  }

  reset() {
    this.snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ];
    this.dir = { x: 1, y: 0 };
    this.nextDir = { x: 1, y: 0 };
    this.food = { x: 15, y: 15 };
    this.score = 0;
    this.moveTimer = 0;
    this.moveInterval = 0.12;
    this.gridCount = 20; // 20x20 grid
    this.gridSize = this.width / this.gridCount;
    this.isGameOver = false;

    // Kích hoạt Event Restart để App.js biết mà dọn dẹp Jumpscare
    if (this.onGameRestart) {
      this.onGameRestart();
    }
  }

  start() {
    super.start();
    this.reset();
  }

  onKeyDown(code) {
    if (this.isGameOver && code === 'Space') {
      this.reset();
      return;
    }

    if (code === 'ArrowUp' && this.dir.y !== 1) this.nextDir = { x: 0, y: -1 };
    if (code === 'ArrowDown' && this.dir.y !== -1) this.nextDir = { x: 0, y: 1 };
    if (code === 'ArrowLeft' && this.dir.x !== 1) this.nextDir = { x: -1, y: 0 };
    if (code === 'ArrowRight' && this.dir.x !== -1) this.nextDir = { x: 1, y: 0 };
  }

  update(dt) {
    if (!this.isActive || this.isGameOver) return;

    this.moveTimer += dt;
    if (this.moveTimer >= this.moveInterval) {
      this.moveTimer = 0;
      this.dir = this.nextDir;
      this.move();
    }
  }

  move() {
    // Wall wrapping logic
    const head = {
      x: (this.snake[0].x + this.dir.x + this.gridCount) % this.gridCount,
      y: (this.snake[0].y + this.dir.y + this.gridCount) % this.gridCount
    };

    // Self collision
    if (this.snake.some(p => p.x === head.x && p.y === head.y)) {
      this.isGameOver = true;
      if (this.onGameOver) this.onGameOver();
      return;
    }

    this.snake.unshift(head);

    // Food collision
    if (head.x === this.food.x && head.y === this.food.y) {
      this.score += 10;
      this.spawnFood();
      // Khắc nghiệt hơn: Tăng tốc độ nhanh hơn (rút ngắn thời gian nghỉ 6% mỗi trái)
      // Kịch kim ở mức 0.04 (Siêu tốc độ, dễ đâm tường)
      this.moveInterval = Math.max(0.04, this.moveInterval * 0.94);
    } else {
      this.snake.pop();
    }
  }

  spawnFood() {
    let newFood;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * this.gridCount),
        y: Math.floor(Math.random() * this.gridCount),
      };
      const isOnSnake = this.snake.some(p => p.x === newFood.x && p.y === newFood.y);
      if (!isOnSnake) break;
    }
    this.food = newFood;
  }

  render() {
    super.render();
    const ctx = this.ctx;
    const gs = this.gridSize;

    ctx.fillStyle = 'rgba(0, 255, 80, 0.02)';
    for (let i = 0; i < this.height; i += 8) ctx.fillRect(0, i, this.width, 2);

    // Food
    if (this.food) {
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ff3333';
      ctx.fillStyle = '#ff5555';

      const drawFood = (x, y) => {
        ctx.fillRect(x * gs + 2, y * gs + 2, gs - 4, gs - 4);
      };

      drawFood(this.food.x, this.food.y);

      // Seamless wrap rendering for food (just in case)
      if (this.food.x === 0) drawFood(this.gridCount, this.food.y);
      if (this.food.x === this.gridCount - 1) drawFood(-1, this.food.y);
      if (this.food.y === 0) drawFood(this.food.x, this.gridCount);
      if (this.food.y === this.gridCount - 1) drawFood(this.food.x, -1);

      ctx.shadowBlur = 0;
    }

    // Snake segments with seamless wrapping
    ctx.fillStyle = '#00ff50';
    this.snake.forEach((p, i) => {
      const isHead = i === 0;

      const drawSegment = (x, y) => {
        if (isHead) {
          ctx.shadowBlur = 6;
          ctx.shadowColor = '#00fff0';
        }

        ctx.fillRect(x * gs, y * gs, Math.ceil(gs), Math.ceil(gs));

        if (isHead) {
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#000';
          ctx.fillRect(x * gs + (gs * 0.25), y * gs + (gs * 0.25), gs * 0.2, gs * 0.2);
          ctx.fillStyle = '#00ff50';
        }
      };

      // Main draw
      drawSegment(p.x, p.y);

      // ghost draw for seamless wrap
      if (p.x === 0) drawSegment(this.gridCount, p.y);
      if (p.x === this.gridCount - 1) drawSegment(-1, p.y);
      if (p.y === 0) drawSegment(p.x, this.gridCount);
      if (p.y === this.gridCount - 1) drawSegment(p.x, -1);
    });

    // Score - Moved down significantly to avoid top bezel clipping
    ctx.fillStyle = '#00ff50';
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.fillText(`SCORE: ${this.score}`, 80, 100);

    if (this.isGameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.fillStyle = '#ff3333';
      ctx.font = 'bold 40px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', this.width / 2, this.height * 0.45);
      ctx.font = '20px "Courier New", monospace';
      ctx.fillStyle = '#fff';
      ctx.fillText('PRESS SPACE TO RESTART', this.width / 2, this.height * 0.55);
      ctx.textAlign = 'left';
    }
  }
}
