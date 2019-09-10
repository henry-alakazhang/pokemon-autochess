export class Player {
  currentHP: number = 100;
  maxHP: number = 100;
  gold: number = 20;
  /** Consecutive win/loss streak */
  streak: number = 0;

  /**
   * Calculate streaks and award win gold
   * @param won True if the round was won by player
   */
  battleResult(won: boolean): void {
    if (won) {
      this.streak = Math.max(1, this.streak + 1);
      ++this.gold;
    } else {
      --this.currentHP; // TODO implement properly
      this.streak = Math.min(-1, this.streak - 1);
    }
  }

  /**
   * Increases player gold from round
   * @returns The amount of gold gained, including interest and streaks
   */
  gainRoundEndGold(): number {
    let goldGain = 1; // base gain
    goldGain += this.getInterest() + this.getStreakBonus();
    this.gold += goldGain;
    return goldGain;
  }

  getInterest(): number {
    return Math.min(5, Math.floor(this.gold / 10));
  }

  getStreakBonus(): number {
    // TODO: min/max cap the streaks for design/balance
    // right now gold gain is way too much
    return Math.max(0, Math.abs(this.streak) - 1);
  }
}
