export const BrickTypes = Object.freeze({
  STANDARD: 'STANDARD',
  ARMORED: 'ARMORED',
  EXPLOSIVE: 'EXPLOSIVE',
  INDESTRUCTIBLE: 'INDESTRUCTIBLE',
});

const BRICK_PALETTE = {
  STANDARD: ['#22d3ee', '#38bdf8', '#818cf8', '#a78bfa'],
  ARMORED: ['#f59e0b', '#fbbf24'],
  EXPLOSIVE: ['#f43f5e'],
  INDESTRUCTIBLE: ['#64748b'],
};

export class Brick {
  constructor({ x, y, width, height, type = BrickTypes.STANDARD, hp = 1, row = 0 }) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.type = type;
    this.maxHp = type === BrickTypes.INDESTRUCTIBLE ? Infinity : hp;
    this.hp = this.maxHp;
    this.row = row;
    this.destroyed = false;
  }

  get isBreakable() {
    return this.type !== BrickTypes.INDESTRUCTIBLE;
  }

  get scoreValue() {
    if (this.type === BrickTypes.ARMORED) return 250;
    if (this.type === BrickTypes.EXPLOSIVE) return 300;
    return 100;
  }

  hit(damage = 1) {
    if (!this.isBreakable || this.destroyed) return false;
    this.hp -= damage;
    if (this.hp <= 0) {
      this.destroyed = true;
      return true;
    }
    return false;
  }

  render(ctx) {
    if (this.destroyed) return;
    ctx.save();
    let color = BRICK_PALETTE.STANDARD[this.row % BRICK_PALETTE.STANDARD.length];
    if (this.type === BrickTypes.ARMORED) {
      color = this.hp > 1 ? '#f59e0b' : '#fde047';
    } else if (this.type === BrickTypes.EXPLOSIVE) {
      color = '#f43f5e';
    } else if (this.type === BrickTypes.INDESTRUCTIBLE) {
      color = '#475569';
    }

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, this.height, 5);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1;
    ctx.stroke();

    if (this.type === BrickTypes.ARMORED && this.hp > 1) {
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(this.hp), this.x + this.width / 2, this.y + this.height / 2 + 4);
    } else if (this.type === BrickTypes.EXPLOSIVE) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✦', this.x + this.width / 2, this.y + this.height / 2 + 4);
    }
    ctx.restore();
  }
}
