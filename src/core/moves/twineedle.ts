import { Move, MoveConfig } from '../move.model';

/**
 * Twineedle - Beedrill line's passive move
 *
 * Every Nth attack hits twice
 */
const move = {
  displayName: 'Twineedle',
  type: 'active',
  // slight hack: this move is a move that "casts" every attack instead of triggering
  cost: 0,
  startingPP: 0,
  range: 3,
  damage: [66, 100, 150],
  targetting: 'unit',
  get description() {
    return `{{user}} strikes twice every second attack. The second hit deals ${this.damage.join(
      '/'
    )}% damage.`;
  },
  use({ scene, user, target, onComplete }: MoveConfig<'unit'>) {
    // hit once
    scene.basicAttack(user, target, {
      onComplete: () => {
        user.consecutiveAttacks++;
        // if nth attack, hit again
        if (user.consecutiveAttacks === 2) {
          user.consecutiveAttacks = 0;
          // hack: modify base attack very temporarily to increase damage lol
          const multi =
            user.basePokemon.stage === 1
              ? // -2 = 66%
                -2
              : user.basePokemon.stage === 2
                ? // +0 = 100%
                  0
                : // + 1 = 125%
                  +2;
          user.changeStats({ attack: multi }, 500);
          scene.basicAttack(user, target);
        }
        // second attack animation is free, end immediately
        onComplete();
      },
    });
  },
} as const;

export const twineedle: Move = move;
