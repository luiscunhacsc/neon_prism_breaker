import { GAME_CONFIG } from '../core/Config.js';

export const PowerUpTypes = Object.freeze({
  EXPAND: { code: 'EXP', color: '#06b6d4' },
  MULTIBALL: { code: 'MUL', color: '#8b5cf6' },
  LASER: { code: 'LSR', color: '#f43f5e' },
  SHIELD: { code: 'SHD', color: '#10b981' },
  SLOW: { code: 'SLW', color: '#f59e0b' },
});

const TYPE_KEYS = Object.keys(PowerUpTypes);

export class PowerUp {
  constructor(x, y, typeKey = null) {
    this.x = x;
    this.y = y;
    this.width = 42;
    this.height = 20;
    this.vy = GAME_CONFIG.POWERUP_FALL_SPEED;
    this.typeKey = typeKey || TYPE_KEYS[Math.floor(Math.random() * TYPE_KEYS.length)];
    this.meta = PowerUpTypes[this.typeKey];
    this.active = true;
  }

  update(dt, canvasHeight) {
    this.y += this.vy * dt;
    if (this.y > canvasHeight + 30) {
      this.active = false;
    }
  }

  render(ctx) {
    if (!this.active) return;
    ctx.save();
    ctx.fillStyle = this.meta.color;
    ctx.shadowColor = this.meta.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height, 10);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.meta.code, this.x, this.y + 4);
    ctx.restore();
  }
}
