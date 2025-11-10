import {
  Coords,
  getFurthestTarget,
  inBounds,
} from '../../scenes/game/combat/combat.helpers';
import { CombatScene } from '../../scenes/game/combat/combat.scene';
import { Move, MoveConfig } from '../move.model';

const defenseStat = 'specDefense' as const;
const damage = [300, 450, 700];

/**
 * Magnet Pull - Magnezone line's signature move
 *
 * Deals damage to and pulls the furthest enemy to the user.
 */
export const magnetPull = {
  displayName: 'Magnet Pull',
  type: 'active',
  cost: 20,
  startingPP: 20,
  targetting: 'unit',
  range: 100,
  defenseStat,
  get description() {
    return `{{user}} magnetizes the furthest enemy, dealing ${damage.join(
      '/'
    )} damage. It is pulled next to {{user}} and paralysed for 2 seconds.`;
  },
  getTarget(board: CombatScene['board'], user: Coords): Coords | undefined {
    return getFurthestTarget({
      board,
      user,
      targetAllies: false,
    });
  },
  use({
    scene,
    board,
    user,
    userCoords,
    target,
    targetCoords,
    onComplete,
  }: MoveConfig<'unit'>) {
    // TODO: graphics
    // find nearest empty spot
    const possibleSpots = [
      { x: userCoords.x + 1, y: userCoords.y },
      { x: userCoords.x - 1, y: userCoords.y },
      { x: userCoords.x, y: userCoords.y + 1 },
      { x: userCoords.x, y: userCoords.y - 1 },
    ];
    const moveCoords = possibleSpots.filter(
      ({ x, y }) => inBounds(board, { x, y }) && !board[x]?.[y]
    )[0];

    scene.causeDamage(user, target, {
      damage: damage[user.basePokemon.stage - 1],
      defenseStat,
    });
    // paralyse
    target.addStatus('paralyse', 2000);
    // move if possible
    if (moveCoords) {
      scene.movePokemon(targetCoords, moveCoords, () => {
        // start attacking the pulled Pokemon
        user.currentTarget = target;
        // reset pulled Pokemon's targetting
        target.currentTarget = undefined;
        onComplete();
      });
    }
  },
} as const satisfies Move;
