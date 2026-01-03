import { Coords } from '../../scenes/game/combat/combat.helpers';
import { Move, MoveConfig } from '../move.model';
import * as Tweens from '../tweens';

const damage = [500, 800, 1300];
const defenseStat = 'specDefense' as const;

const getAOE = ({ x, y }: Coords) => {
  return [
    { x, y },
    { x: x + 1, y },
    { x: x - 1, y },
    { x, y: y + 1 },
    { x, y: y - 1 },
  ];
};

/**
 * Moonblast - Flutter Mane's move
 *
 * Placeholder move
 */
export const moonblast = {
  displayName: 'Proto Moonblast',
  type: 'active',
  cost: 6,
  startingPP: 2,
  defenseStat,
  targetting: 'unit',
  range: 3,
  description: `{{user}} attacks with a powerful blast of moonlight that deals ${damage.join('/')} special damage and lowers the target's Sp. Atk for 8 seconds. If the target's Sp. Atk is already lowered, the blast deals damage to all adjacent enemies instead.`,
  getAOE,
  async use({
    scene,
    user,
    target,
    targetCoords,
    onComplete,
  }: MoveConfig<'unit'>) {
    // Add moon that grows as user does a spin
    const moon = scene.add
      .sprite(user.x + 8, user.y - 32, 'moon')
      .setAlpha(0.25)
      .setScale(0.5);
    scene.tweens.add({
      targets: [moon],
      alpha: 1,
      scale: 1.5,
      duration: 600,
    });
    await Tweens.spin(scene, {
      targets: [user],
      height: 20,
      width: 20,
      duration: 500,
    });
    await Tweens.hop(scene, {
      targets: [user],
    });

    scene.fireProjectile(
      user,
      target,
      {
        key: 'moon-projectile',
        speed: 600,
        trajectory: 'straight',
        rotation: 'rotate',
      },
      () => {
        const action = {
          damage: damage[user.basePokemon.stage - 1],
          defenseStat,
        };
        if (target.statChanges.specAttack < 0) {
          // Already debuffed: deal AOE damage
          // Also play effect to make this more obvious.
          const hitEffect = scene.add
            .sprite(target.x, target.y, 'fairy-hit')
            .play('fairy-hit')
            .once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
              hitEffect.destroy();
            });
          scene.causeAOEDamage(user, getAOE(targetCoords), action);
        } else {
          scene.causeDamage(user, target, action);
          target.changeStats({ specAttack: -1 }, 8000);
        }
        moon.destroy();
        onComplete();
      }
    );
  },
} as const satisfies Move;
