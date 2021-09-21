import { interpolateLineAOE } from '../../math.helpers';
import {
  calculateDamage,
  Coords,
  getAngle,
  getFacing,
  optimiseAOE,
} from '../../scenes/game/combat/combat.helpers';
import {
  CombatBoard,
  getCoordinatesForGrid,
} from '../../scenes/game/combat/combat.scene';
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
  damage: [300, 550, 800],
  defenseStat: 'specDefense',
  targetting: 'unit',
  get description() {
    return `{{user}} charges for 2 seconds before zapping a straight line, dealing ${this.damage.join(
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
      targetting: 'unit',
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
    target,
    targetCoords,
    onComplete,
  }: MoveConfig<'unit'>) {
    user.playAnimation(getFacing(user, target));
    // TODO: play volt chargy animation?
    scene.add.tween({
      targets: [user],
      duration: 2000,
      scaleX: 1.5,
      scaleY: 1.5,
      onComplete: () => {
        // the target may have moved in the charge-up time
        // keep aiming at the original spot
        // TODO: aim at the target's new coords instead?
        const targettedLocation = getCoordinatesForGrid(targetCoords);
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
            this.getAOE(userCoords, targetCoords).forEach(({ x, y }) => {
              const pokemon = board[x]?.[y];
              if (!pokemon) {
                return;
              }
              if (pokemon.side !== user.side) {
                const damage = calculateDamage(user, pokemon, {
                  damage: this.damage[user.basePokemon.stage - 1],
                  defenseStat: this.defenseStat,
                });
                scene.causeDamage(user, pokemon, damage, { isAOE: true });
              }
            });
          },
          delay: animations.thunder.duration * 0.5,
        });

        user.setScale(1, 1);
        onComplete();
      },
    });
  },
} as const;

export const zapCannon: Move = move;
