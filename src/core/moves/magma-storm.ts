import { Move, MoveConfig } from '../move.model';
import * as Tweens from '../tweens';

const defenseStat = 'specDefense' as const;
const damage = [400, 700, 4850];
const cost = 24;

/**
 * Magma Storm, Heatran's move
 *
 * Blasts a target with fire and burns them forever.
 * When they faint, they spread the fire.
 */

export const magmaStorm = {
  displayName: 'Magma Storm',
  type: 'active',
  cost,
  startingPP: 14,
  range: 1,
  targetting: 'unit',
  defenseStat,
  get description() {
    return `{{user}} traps a single enemy in a maelstrom of fire, dealing ${damage.join(
      '/'
    )} damage and permanently burning the target for 1/6 of its HP per second. After it faints, {{user}} recovers half its PP.`;
  },
  async use({ scene, user, target, onComplete }: MoveConfig<'unit'>) {
    await Tweens.spin(scene, {
      targets: [user],
      height: 20,
      width: 20,
      duration: 300,
    });
    // play storm effect and apply damage after it's done
    const storm = scene.add
      .sprite(target.x, target.y, 'magma-storm')
      .play('magma-storm')
      .once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        storm.destroy();

        scene.causeDamage(user, target, {
          damage: damage[user.basePokemon.stage - 1],
          defenseStat,
        });

        // Apply permanent burn effect
        target.addEffect(
          {
            name: 'magma-storm',
            isNegative: true,
            onTimer: ({ self }) => {
              if (!self.active) {
                return;
              }
              // burn for max HP damage that can't be modified or reduced
              scene.causeDamage(
                user,
                self,
                {
                  trueDamage: Math.round(self.maxHP / 6),
                },
                {
                  // TODO: make target glow red
                  triggerEvents: false,
                }
              );
            },
            onDeath: () => {
              // When the burned target dies, recover PP
              user.addPP(cost / 2);
            },
          },
          Infinity // Permanent burn
        );
      });
    onComplete();
  },
} as const satisfies Move;
