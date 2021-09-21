import { Move, MoveConfig } from '../move.model';

/**
 * Twineedle - Beedrill line's passive move
 *
 * Every Nth attack hits twice
 */
const move = {
  displayName: 'Twineedle',
  type: 'active',
  range: 2,
  targetting: 'unit',
  get description() {
    return `{{user}} strikes twice every 3 / 2 / 1 attacks.`;
  },
  use({ scene, user, target, onComplete }: MoveConfig<'unit'>) {
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

export const twineedle: Move = move;
