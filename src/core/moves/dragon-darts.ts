import { flatten, isDefined } from '../../helpers';
import {
  calculateDamage,
  Coords,
  getRandomTarget,
} from '../../scenes/game/combat/combat.helpers';
import { CombatBoard } from '../../scenes/game/combat/combat.scene';
import { shuffle } from '../../scenes/game/game.helpers';
import { Move, MoveConfig } from '../move.model';
import * as Tweens from '../tweens';

/**
 * Dragon Darts - Dreepy line's move
 *
 * Throws some Dreepys at random targets. Fires more with each use.
 */
const move = {
  displayName: 'Dragon Darts',
  type: 'active',
  cost: 4,
  startingPP: 2,
  damage: [175, 300, 500],
  defenseStat: 'defense',
  targetting: 'unit',
  get description() {
    return `{{user}} launches a Dreepy dart at a single random enemy, dealing ${this.damage.join(
      '/'
    )} damage. Fires an extra Dreepy with each use.`;
  },
  range: 99,
  getTarget(board: CombatBoard, user: Coords) {
    return getRandomTarget({
      board,
      user,
    });
  },
  async use({ scene, board, user, onComplete }: MoveConfig<'unit'>) {
    user.playAnimation('down');

    await Tweens.hop(scene, { targets: [user] });

    // targets: X random different enemies, with X increasing each cast.
    user.consecutiveAttacks++;
    const enemies = flatten(board)
      .filter(isDefined)
      .filter(pokemon => pokemon.side !== user.side);
    const targets = shuffle(enemies).slice(0, user.consecutiveAttacks);

    targets.forEach(target => {
      scene.fireProjectile(
        user,
        target,
        {
          key: 'dreepy',
          speed: 600,
          animation: 'dreepy--right',
          trajectory: 'bounceArc',
        },
        () => {
          const damage = calculateDamage(user, target, {
            damage: this.damage[user.basePokemon.stage - 1],
            defenseStat: this.defenseStat,
          });
          scene.causeDamage(user, target, damage);
        }
      );
    });
    onComplete();
  },
} as const;

export const dragonDarts: Move = move;
