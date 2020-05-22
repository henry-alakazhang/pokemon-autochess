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
 * Volt Tackle - Pikachu line's move
 *
 * Deals heavy damage to a single target with some recoil to the user.
 * 500ms cast time
 *
 * TODO: differentiate this from Brave Bird
 */
export const zapCannon: Move = {
  displayName: 'Zap Cannon',
  type: 'active',
  damage: [300, 550, 800],
  defenseStat: 'specDefense',
  targetting: 'unit',
  get description() {
    return `Charges for 2 seconds before zapping in a straight line, dealing ${this.damage.join(
      '/'
    )} damage to every target hit`;
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
          .play('thunder');
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
        setTimeout(() => {
          this.getAOE(userCoords, targetCoords).forEach(({ x, y }) => {
            const pokemon = board[x]?.[y];
            if (!pokemon) {
              return;
            }
            if (pokemon.side !== user.side) {
              const damage = calculateDamage(
                user.basePokemon,
                pokemon.basePokemon,
                {
                  damage: this.damage[user.basePokemon.stage - 1],
                  defenseStat: this.defenseStat,
                }
              );
              pokemon.takeDamage(damage);
            }
          });
        }, animations.thunder.duration * 0.5);
        setTimeout(() => {
          thunder.destroy();
        }, animations.thunder.duration);

        user.setScale(1, 1);
        onComplete();
      },
    });
  },
} as const;
