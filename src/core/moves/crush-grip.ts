import {
  calculateDamage,
  Coords,
  inBounds,
  optimiseAOE,
} from '../../scenes/game/combat/combat.helpers';
import { CombatBoard } from '../../scenes/game/combat/combat.scene';
import { getCoordinatesForMainboard } from '../../scenes/game/game.helpers';
import { Move, MoveConfig } from '../move.model';

/**
 * Crush Grip, Regigigas (Mech)'s move
 *
 * Slams a target, dealing % MAX HP damage to it and adjacent enemies.
 */
const move = {
  displayName: 'Crush Grip',
  type: 'active',
  cost: 30,
  startingPP: 0,
  // regigigas has 3-9 stages based on total stage level of pivots
  //              3   4   5   6   7   8   9
  damagePercent: [40, 44, 48, 52, 56, 60, 486],
  defenseStat: 'defense',
  targetting: 'ground',
  get description() {
    return `{{user}} crushes a nearby group of enemies under its grip, dealing damage equal to ${this.damagePercent.join(
      '/'
    )}% of their max HP`;
  },
  // target + adjacent Pokemon
  getAOE(targetCoords: Coords) {
    return [
      targetCoords,
      { x: targetCoords.x + 1, y: targetCoords.y },
      { x: targetCoords.x - 1, y: targetCoords.y },
      { x: targetCoords.x, y: targetCoords.y + 1 },
      { x: targetCoords.x, y: targetCoords.y - 1 },
    ];
  },
  getTarget(board: CombatBoard, user: Coords) {
    return optimiseAOE({
      board,
      user,
      range: 2,
      getAOE: this.getAOE,
      targetting: 'ground',
      needsEmpty: false,
    });
  },
  range: 2,
  use({ scene, board, user, targetCoords, onComplete }: MoveConfig<'ground'>) {
    const graphicalCoords = getCoordinatesForMainboard(targetCoords);
    const grip = scene.add
      .sprite(graphicalCoords.x, graphicalCoords.y - 30, 'crush-grip')
      .setScale(0.5)
      .play('crush-grip');
    grip.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      grip.destroy();
    });
    scene.add.tween({
      targets: [grip],
      scale: 3,
      duration: 400,
      onComplete: () => {
        onComplete();
        this.getAOE(targetCoords).forEach(coords => {
          if (!inBounds(board, coords)) {
            return;
          }
          const potentialTarget = board[coords.x][coords.y];
          if (!potentialTarget || potentialTarget.side === user.side) {
            return;
          }
          const damage = calculateDamage(user, potentialTarget, {
            damage: Math.round(
              (this.damagePercent[user.synergyState.pivot - 3] *
                potentialTarget.maxHP) /
                100
            ),
            defenseStat: this.defenseStat,
          });
          scene.causeDamage(user, potentialTarget, damage);
        });
      },
    });
  },
} as const;

export const crushGrip: Move = move;
