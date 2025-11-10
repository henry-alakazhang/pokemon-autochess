import { flatten, isDefined } from '../../helpers';
import {
  Coords,
  getRandomTarget,
} from '../../scenes/game/combat/combat.helpers';
import { CombatBoard } from '../../scenes/game/combat/combat.scene';
import { shuffle } from '../../scenes/game/game.helpers';
import { Move, MoveConfig } from '../move.model';
import * as Tweens from '../tweens';

const defenseStat = 'defense' as const;
const damage = [200, 275, 400];

/**
 * Dragon Darts - Dreepy line's move
 *
 * Throws some Dreepys at random targets. Fires more with each use.
 */
export const dragonDarts = {
  displayName: 'Dragon Darts',
  type: 'active',
  cost: 5,
  startingPP: 2,
  defenseStat,
  targetting: 'unit',
  get description() {
    return `{{user}} launches a Dreepy dart at a single random enemy, dealing ${damage.join(
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

    // targets: X random enemies, with X increasing each cast.
    user.consecutiveAttacks++;
    const enemies = flatten(board)
      .filter(isDefined)
      .filter((pokemon) => pokemon.side !== user.side);
    // each enemy can be hit up to twice
    const targets = shuffle([...enemies, ...enemies]).slice(
      0,
      user.consecutiveAttacks
    );

    targets.forEach((target) => {
      scene.fireProjectile(
        user,
        target,
        {
          key: 'dreepy',
          speed: 600,
          animation: 'dreepy--right',
          trajectory: 'randomArc',
        },
        () => {
          scene.causeDamage(user, target, {
            damage: damage[user.basePokemon.stage - 1],
            defenseStat,
          });
        }
      );
    });
    onComplete();
  },
} as const satisfies Move;
