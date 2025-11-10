import { Coords, optimiseAOE } from '../../scenes/game/combat/combat.helpers';
import { CombatBoard } from '../../scenes/game/combat/combat.scene';
import { getCoordinatesForMainboard } from '../../scenes/game/game.helpers';
import { Move, MoveConfig } from '../move.model';

// target + adjacent Pokemon
const getAOE = (targetCoords: Coords) => {
  return [
    targetCoords,
    { x: targetCoords.x + 1, y: targetCoords.y },
    { x: targetCoords.x - 1, y: targetCoords.y },
    { x: targetCoords.x, y: targetCoords.y + 1 },
    { x: targetCoords.x, y: targetCoords.y - 1 },
  ];
};

// regigigas has 3-9 stages based on total stage level of pivots
//              3   4   5   6   7   8   9
const damage = [40, 44, 48, 52, 56, 60, 486];

/**
 * Crush Grip, Regigigas (Mech)'s move
 *
 * Slams a target, dealing % MAX HP damage to it and adjacent enemies.
 */
export const crushGrip = {
  displayName: 'Crush Grip',
  type: 'active',
  cost: 30,
  startingPP: 0,
  defenseStat: 'defense',
  targetting: 'ground',
  get description() {
    return `{{user}} crushes a nearby group of enemies under its grip, dealing damage equal to ${damage.join(
      '/'
    )}% of their max HP`;
  },
  getAOE,
  getTarget(board: CombatBoard, user: Coords) {
    return optimiseAOE({
      board,
      user,
      range: 2,
      getAOE,
      targetting: 'ground',
      needsEmpty: false,
    });
  },
  range: 2,
  use({ scene, user, targetCoords, onComplete }: MoveConfig<'ground'>) {
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
        scene.causeAOEDamage(user, getAOE(targetCoords), (defender) => ({
          damage: Math.round(
            (damage[user.synergyState.pivot - 3] * defender.maxHP) / 100
          ),
          defenseStat: crushGrip.defenseStat,
        }));
      },
    });
  },
} as const satisfies Move;
