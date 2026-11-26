import { GameStates } from '../core/StateMachine.js';

export class HUDController {
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
