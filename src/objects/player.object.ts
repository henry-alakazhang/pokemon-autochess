export class Player {
  // all public props for now
  // just using to store the money at the moment
  currentHP: number = 100;
  maxHP: number = 100;
  gold: number = 20;

  /**
   * Increases player gold from round win
   * @returns The amount of gold gained
   */
  winGold(): number {
    // TODO: calculate streaks etc.
    ++this.gold;
    return 1;
  }
}
