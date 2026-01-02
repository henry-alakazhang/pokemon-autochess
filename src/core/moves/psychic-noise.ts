import { inBounds } from '../../scenes/game/combat/combat.helpers';
import { Move, MoveConfig } from '../move.model';
import * as Tweens from '../tweens';

const damage = [200, 340, 500];
const defenseStat = 'specDefense' as const;

/**
 * Psychic Noise - Hatenna line's move
 *
 * Deals damage to a target and reduces it + adjacent enemy healing
 */
export const psychicNoise = {
  displayName: 'Psychic Noise',
  type: 'active',
  cost: 16,
  startingPP: 10,
  defenseStat,
  targetting: 'unit',
  range: 1,
  description: `{{user}} emits an unpleasant psychic sound, dealing ${damage.join('/')} damage to a single enemy. This reduces the target and adjacent enemy's healing by 40% for 6 seconds.`,
  async use({
    scene,
    user,
    target,
    targetCoords,
    onComplete,
  }: MoveConfig<'unit'>) {
    await Tweens.hop(scene, { targets: [user] });
    // TODO: graphics
    // Deal damage to the one target.
    scene.causeDamage(user, target, {
      damage: damage[user.basePokemon.stage - 1],
      defenseStat,
    });
    // TODO: give the target a shudder animation?

    // Add heal reduction to target and adjacent enemies.
    [
      targetCoords,
      { x: targetCoords.x + 1, y: targetCoords.y },
      { x: targetCoords.x - 1, y: targetCoords.y },
      { x: targetCoords.x, y: targetCoords.y + 1 },
      { x: targetCoords.x, y: targetCoords.y - 1 },
    ]
      .filter((coords) => inBounds(scene.board, coords))
      .map((coords) => scene.board[coords.x][coords.y])
      .filter((pokemon) => pokemon?.side !== user.side)
      .forEach((adjacent) => adjacent?.addStatus('healReduction', 6000));
    onComplete();
  },
} as const satisfies Move;
