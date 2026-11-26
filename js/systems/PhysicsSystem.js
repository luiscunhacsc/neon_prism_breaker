/**
 * Motor de física e deteção de colisões AABB-Círculo com reflexão angular controlada.
 */
export class PhysicsSystem {
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
