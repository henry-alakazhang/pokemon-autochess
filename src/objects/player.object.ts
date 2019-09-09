export class Player {
  // all public props for now
  // just using to store the money at the moment
  currentHP: number = 100;
  maxHP: number = 100;
  gold: number = 20;
  /** Consecutive win/loss streak */
  streak: number = 0;

  /**
   * Increases player gold from round
   * @param won True if the round was won by player
   * @returns The amount of gold gained, including interest and streaks
   */
  gainRoundEndGold(won: boolean): number {
    // TODO: min/max cap the streaks (design/balance - right now gold gain is way too much)
    // Interest is 10% rounded down
    const interest = Math.floor(this.gold / 10);
    let goldGain = 1; // base gain
    if (won) {
      this.streak = Math.max(0, this.streak + 1);
      ++goldGain;
    } else {
      this.streak = Math.min(0, this.streak - 1);
    }
    goldGain += interest + Math.max(0, Math.abs(this.streak) - 1);
    this.gold += goldGain;
    return goldGain;
  }
}
