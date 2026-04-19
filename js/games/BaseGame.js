/**
 * BaseGame — Abstract class for all Arcade games.
 * Provides standard lifecycle methods: start, stop, update, render.
 */
export class BaseGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.isActive = false;
  }

  /** Called when the game is selected and starts */
  start() {
    this.isActive = true;
  }

  /** Called when the player exits the game */
  stop() {
    this.isActive = false;
  }

  /** Game logic update loop */
  update(dt) {}

  /** Drawing loop */
  render() {
    // Clear screen — default is black retro background
    this.ctx.fillStyle = '#051005';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  /** Handle keyboard input */
  onKeyDown(code) {}
}
