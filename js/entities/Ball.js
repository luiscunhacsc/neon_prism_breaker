import { GAME_CONFIG } from '../core/Config.js';

export class Ball {
  constructor(x, y, speed = GAME_CONFIG.BALL_BASE_SPEED) {
    this.x = x;
    this.y = y;
    this.radius = GAME_CONFIG.BALL_RADIUS;
    this.speed = speed;
    this.vx = 0;
    this.vy = 0;
    this.stuckToPaddle = true;
    this.trail = [];
  }

  launch(angleRad = -Math.PI / 3) {
    this.stuckToPaddle = false;
    this.vx = Math.cos(angleRad) * this.speed;
    this.vy = Math.sin(angleRad) * this.speed;
  }

  setSpeed(newSpeed) {
    const clamped = Math.max(260, Math.min(GAME_CONFIG.BALL_MAX_SPEED, newSpeed));
    const mag = Math.hypot(this.vx, this.vy) || 1;
    this.speed = clamped;
    this.vx = (this.vx / mag) * clamped;
    this.vy = (this.vy / mag) * clamped;
  }

  update(dt, paddle) {
    if (this.stuckToPaddle) {
      this.x = paddle.x + paddle.width / 2;
      this.y = paddle.y - this.radius - 2;
      return;
    }

    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 8) this.trail.shift();

    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  render(ctx) {
    ctx.save();
    for (let i = 0; i < this.trail.length; i++) {
      const alpha = ((i + 1) / this.trail.length) * 0.25;
      ctx.fillStyle = `rgba(56, 189, 248, ${alpha})`;
      ctx.beginPath();
      ctx.arc(this.trail[i].x, this.trail[i].y, this.radius * 0.75, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#f8fafc';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
