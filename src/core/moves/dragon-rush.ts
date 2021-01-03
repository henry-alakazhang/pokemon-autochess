import { interpolateLineAOE } from '../../math.helpers';
import {
  Coords,
  getAngle,
  getFacing,
  getFurthestTarget,
  getOppositeSide,
  optimiseAOE,
} from '../../scenes/game/combat/combat.helpers';
import { CombatBoard } from '../../scenes/game/combat/combat.scene';
import { Move, MoveConfig } from '../move.model';

/**
 * Dragon Rush - Gible line's move
 *
 * Dashes behind / next to the furthest enemy, dealing damage to every target hit
 */
export const dragonRush: Move = {
  displayName: 'Dragon Rush',
  type: 'active',
  damage: [500, 800, 1300],
  defenseStat: 'defense',
  targetting: 'ground',
  get description() {
    return `Dashes behind the furthest enemy, dealing ${this.damage.join(
      '/'
    )} damage to every target hit`;
  },
  range: 99,
  getTarget(board: CombatBoard, user: Coords) {
    const furthestPokemonCoords = getFurthestTarget({
      board,
      user,
    });
    if (!furthestPokemonCoords) {
      return undefined;
    }
    const { x, y } = furthestPokemonCoords;
    return optimiseAOE({
      board,
      user,
      range: 99,
      getAOE: this.getAOE,
      targetting: 'ground',
      pool: [
        { x: x - 1, y },
        { x: x + 1, y },
        { x, y: y - 1 },
        { x, y: y + 1 },
      ],
    });
  },
  /**
   * A line from user to target.
   */
  getAOE(targetCoords: Coords, myCoords: Coords) {
    // TODO: support width and make this 2-width
    return interpolateLineAOE(myCoords, targetCoords);
  },
  use({
    scene,
    board,
    user,
    userCoords,
    targetCoords,
    onComplete,
  }: MoveConfig<'ground'>) {
    const facing = getFacing(userCoords, targetCoords);
    user.playAnimation(facing);
    // shift the rush animation on the sprite a bit so it's "behind" the sprite
    const offset =
      facing === 'down'
        ? { y: -25 }
        : facing === 'up'
        ? { y: 25 }
        : facing === 'left'
        ? { x: 25 }
        : { x: -25 };
    const rush = scene.add
      .sprite(user.x + (offset.x ?? 0), user.y + (offset.y ?? 0), 'dragon-rush')
      .setDepth(-1)
      .setRotation(getAngle(userCoords, targetCoords))
      .play('dragon-rush');
    user.attach(rush);
    rush.once(Phaser.Animations.Events.SPRITE_ANIMATION_COMPLETE, () => {
      rush.destroy();
    });

    // wait through the first bit of the dragon rush animation
    setTimeout(() => {
      // if target coord is somehow occupied now, don't move
      // TODO: retarget
      if (board[targetCoords.x][targetCoords.y] !== undefined) {
        onComplete();
        return;
      }
      scene.movePokemon(userCoords, targetCoords, onComplete);
      const damage = this.damage[user.basePokemon.stage - 1];
      this.getAOE(targetCoords, userCoords).forEach(({ x, y }) => {
        const thisTarget = board[x][y];
        if (thisTarget?.side === getOppositeSide(user.side)) {
          scene.causeDamage(user, thisTarget, damage, { isAOE: true });
        }
      });
      // reset target after movement
      user.currentTarget = undefined;
    }, 250);
  },
} as const;
