/**
 * Configurações globais e constantes imutáveis do motor de jogo.
 * Princípio aplicado: Single Source of Truth & Separation of Concerns.
 */
export const GAME_CONFIG = Object.freeze({
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

export const DIFFICULTY_MULTIPLIERS = Object.freeze({
  casual: { speed: 0.85, score: 0.85 },
  normal: { speed: 1.0, score: 1.0 },
  veteran: { speed: 1.25, score: 1.35 },
});
