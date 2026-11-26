import { GAME_CONFIG } from '../core/Config.js';

export class Paddle {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.baseWidth = GAME_CONFIG.PADDLE_WIDTH;
    this.width = this.baseWidth;
    this.height = GAME_CONFIG.PADDLE_HEIGHT;
    this.x = (canvasWidth - this.width) / 2;
    this.y = canvasHeight - GAME_CONFIG.PADDLE_Y_OFFSET;
    this.speed = GAME_CONFIG.PADDLE_SPEED;
    this.hasLaser = false;
    this.laserTimer = 0;
    this.expandTimer = 0;
    this.shootCooldown = 0;
  }

  reset(canvasWidth) {
    this.width = this.baseWidth;
    this.x = (canvasWidth - this.width) / 2;
    this.hasLaser = false;
    this.laserTimer = 0;
    this.expandTimer = 0;
    this.shootCooldown = 0;
  }

  applyExpand(duration = 14) {
    this.width = Math.min(210, this.baseWidth * 1.48);
    this.expandTimer = duration;
    this.clampPosition();
  }

  applyLaser(duration = 12) {
    this.hasLaser = true;
    this.laserTimer = duration;
  }

  moveByKeyboard(dir, dt) {
    this.x += dir * this.speed * dt;
    this.clampPosition();
  }

  moveToPointer(targetX) {
    this.x = targetX - this.width / 2;
    this.clampPosition();
  }

  clampPosition() {
    this.x = Math.max(8, Math.min(this.canvasWidth - this.width - 8, this.x));
  }

  update(dt) {
    if (this.expandTimer > 0) {
      this.expandTimer -= dt;
      if (this.expandTimer <= 0) {
        this.width = this.baseWidth;
        this.clampPosition();
      }
    }
    if (this.laserTimer > 0) {
      this.laserTimer -= dt;
      if (this.laserTimer <= 0) this.hasLaser = false;
    }
    if (this.shootCooldown > 0) {
      this.shootCooldown -= dt;
    }
  }

  canShoot() {
    return this.hasLaser && this.shootCooldown <= 0;
  }

  triggerShoot() {
    this.shootCooldown = GAME_CONFIG.LASER_COOLDOWN;
    return [
      { x: this.x + 12, y: this.y - 8 },
      { x: this.x + this.width - 12, y: this.y - 8 },
    ];
  }

  render(ctx) {
    ctx.save();
    const grad = ctx.createLinearGradient(this.x, this.y, this.x + this.width, this.y);
    grad.addColorStop(0, '#06b6d4');
    grad.addColorStop(0.5, '#38bdf8');
    grad.addColorStop(1, '#2563eb');
    ctx.fillStyle = grad;
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, this.height, 8);
    ctx.fill();

    if (this.hasLaser) {
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(this.x + 8, this.y - 5, 6, 7);
      ctx.fillRect(this.x + this.width - 14, this.y - 5, 6, 7);
    }
    ctx.restore();
  }
}
