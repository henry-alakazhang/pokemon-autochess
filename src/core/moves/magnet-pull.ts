import {
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
export const magnetPull: Move = {
  displayName: 'Magnet Pull',
  type: 'active',
  targetting: 'unit',
  defenseStat: 'specDefense',
  damage: [200, 350, 500],
  get description() {
    return `Magnetizes the furtherst enemy Pokemon, dealing ${this.damage.join(
      '/'
    )} damage and pulling them next to this Pokemon.`;
  },
  range: 100,
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

    // paralyse
    target.addStatus('paralyse', 4000);
    target.takeDamage(this.damage[user.basePokemon.stage - 1]);
    target.redrawBars();
    // move if possible
    if (moveCoords) {
      scene.movePokemon(targetCoords, moveCoords, () => {
        onComplete();
      });
    }
  },
} as const;
