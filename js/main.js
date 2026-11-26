// js\core\Config.js
/**
 * Configurações globais e constantes imutáveis do motor de jogo.
 * Princípio aplicado: Single Source of Truth & Separation of Concerns.
 */
const GAME_CONFIG = Object.freeze({
  CANVAS_WIDTH: 900,
  CANVAS_HEIGHT: 620,
  FIXED_DT: 1 / 120,          // Passo fixo de física (120 Hz)
  MAX_FRAME_DT: 0.05,         // Limite anti-spiral-of-death
  INITIAL_LIVES: 3,
  MAX_LIVES: 5,
  PADDLE_WIDTH: 126,
  PADDLE_HEIGHT: 16,
  PADDLE_Y_OFFSET: 38,
  PADDLE_SPEED: 680,
  BALL_RADIUS: 8,
  BALL_BASE_SPEED: 430,
  BALL_MAX_SPEED: 760,
  POWERUP_FALL_SPEED: 165,
  POWERUP_DROP_CHANCE: 0.28,
  LASER_COOLDOWN: 0.35,
  COMBO_STEP: 0.25,
  MAX_COMBO: 4.0,
  STORAGE_KEY: 'neon_prism_breaker_v1_records',
});

const DIFFICULTY_MULTIPLIERS = Object.freeze({
  casual: { speed: 0.85, score: 0.85 },
  normal: { speed: 1.0, score: 1.0 },
  veteran: { speed: 1.25, score: 1.35 },
});


// js\core\EventBus.js
/**
 * Padrão Observer (Publish/Subscribe) para desacoplar o motor de física
 * dos sistemas de UI, Áudio, Partículas e Persistência.
 */
class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(eventName, handler) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }
    this.listeners.get(eventName).add(handler);
    return () => this.off(eventName, handler);
  }

  off(eventName, handler) {
    const handlers = this.listeners.get(eventName);
    if (handlers) handlers.delete(handler);
  }

  emit(eventName, payload = {}) {
    const handlers = this.listeners.get(eventName);
    if (!handlers) return;
    for (const handler of handlers) {
      handler(payload);
    }
  }
}


// js\core\StateMachine.js
/**
 * Padrão State Machine explícito para o ciclo de vida da aplicação.
 */
const GameStates = Object.freeze({
  MENU: 'MENU',
  READY: 'READY',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  LEVEL_CLEAR: 'LEVEL_CLEAR',
  GAME_OVER: 'GAME_OVER',
  VICTORY: 'VICTORY',
});

class GameStateMachine {
  constructor(eventBus, initialState = GameStates.MENU) {
    this.eventBus = eventBus;
    this.current = initialState;
  }

  transition(nextState, context = {}) {
    if (this.current === nextState) return;
    const previous = this.current;
    this.current = nextState;
    this.eventBus.emit('state:changed', { previous, current: nextState, context });
  }

  is(state) {
    return this.current === state;
  }
}


