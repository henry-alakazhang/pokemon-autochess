import { Move, MoveConfig } from '../move.model';
import * as Tweens from '../tweens';

/**
 * Magma Storm, Heatran's move
 *
 * Blasts a target with fire and burns them forever.
 * When they faint, they spread the fire.
 */
const move = {
  displayName: 'Magma Storm',
  type: 'active',
  cost: 24,
  startingPP: 14,
  range: 1,
  targetting: 'unit',
  damage: [400, 700, 4850],
  defenseStat: 'specDefense',
  get description() {
    return `{{user}} traps a single enemy in a maelstrom of fire, dealing ${this.damage.join(
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
          damage: this.damage[user.basePokemon.stage - 1],
          defenseStat: this.defenseStat,
        });

        const burnTimer = scene.time.addEvent({
          delay: 1000,
          loop: true,
          callback: () => {
            if (!target.active) {
              scene.time.removeEvent(burnTimer);
              user.addPP(this.cost / 2);
              return;
            }
            // burn for max HP damage that can't be modified or reduced
            scene.causeDamage(
              user,
              target,
              {
                trueDamage: Math.round(target.maxHP / 6),
              },
              {
                // TODO: make target glow red
                triggerEvents: false,
              }
            );
          },
        });
      });
    onComplete();
  },
} as const;

export const magmaStorm: Move = move;
