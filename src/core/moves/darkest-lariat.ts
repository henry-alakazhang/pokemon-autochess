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
/* eslint-disable local-rules/validate-calculate-damage */
const move = {
  displayName: 'Darkest Lariat',
  type: 'active',
  cost: 6,
  startingPP: 2,
  range: 1,
  targetting: 'unit',
  damage: [200, 350, 550],
  // not used, just here to change the icon displayed in the card
  defenseStat: 'defense',
  get description() {
    return `{{user}} spins with both arms, hitting all adjacent enemies for ${this.damage.join(
      '/'
    )} damage. Ignores defense.`;
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
          this.damage[user.basePokemon.stage - 1],
          { isAOE: true, canCrit: true }
        );
      }
    });
  },
} as const;

export const darkestLariat: Move = move;
