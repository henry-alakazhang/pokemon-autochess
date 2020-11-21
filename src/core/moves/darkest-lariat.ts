import { PokemonAnimationType } from '../../objects/pokemon.object';
import {
  getFacing,
  getOppositeSide,
  inBounds,
} from '../../scenes/game/combat/combat.helpers';
import { Move, MoveConfig } from '../move.model';

/**
 * Darkest Lariat - Litten line's move
 *
 * Damages surrounding targets, ignoring defense. Should have a low casting cost.
 */
export const darkestLariat: Move = {
  displayName: 'Darkest Lariat',
  type: 'active',
  range: 1,
  targetting: 'unit',
  damage: [150, 200, 350],
  get description() {
    return `Spins with both arms, hitting all nearby Pokemon for ${this.damage.join(
      '/'
    )} TRUE damage.`;
  },
  use({
    scene,
    board,
    user,
    userCoords,
    targetCoords,
    onComplete,
  }: MoveConfig<'unit'>) {
    const directions: PokemonAnimationType[] = ['left', 'up', 'right', 'down'];
    const possibleTargets = [
      { x: userCoords.x - 1, y: userCoords.y }, // left
      { x: userCoords.x, y: userCoords.y - 1 }, // up
      { x: userCoords.x + 1, y: userCoords.y }, // right
      { x: userCoords.x, y: userCoords.y + 1 }, // down
    ].filter(coords => inBounds(board, coords));
    const startingDirection = getFacing(userCoords, targetCoords);
    const startIndex = directions.indexOf(startingDirection);
    // TODO: graphics: add a dark tornado effect
    scene.tweens.addCounter({
      from: 0,
      to: 4,
      duration: 200,
      onUpdate: tween => {
        const index = (startIndex + Math.floor(tween.getValue())) % 4;
        user.playAnimation(directions[index]);
      },
      onComplete: () => onComplete(),
    });
    possibleTargets.forEach(coords => {
      const target = board[coords.x][coords.y];
      if (target?.side === getOppositeSide(user.side)) {
        scene.causeDamage(
          user,
          target,
          this.damage[user.basePokemon.stage - 1]
        );
      }
    });
  },
} as const;