// js\entities\Brick.js
const BrickTypes = Object.freeze({
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

class Brick {
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


// js\entities\Ball.js

class Ball {
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


// js\entities\Paddle.js

class Paddle {
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


// js\entities\PowerUp.js

const PowerUpTypes = Object.freeze({
  EXPAND: { code: 'EXP', color: '#06b6d4' },
  MULTIBALL: { code: 'MUL', color: '#8b5cf6' },
  LASER: { code: 'LSR', color: '#f43f5e' },
  SHIELD: { code: 'SHD', color: '#10b981' },
  SLOW: { code: 'SLW', color: '#f59e0b' },
});

const TYPE_KEYS = Object.keys(PowerUpTypes);

class PowerUp {
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


// js\systems\PhysicsSystem.js
/**
 * Motor de física e deteção de colisões AABB-Círculo com reflexão angular controlada.
 */
class PhysicsSystem {
  constructor(eventBus, canvasWidth, canvasHeight) {
    this.eventBus = eventBus;
    this.width = canvasWidth;
    this.height = canvasHeight;
  }

  stepBall(ball, paddle, bricks, hasShield) {
    if (ball.stuckToPaddle) return { lost: false, shieldUsed: false };

    // Paredes laterais e superior
    if (ball.x - ball.radius <= 0) {
      ball.x = ball.radius;
      ball.vx = Math.abs(ball.vx);
      this.eventBus.emit('physics:wallHit');
    } else if (ball.x + ball.radius >= this.width) {
      ball.x = this.width - ball.radius;
      ball.vx = -Math.abs(ball.vx);
      this.eventBus.emit('physics:wallHit');
    }

    if (ball.y - ball.radius <= 0) {
      ball.y = ball.radius;
      ball.vy = Math.abs(ball.vy);
      this.eventBus.emit('physics:wallHit');
    }

    // Colisão com a plataforma (reflexão proporcional ao ponto de impacto)
    if (
      ball.vy > 0 &&
      this.#circleRectIntersect(ball.x, ball.y, ball.radius, paddle.x, paddle.y, paddle.width, paddle.height)
    ) {
      const hitOffset = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
      const clamped = Math.max(-0.92, Math.min(0.92, hitOffset));
      const bounceAngle = clamped * (Math.PI / 3); // Máx 60 graus
      ball.vx = Math.sin(bounceAngle) * ball.speed;
      ball.vy = -Math.cos(bounceAngle) * ball.speed;
      ball.y = paddle.y - ball.radius - 1;
      this.eventBus.emit('physics:paddleHit');
    }

    // Colisão com blocos
    for (const brick of bricks) {
      if (brick.destroyed) continue;
      if (this.#circleRectIntersect(ball.x, ball.y, ball.radius, brick.x, brick.y, brick.width, brick.height)) {
        this.#resolveBrickBounce(ball, brick);
        this.eventBus.emit('physics:brickHit', { brick, x: ball.x, y: ball.y });
        break;
      }
    }

    // Limite inferior (barreira ou perda da bola)
    if (ball.y - ball.radius > this.height) {
      if (hasShield) {
        ball.y = this.height - ball.radius - 6;
        ball.vy = -Math.abs(ball.vy);
        this.eventBus.emit('physics:shieldSaved');
        return { lost: false, shieldUsed: true };
      }
      return { lost: true, shieldUsed: false };
    }

    return { lost: false, shieldUsed: false };
  }

  checkPowerUpCatch(powerUp, paddle) {
    return (
      powerUp.x + powerUp.width / 2 >= paddle.x &&
      powerUp.x - powerUp.width / 2 <= paddle.x + paddle.width &&
      powerUp.y + powerUp.height / 2 >= paddle.y &&
      powerUp.y - powerUp.height / 2 <= paddle.y + paddle.height
    );
  }

  checkLaserBrickHit(laser, brick) {
    return (
      !brick.destroyed &&
      laser.x >= brick.x &&
      laser.x <= brick.x + brick.width &&
      laser.y >= brick.y &&
      laser.y <= brick.y + brick.height
    );
  }

  #circleRectIntersect(cx, cy, r, rx, ry, rw, rh) {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return dx * dx + dy * dy <= r * r;
  }

  #resolveBrickBounce(ball, brick) {
    const overlapLeft = ball.x + ball.radius - brick.x;
    const overlapRight = brick.x + brick.width - (ball.x - ball.radius);
    const overlapTop = ball.y + ball.radius - brick.y;
    const overlapBottom = brick.y + brick.height - (ball.y - ball.radius);
    const minOverlapX = Math.min(overlapLeft, overlapRight);
    const minOverlapY = Math.min(overlapTop, overlapBottom);

    if (minOverlapX < minOverlapY) {
      ball.vx = -ball.vx;
    } else {
      ball.vy = -ball.vy;
    }
  }
}


// js\systems\AudioSystem.js
/**
 * Sintetizador de efeitos sonoros procedurais via Web Audio API (zero dependências externas).
 */
class AudioSystem {
  constructor(eventBus) {
    this.muted = false;
    this.ctx = null;

    eventBus.on('physics:paddleHit', () => this.playTone(420, 0.06, 'triangle'));
    eventBus.on('physics:wallHit', () => this.playTone(260, 0.04, 'sine'));
    eventBus.on('brick:destroyed', ({ combo }) => this.playTone(520 + combo * 65, 0.09, 'sawtooth'));
    eventBus.on('powerup:collected', () => this.playChord([587.33, 880], 0.14));
    eventBus.on('life:lost', () => this.playTone(150, 0.28, 'sawtooth'));
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  playTone(freq, duration = 0.08, type = 'sine') {
    if (this.muted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  playChord(freqs, duration) {
    freqs.forEach((f, idx) => setTimeout(() => this.playTone(f, duration, 'triangle'), idx * 45));
  }
}


// js\systems\ParticleSystem.js
class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  burst(x, y, color = '#38bdf8', count = 14) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const speed = 70 + Math.random() * 190;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.45 + Math.random() * 0.25,
        maxLife: 0.7,
        color,
        size: 2.5 + Math.random() * 2.5,
      });
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 220 * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  render(ctx) {
    ctx.save();
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.restore();
  }
}


// js\systems\StorageSystem.js

class StorageSystem {
  constructor() {
    this.key = GAME_CONFIG.STORAGE_KEY;
  }

  getRecords() {
    try {
      const raw = localStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  getHighScore() {
    const records = this.getRecords();
    return records.length > 0 ? records[0].score : 0;
  }

  saveScore({ score, level, difficulty }) {
    const records = this.getRecords();
    records.push({
      score: Math.round(score),
      level,
      difficulty,
      date: new Date().toLocaleDateString('pt-PT'),
    });
    records.sort((a, b) => b.score - a.score);
    const top5 = records.slice(0, 5);
    try {
      localStorage.setItem(this.key, JSON.stringify(top5));
    } catch {
      // Falha silenciosa em modo privado restrito
    }
    return top5;
  }
}


// js\levels\LevelManager.js

/**
 * Fábrica orientada a dados (Data-Driven Level Design) para geração de níveis.
 * Códigos: '.' vazio, 'S' normal, 'A' blindado (2 HP), 'H' pesado (3 HP), 'E' explosivo, 'X' indestrutível.
 */
const LEVEL_BLUEPRINTS = [
  {
    name: 'Prisma Inicial',
    grid: [
      'SSSSSSSSSS',
      'SSSSSSSSSS',
      'S..S..S..S',
      'SSSSSSSSSS',
    ],
  },
  {
    name: 'Fortaleza Ciano',
    grid: [
      'A.A.A.A.A.',
      'SSSSSSSSSS',
      'S.E.SS.E.S',
      'SSSSSSSSSS',
      'X..S..S..X',
    ],
  },
  {
    name: 'Núcleo Reativo',
    grid: [
      'HHHHHHHHHH',
      'A.E.AA.E.A',
      'SS.XXXX.SS',
      'A.E.AA.E.A',
      'SSSSSSSSSS',
    ],
  },
  {
    name: 'Cidadela Prismática',
    grid: [
      'X.HHHHHH.X',
      'AEEAAAAEEA',
      'SSSSSSSSSS',
      'X.A.EE.A.X',
      'HHHHHHHHHH',
    ],
  },
];

class LevelManager {
  constructor(canvasWidth) {
    this.canvasWidth = canvasWidth;
    this.totalLevels = LEVEL_BLUEPRINTS.length;
  }

  buildLevel(levelNumber) {
    const idx = Math.max(0, Math.min(this.totalLevels - 1, levelNumber - 1));
    const blueprint = LEVEL_BLUEPRINTS[idx];
    const cols = blueprint.grid[0].length;
    const paddingX = 48;
    const gap = 8;
    const brickWidth = (this.canvasWidth - paddingX * 2 - gap * (cols - 1)) / cols;
    const brickHeight = 24;
    const startY = 64;
    const bricks = [];

    blueprint.grid.forEach((rowStr, r) => {
      [...rowStr].forEach((cell, c) => {
        if (cell === '.') return;
        const x = paddingX + c * (brickWidth + gap);
        const y = startY + r * (brickHeight + gap);

        let type = BrickTypes.STANDARD;
        let hp = 1;
        if (cell === 'A') { type = BrickTypes.ARMORED; hp = 2; }
        else if (cell === 'H') { type = BrickTypes.ARMORED; hp = 3; }
        else if (cell === 'E') { type = BrickTypes.EXPLOSIVE; hp = 1; }
        else if (cell === 'X') { type = BrickTypes.INDESTRUCTIBLE; hp = Infinity; }

        bricks.push(new Brick({ x, y, width: brickWidth, height: brickHeight, type, hp, row: r }));
      });
    });

    return { name: blueprint.name, bricks };
  }
}


// js\ui\HUDController.js

class HUDController {
  constructor(eventBus, callbacks) {
    this.callbacks = callbacks;
    this.scoreEl = document.getElementById('hud-score');
    this.highScoreEl = document.getElementById('hud-highscore');
    this.levelEl = document.getElementById('hud-level');
    this.comboEl = document.getElementById('hud-combo');
    this.livesEl = document.getElementById('hud-lives');

    this.overlays = {
      menu: document.getElementById('overlay-menu'),
      help: document.getElementById('overlay-help'),
      pause: document.getElementById('overlay-pause'),
      gameover: document.getElementById('overlay-gameover'),
    };

    this.#bindButtons();
    this.#subscribeEvents(eventBus);
  }

  #bindButtons() {
    document.getElementById('btn-start').addEventListener('click', () => {
      const diff = document.getElementById('select-difficulty').value;
      this.callbacks.onStartGame(diff);
    });
    document.getElementById('btn-controls').addEventListener('click', () => this.showOverlay('help'));
    document.getElementById('btn-close-help').addEventListener('click', () => this.showOverlay('menu'));
    document.getElementById('btn-pause').addEventListener('click', () => this.callbacks.onTogglePause());
    document.getElementById('btn-resume').addEventListener('click', () => this.callbacks.onTogglePause());
    document.getElementById('btn-restart').addEventListener('click', () => this.callbacks.onRestart());
    document.getElementById('btn-play-again').addEventListener('click', () => this.callbacks.onRestart());
    document.getElementById('btn-to-menu').addEventListener('click', () => this.callbacks.onReturnMenu());

    const audioBtn = document.getElementById('btn-audio');
    audioBtn.addEventListener('click', () => {
      const muted = this.callbacks.onToggleMute();
      audioBtn.textContent = muted ? '🔇' : '🔊';
    });
  }

  #subscribeEvents(eventBus) {
    eventBus.on('hud:update', ({ score, highScore, level, combo, lives }) => {
      this.scoreEl.textContent = String(Math.round(score)).padStart(6, '0');
      this.highScoreEl.textContent = String(Math.round(highScore)).padStart(6, '0');
      this.levelEl.textContent = String(level).padStart(2, '0');
      this.comboEl.textContent = `x${combo.toFixed(1)}`;
      this.livesEl.textContent = '♥'.repeat(Math.max(0, lives));
    });

    eventBus.on('state:changed', ({ current, context }) => {
      this.hideAllOverlays();
      if (current === GameStates.MENU) {
        this.renderLeaderboard(context.records || []);
        this.showOverlay('menu');
      } else if (current === GameStates.PAUSED) {
        this.showOverlay('pause');
      } else if (current === GameStates.GAME_OVER || current === GameStates.VICTORY) {
        document.getElementById('gameover-title').textContent =
          current === GameStates.VICTORY ? 'VITÓRIA PRISMÁTICA!' : 'FIM DE JOGO';
        document.getElementById('gameover-summary').textContent =
          current === GameStates.VICTORY
            ? 'Todos os níveis foram concluídos com sucesso.'
            : 'Ficou sem vidas disponíveis.';
        document.getElementById('gameover-stats').innerHTML = `
          <div><strong>Pontuação Final:</strong> ${Math.round(context.score || 0)}</div>
          <div><strong>Recorde:</strong> ${Math.round(context.highScore || 0)}</div>
          <div><strong>Nível Alcançado:</strong> ${context.level || 1}</div>
          <div><strong>Blocos Destruídos:</strong> ${context.bricksDestroyed || 0}</div>
        `;
        this.showOverlay('gameover');
      }
    });
  }

  renderLeaderboard(records) {
    const box = document.getElementById('highscores-preview');
    if (!records.length) {
      box.textContent = 'Ainda sem recordes registados neste navegador.';
      return;
    }
    const items = records
      .slice(0, 3)
      .map((r, i) => `#${i + 1} — ${r.score} pts (Nível ${r.level}, ${r.difficulty})`)
      .join(' • ');
    box.textContent = `Top Recordes: ${items}`;
  }

  showOverlay(key) {
    this.hideAllOverlays();
    if (this.overlays[key]) this.overlays[key].classList.add('active');
  }

  hideAllOverlays() {
    Object.values(this.overlays).forEach((el) => el.classList.remove('active'));
  }
}


// js\main.js

class NeonPrismBreakerApp {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    this.eventBus = new EventBus();
    this.stateMachine = new GameStateMachine(this.eventBus, GameStates.MENU);
    this.physics = new PhysicsSystem(this.eventBus, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
    this.audio = new AudioSystem(this.eventBus);
    this.particles = new ParticleSystem();
    this.storage = new StorageSystem();
    this.levels = new LevelManager(GAME_CONFIG.CANVAS_WIDTH);

    this.paddle = new Paddle(GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
    this.balls = [];
    this.bricks = [];
    this.powerUps = [];
    this.lasers = [];

    this.difficulty = 'normal';
    this.score = 0;
    this.highScore = this.storage.getHighScore();
    this.level = 1;
    this.lives = GAME_CONFIG.INITIAL_LIVES;
    this.combo = 1.0;
    this.bricksDestroyed = 0;
    this.hasShield = false;
    this.levelBannerTimer = 0;
    this.levelName = '';

    this.keys = { left: false, right: false };
    this.accumulator = 0;
    this.lastTimestamp = 0;

    this.hud = new HUDController(this.eventBus, {
      onStartGame: (diff) => this.startNewGame(diff),
      onTogglePause: () => this.togglePause(),
      onRestart: () => this.startNewGame(this.difficulty),
      onReturnMenu: () => this.returnToMenu(),
      onToggleMute: () => this.audio.toggleMute(),
    });

    this.#bindDomainEvents();
    this.#bindInputs();
    this.returnToMenu();
    requestAnimationFrame((ts) => this.#loop(ts));
  }

  #bindDomainEvents() {
    this.eventBus.on('physics:brickHit', ({ brick, x, y }) => {
      const destroyed = brick.hit(1);
      if (destroyed) {
        this.#onBrickDestroyed(brick, x, y);
      } else {
        this.particles.burst(x, y, '#fbbf24', 6);
      }
    });

    this.eventBus.on('physics:paddleHit', () => {
      this.combo = 1.0;
      this.#syncHUD();
    });
  }

  #onBrickDestroyed(brick, x, y) {
    this.bricksDestroyed += 1;
    const diffFactor = DIFFICULTY_MULTIPLIERS[this.difficulty].score;
    this.score += brick.scoreValue * this.combo * diffFactor;
    this.combo = Math.min(GAME_CONFIG.MAX_COMBO, this.combo + GAME_CONFIG.COMBO_STEP);
    if (this.score > this.highScore) this.highScore = this.score;

    this.particles.burst(brick.x + brick.width / 2, brick.y + brick.height / 2, '#38bdf8', 16);
    this.eventBus.emit('brick:destroyed', { combo: this.combo });

    if (brick.type === BrickTypes.EXPLOSIVE) {
      this.#detonateNeighbors(brick);
    }

    if (Math.random() < GAME_CONFIG.POWERUP_DROP_CHANCE) {
      this.powerUps.push(new PowerUp(brick.x + brick.width / 2, brick.y + brick.height / 2));
    }

    this.#syncHUD();
    this.#checkLevelClear();
  }

  #detonateNeighbors(origin) {
    const cx = origin.x + origin.width / 2;
    const cy = origin.y + origin.height / 2;
    for (const other of this.bricks) {
      if (other.destroyed || !other.isBreakable) continue;
      const ox = other.x + other.width / 2;
      const oy = other.y + other.height / 2;
      if (Math.hypot(cx - ox, cy - oy) <= 115) {
        if (other.hit(2)) {
          this.bricksDestroyed += 1;
          this.score += other.scoreValue;
          this.particles.burst(ox, oy, '#f43f5e', 12);
        }
      }
    }
  }

  #bindInputs() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = true;
      if (e.key === ' ' || e.key === 'Enter') this.#handlePrimaryAction();
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') this.togglePause();
      if (e.key === 'm' || e.key === 'M') {
        const muted = this.audio.toggleMute();
        document.getElementById('btn-audio').textContent = muted ? '🔇' : '🔊';
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = false;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (!this.stateMachine.is(GameStates.PLAYING) && !this.stateMachine.is(GameStates.READY)) return;
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = GAME_CONFIG.CANVAS_WIDTH / rect.width;
      this.paddle.moveToPointer((e.clientX - rect.left) * scaleX);
    });

    this.canvas.addEventListener('click', () => this.#handlePrimaryAction());
  }

  #handlePrimaryAction() {
    if (this.stateMachine.is(GameStates.READY)) {
      this.balls.forEach((b) => { if (b.stuckToPaddle) b.launch(); });
      this.stateMachine.transition(GameStates.PLAYING);
    } else if (this.stateMachine.is(GameStates.PLAYING) && this.paddle.canShoot()) {
      const muzzles = this.paddle.triggerShoot();
      muzzles.forEach((m) => this.lasers.push({ x: m.x, y: m.y, vy: -640 }));
      this.audio.playTone(880, 0.05, 'square');
    }
  }

  startNewGame(difficulty = 'normal') {
    this.difficulty = difficulty;
    this.score = 0;
    this.level = 1;
    this.lives = GAME_CONFIG.INITIAL_LIVES;
    this.combo = 1.0;
    this.bricksDestroyed = 0;
    this.#loadLevel(this.level);
  }

  returnToMenu() {
    const records = this.storage.getRecords();
    this.stateMachine.transition(GameStates.MENU, { records });
  }

  togglePause() {
    if (this.stateMachine.is(GameStates.PLAYING)) {
      this.stateMachine.transition(GameStates.PAUSED);
    } else if (this.stateMachine.is(GameStates.PAUSED)) {
      this.stateMachine.transition(GameStates.PLAYING);
    }
  }

  #loadLevel(levelNum) {
    const built = this.levels.buildLevel(levelNum);
    this.levelName = built.name;
    this.bricks = built.bricks;
    this.powerUps = [];
    this.lasers = [];
    this.hasShield = false;
    this.levelBannerTimer = 2.2;
    this.#resetBallAndPaddle();
    this.#syncHUD();
    this.stateMachine.transition(GameStates.READY);
  }

  #resetBallAndPaddle() {
    this.paddle.reset(GAME_CONFIG.CANVAS_WIDTH);
    const speed = GAME_CONFIG.BALL_BASE_SPEED * DIFFICULTY_MULTIPLIERS[this.difficulty].speed;
    const ball = new Ball(this.paddle.x + this.paddle.width / 2, this.paddle.y - 10, speed);
    this.balls = [ball];
  }

  #checkLevelClear() {
    const remaining = this.bricks.some((b) => b.isBreakable && !b.destroyed);
    if (!remaining) {
      if (this.level < this.levels.totalLevels) {
        this.level += 1;
        this.#loadLevel(this.level);
      } else {
        this.storage.saveScore({ score: this.score, level: this.level, difficulty: this.difficulty });
        this.stateMachine.transition(GameStates.VICTORY, {
          score: this.score,
          highScore: this.highScore,
          level: this.level,
          bricksDestroyed: this.bricksDestroyed,
        });
      }
    }
  }

  #applyPowerUp(typeKey) {
    this.eventBus.emit('powerup:collected', { typeKey });
    if (typeKey === 'EXPAND') {
      this.paddle.applyExpand();
    } else if (typeKey === 'LASER') {
      this.paddle.applyLaser();
    } else if (typeKey === 'SHIELD') {
      this.hasShield = true;
    } else if (typeKey === 'SLOW') {
      this.balls.forEach((b) => b.setSpeed(b.speed * 0.8));
    } else if (typeKey === 'MULTIBALL' && this.balls.length > 0) {
      const ref = this.balls[0];
      [-0.45, 0.45].forEach((offsetAngle) => {
        const clone = new Ball(ref.x, ref.y, ref.speed);
        clone.stuckToPaddle = false;
        const baseAngle = Math.atan2(ref.vy, ref.vx) + offsetAngle;
        clone.vx = Math.cos(baseAngle) * ref.speed;
        clone.vy = Math.sin(baseAngle) * ref.speed;
        this.balls.push(clone);
      });
    }
  }

  #updateFixed(dt) {
    if (this.levelBannerTimer > 0) this.levelBannerTimer -= dt;
    this.particles.update(dt);

    if (!this.stateMachine.is(GameStates.PLAYING) && !this.stateMachine.is(GameStates.READY)) return;

    const dir = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
    if (dir !== 0) this.paddle.moveByKeyboard(dir, dt);
    this.paddle.update(dt);

    // Atualizar bolas
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];
      b.update(dt, this.paddle);
      const result = this.physics.stepBall(b, this.paddle, this.bricks, this.hasShield);
      if (result.shieldUsed) this.hasShield = false;
      if (result.lost) this.balls.splice(i, 1);
    }

    if (this.balls.length === 0 && this.stateMachine.is(GameStates.PLAYING)) {
      this.lives -= 1;
      this.combo = 1.0;
      this.eventBus.emit('life:lost');
      this.#syncHUD();
      if (this.lives <= 0) {
        this.storage.saveScore({ score: this.score, level: this.level, difficulty: this.difficulty });
        this.stateMachine.transition(GameStates.GAME_OVER, {
          score: this.score,
          highScore: this.highScore,
          level: this.level,
          bricksDestroyed: this.bricksDestroyed,
        });
      } else {
        this.#resetBallAndPaddle();
        this.stateMachine.transition(GameStates.READY);
      }
    }

    // Atualizar Power-Ups
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const p = this.powerUps[i];
      p.update(dt, GAME_CONFIG.CANVAS_HEIGHT);
      if (p.active && this.physics.checkPowerUpCatch(p, this.paddle)) {
        p.active = false;
        this.#applyPowerUp(p.typeKey);
      }
      if (!p.active) this.powerUps.splice(i, 1);
    }

    // Atualizar Lasers
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const l = this.lasers[i];
      l.y += l.vy * dt;
      if (l.y < 0) {
        this.lasers.splice(i, 1);
        continue;
      }
      for (const brick of this.bricks) {
        if (this.physics.checkLaserBrickHit(l, brick)) {
          this.lasers.splice(i, 1);
          if (brick.hit(1)) this.#onBrickDestroyed(brick, l.x, l.y);
          break;
        }
      }
    }
  }

  #render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);

    // Grelha subtil de fundo
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < GAME_CONFIG.CANVAS_WIDTH; x += 45) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, GAME_CONFIG.CANVAS_HEIGHT); ctx.stroke();
    }

    // Barreira inferior se ativa
    if (this.hasShield) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.55)';
      ctx.fillRect(0, GAME_CONFIG.CANVAS_HEIGHT - 6, GAME_CONFIG.CANVAS_WIDTH, 6);
    }

    this.bricks.forEach((b) => b.render(ctx));
    this.powerUps.forEach((p) => p.render(ctx));
    this.paddle.render(ctx);
    this.balls.forEach((b) => b.render(ctx));
    this.particles.render(ctx);

    // Lasers
    ctx.fillStyle = '#f43f5e';
    this.lasers.forEach((l) => ctx.fillRect(l.x - 2, l.y, 4, 14));

    if (this.levelBannerTimer > 0 && (this.stateMachine.is(GameStates.READY) || this.stateMachine.is(GameStates.PLAYING))) {
      ctx.save();
      ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`NÍVEL ${this.level}: ${this.levelName.toUpperCase()}`, GAME_CONFIG.CANVAS_WIDTH / 2, 340);
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('Prima ESPAÇO ou clique para lançar a esfera', GAME_CONFIG.CANVAS_WIDTH / 2, 368);
      ctx.restore();
    }
  }

  #syncHUD() {
    this.eventBus.emit('hud:update', {
      score: this.score,
      highScore: this.highScore,
      level: this.level,
      combo: this.combo,
      lives: this.lives,
    });
  }

  #loop(timestamp) {
    if (!this.lastTimestamp) this.lastTimestamp = timestamp;
    const frameDt = Math.min(GAME_CONFIG.MAX_FRAME_DT, (timestamp - this.lastTimestamp) / 1000);
    this.lastTimestamp = timestamp;

    this.accumulator += frameDt;
    while (this.accumulator >= GAME_CONFIG.FIXED_DT) {
      this.#updateFixed(GAME_CONFIG.FIXED_DT);
      this.accumulator -= GAME_CONFIG.FIXED_DT;
    }

    this.#render();
    requestAnimationFrame((ts) => this.#loop(ts));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new NeonPrismBreakerApp();
});
