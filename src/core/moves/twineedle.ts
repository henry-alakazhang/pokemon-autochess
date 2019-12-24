import { Move, MoveConfig } from '../move.model';

/**
 * Twineedle - Beedrill line's passive move
 *
 * Every N attack hits twice and poisons
 *
 * TODO: make it poison
 */
export const twineedle: Move = {
  displayName: 'Twineedle',
  type: 'active',
  range: 2,
  get description() {
    return `Every 3 / 2 / 1 attacks hits twice and poisons the target`;
  },
  use({ scene, user, target, onComplete }: MoveConfig) {
    const hitsToProc = [3, 2, 1];
    // hit once
    scene.basicAttack(user, target, () => {
      user.consecutiveAttacks++;
      // if 3rd attack, hit again
      if (user.consecutiveAttacks === hitsToProc[user.basePokemon.stage - 1]) {
        user.consecutiveAttacks = 0;
        scene.basicAttack(user, target);
      }
      // second attack animation is free, end immediately
      onComplete();
    });
  },
} as const;
