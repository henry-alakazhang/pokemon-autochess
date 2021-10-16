import {
  calculateDamage,
  Coords,
  getFurthestTarget,
  inBounds,
} from '../../scenes/game/combat/combat.helpers';
import { CombatScene } from '../../scenes/game/combat/combat.scene';
import { Move, MoveConfig } from '../move.model';

/**
 * Magnet Pull - Magnezone line's signature move
 *
 * Deals damage to and pulls the furthest enemy to the user.
 */
const move = {
  displayName: 'Magnet Pull',
  type: 'active',
  cost: 20,
  startingPP: 20,
  targetting: 'unit',
  range: 100,
  defenseStat: 'specDefense',
  damage: [300, 450, 700],
  get description() {
    return `{{user}} magnetizes the furthest enemy, dealing ${this.damage.join(
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

    const damage = calculateDamage(user, target, {
      damage: this.damage[user.basePokemon.stage - 1],
      defenseStat: this.defenseStat,
    });
    scene.causeDamage(user, target, damage);
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
} as const;

export const magnetPull: Move = move;
