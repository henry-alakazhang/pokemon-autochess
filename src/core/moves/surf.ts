import { isDefined } from '../../helpers';
import {
  calculateDamage,
  Coords,
  inBounds,
} from '../../scenes/game/combat/combat.helpers';
import { Move, MoveConfig } from '../move.model';
import * as Tweens from '../tweens';

/**
 * Surf - Lapras's move
 *
 * Sends a wave of water which knocks back all Pokemon in front/to the side and stuns them
 */
const move = {
  displayName: 'Surf',
  type: 'active',
  damage: [400, 850, 1700],
  defenseStat: 'specDefense',
  targetting: 'unit',
  get description() {
    return `Sends forth a wave of water, dealing ${this.damage.join(
      '/'
    )} damage to every target in front of or beside the user, knocking them back and stunning them for 1.5 second.`;
  },
  range: 1,
  /**
   * Wave in front of and beside user
   *
   * X T X      X X _
   * X U X  OR  T U _
   * _ _ _      X X _
   */
  getAOE(targetCoords: Coords, myCoords: Coords) {
    const dx = targetCoords.x - myCoords.x;
    const dy = targetCoords.y - myCoords.y;

    // aiming horizontally -> splashes vertically
    if (Math.abs(dx) > 0) {
      return [
        // important: further targets first, so we can properly knock everyone back when iterating over
        targetCoords,
        // above target
        { x: targetCoords.x, y: targetCoords.y - 1 },
        // below target
        { x: targetCoords.x, y: targetCoords.y + 1 },
        // above user
        { x: myCoords.x, y: myCoords.y - 1 },
        // below user
        { x: myCoords.x, y: myCoords.y + 1 },
      ];
    }
    // aiming vertically -> splashes horizontally
    if (Math.abs(dy) > 0) {
      return [
        targetCoords,
        // left of target
        { x: targetCoords.x - 1, y: targetCoords.y },
        // right of target
        { x: targetCoords.x + 1, y: targetCoords.y },
        // left of user
        { x: myCoords.x + 1, y: myCoords.y },
        // right of user
        { x: myCoords.x - 1, y: myCoords.y },
      ];
    }
    // ??????
    throw new Error(
      `Invalid positioning for Surf ${JSON.stringify(
        targetCoords
      )} ${JSON.stringify(myCoords)}`
    );
  },
  async use({
    scene,
    board,
    user,
    userCoords,
    targetCoords,
    onComplete,
  }: MoveConfig<'unit'>) {
    await Tweens.spin(scene, {
      targets: [user],
      height: 10,
      width: 10,
      duration: 200,
    });
    // TODO: add surf graphic
    const targets = this.getAOE(targetCoords, userCoords);
    const pushX = targetCoords.x - userCoords.x;
    const pushY = targetCoords.y - userCoords.y;
    targets
      .filter(coords => inBounds(board, coords))
      .map(coords => ({ coords, pokemon: board[coords.x][coords.y] }))
      .forEach(({ coords: validTargetCoords, pokemon: validTarget }) => {
        if (!validTarget || validTarget.side === user.side) {
          return;
        }
        // play hit effect
        const hitEffect = scene.add
          .sprite(validTarget.x, validTarget.y, 'water-hit')
          .play('water-hit');
        validTarget.attach(hitEffect);
        hitEffect.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
          hitEffect.destroy();
          validTarget.detach(hitEffect);
        });

        // deal damage
        const damage = calculateDamage(user, validTarget, {
          damage: this.damage[user.basePokemon.stage - 1],
          defenseStat: this.defenseStat,
        });
        user.dealDamage(damage);
        validTarget.takeDamage(damage);
        validTarget.addStatus('paralyse', 1500);

        // push if able
        const pushTo = {
          x: validTargetCoords.x + pushX,
          y: validTargetCoords.y + pushY,
        };
        if (inBounds(board, pushTo) && !isDefined(board[pushTo.x][pushTo.y])) {
          scene.movePokemon(validTargetCoords, pushTo);
        }
      });
    onComplete();
  },
} as const;

export const surf: Move = move;
