/**
 * Sintetizador de efeitos sonoros procedurais via Web Audio API (zero dependências externas).
 */
export class AudioSystem {
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
