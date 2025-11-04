import { interpolateLineAOE } from '../../math.helpers';
import {
  Coords,
  getAngle,
  getFacing,
  optimiseAOE,
} from '../../scenes/game/combat/combat.helpers';
import { CombatBoard } from '../../scenes/game/combat/combat.scene';
import { Move, MoveConfig } from '../move.model';

/**
 * Dragon Rush - Gible line's move
 *
 * Dashes behind / next to the furthest enemy, dealing damage to every target hit
 */
const move = {
  displayName: 'Dragon Rush',
  type: 'active',
  cost: 18,
  startingPP: 10,
  damage: [500, 800, 1300],
  defenseStat: 'defense',
  targetting: 'ground',
  get description() {
    return `{{user}} charges, dashing behind the furthest enemy. It deals ${this.damage.join(
      '/'
    )} damage to every enemy it passes through.`;
  },
  range: 99,
  getTarget(board: CombatBoard, user: Coords) {
    return optimiseAOE({
      board,
      user,
      range: 99,
      getAOE: this.getAOE,
      targetting: 'ground',
      needsEmpty: true,
    });
  },
  /**
   * A wide line from user to target
   */
  getAOE(targetCoords: Coords, myCoords: Coords) {
    return interpolateLineAOE(myCoords, targetCoords, { width: 3 });
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
    rush.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      rush.destroy();
    });

    // wait through the first bit of the dragon rush animation
    scene.time.addEvent({
      callback: () => {
        let realTarget: Coords | undefined = targetCoords;
        // if target is occupied, find another target
        if (board[realTarget.x][realTarget.y] !== undefined) {
          realTarget = this.getTarget(board, user);
          if (!realTarget) {
            onComplete();
            return;
          }
        }
        scene.movePokemon(userCoords, realTarget, onComplete);
        scene.causeAOEDamage(user, this.getAOE(realTarget, userCoords), {
          damage: this.damage[user.basePokemon.stage - 1],
          defenseStat: this.defenseStat,
        });
        // reset target after movement
        user.currentTarget = undefined;
      },
      delay: 250,
    });
  },
} as const;

export const dragonRush: Move = move;
