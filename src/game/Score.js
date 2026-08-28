import { CONFIG } from '../config.js';

export class Score {
  constructor(winScore, deuce) {
    this.playerScore = 0;
    this.opponentScore = 0;
    this.winScore = winScore || CONFIG.scoring.defaultWinScore;
    this.deuce = deuce !== false;
  }

  reset() {
    this.playerScore = 0;
    this.opponentScore = 0;
  }

  addPoint(who, amount = 1) {
    if (who === 'player') this.playerScore += amount;
    else this.opponentScore += amount;
  }

  isDeuce() {
    if (!this.deuce) return false;
    return this.playerScore >= this.winScore - 1 && this.opponentScore >= this.winScore - 1;
  }

  checkWin() {
    const p = this.playerScore;
    const o = this.opponentScore;
    if (!this.deuce) {
      if (p >= this.winScore) return 'player';
      if (o >= this.winScore) return 'opponent';
      return null;
    }
    // Deuce: must win by 2
    if (p >= this.winScore && p - o >= 2) return 'player';
    if (o >= this.winScore && o - p >= 2) return 'opponent';
    return null;
  }

  get display() {
    return `${this.playerScore} : ${this.opponentScore}`;
  }
}
