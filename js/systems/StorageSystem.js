import { GAME_CONFIG } from '../core/Config.js';

export class StorageSystem {
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
