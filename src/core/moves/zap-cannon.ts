import { interpolateLineAOE } from '../../math.helpers';
import {
  Coords,
  getAngle,
  getFacing,
  optimiseAOE,
} from '../../scenes/game/combat/combat.helpers';
import { CombatBoard } from '../../scenes/game/combat/combat.scene';
import { getCoordinatesForMainboard } from '../../scenes/game/game.helpers';
import { animations } from '../animations';
import { Move, MoveConfig } from '../move.model';

/**
 * Zap Cannon - Grubbin line's move
 *
 * Charges for 2s, then deals damage in a line
 */
const move = {
  displayName: 'Zap Cannon',
  type: 'active',
  cost: 28,
  startingPP: 14,
  damage: [450, 850, 1100],
  defenseStat: 'specDefense',
  targetting: 'ground',
  get description() {
    return `{{user}} charges for 1 second before zapping a straight line, dealing ${this.damage.join(
      '/'
    )} damage to every enemy hit.`;
  },
  range: 99,
  getTarget(board: CombatBoard, user: Coords) {
    return optimiseAOE({
      board,
      user,
      range: this.range,
      getAOE: this.getAOE,
      targetting: 'ground',
    });
  },
  /**
   * A line from user to target.
   */
  getAOE(targetCoords: Coords, myCoords: Coords) {
    return interpolateLineAOE(myCoords, targetCoords);
  },
  use({
    scene,
    board,
    user,
    userCoords,
    targetCoords: initialTargetCoords,
    onComplete,
  }: MoveConfig<'ground'>) {
    user.playAnimation(getFacing(userCoords, initialTargetCoords));
    // TODO: play volt chargy animation?
    scene.add.tween({
      targets: [user],
      duration: 1000,
      scaleX: 1.5,
      scaleY: 1.5,
      onComplete: () => {
        user.setScale(1, 1);
        // the target may have moved in the charge-up time
        // so just recalculate the target lol
        const targetCoords = this.getTarget(board, userCoords);
        if (!targetCoords) {
          onComplete();
          return;
        }

        const targettedLocation = getCoordinatesForMainboard(targetCoords);
        const thunder = scene.add
          .sprite(user.x, user.y, 'thunder')
          .setOrigin(0, 0.5)
          .setRotation(getAngle(user, targettedLocation))
          .play('thunder')
          .on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            thunder.destroy();
          });
        // scale length of beam to target distance
        // if longer than the base sprite
        thunder.displayWidth = Math.max(
          thunder.displayWidth,
          Phaser.Math.Distance.Between(
            user.x,
            user.y,
            targettedLocation.x,
            targettedLocation.y
          )
        );
        scene.time.addEvent({
          callback: () => {
            scene.causeAOEDamage(user, this.getAOE(userCoords, targetCoords), {
              damage: this.damage[user.basePokemon.stage - 1],
              defenseStat: this.defenseStat,
            });
          },
          delay: animations.thunder.duration * 0.5,
        });
        onComplete();
      },
    });
  },
} as const;

export const zapCannon: Move = move;
