import { Coords } from '../../scenes/game/combat/combat.helpers';
import { CombatScene } from '../../scenes/game/combat/combat.scene';
import { Move, MoveConfig } from '../move.model';
import { createDamageReductionEffect } from '../status.model';
import * as Tweens from '../tweens';

const defenseStat = 'specDefense' as const;
const damage = [150, 200, 300];
const percentReflect = [15, 25, 776];

/**
 * Shell Trap - Turtonator's move
 *
 * Reduces damage taken and reflects damage at enemies during the duration
 */
export const shellTrap = {
  displayName: 'Shell Trap',
  type: 'active',
  cost: 20,
  startingPP: 16,
  range: 1,
  targetting: 'ground',
  defenseStat,
  get description() {
    return `{{user}} shields itself, reducing all incoming damage by 40% for 6 seconds. When hit by an attack, {{user}} erupts to deal ${damage.join(
      '/'
    )} damage plus ${percentReflect.join(
      '/'
    )}% of the damage taken to all adjacent enemies.`;
  },
  getTarget(board: CombatScene['board'], myCoords: Coords) {
    return myCoords;
  },
  use({ scene, user, onComplete }: MoveConfig<'ground'>) {
    const DURATION = 6000;
    user.addStatus('moveIsActive', DURATION);

    Tweens.hop(scene, { targets: [user] });

    // tint red
    scene.tweens.addCounter({
      from: 255,
      to: 150,
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        user.setTint(
          Phaser.Display.Color.GetColor(
            0xff,
            Math.floor(tween.getValue() ?? 0),
            Math.floor(tween.getValue() ?? 0)
          )
        );
      },

      onComplete: () => {
        onComplete();

        user
          // adding moveIsActive here will refresh the duration
          // so it lasts the same as everything else
          .addStatus('moveIsActive', DURATION)
          .addEffect(
            {
              ...createDamageReductionEffect('shell-trap', 40),
              onBeingHit: ({ self, damage: amountTaken, selfCoords }) => {
                // play explosion animation
                const trapAnimation = scene.add
                  .sprite(self.x, self.y, 'shell-trap')
                  .play('shell-trap')
                  .once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
                    trapAnimation.destroy();
                  });

                const possibleTargets = [
                  { x: selfCoords.x - 1, y: selfCoords.y }, // left
                  { x: selfCoords.x, y: selfCoords.y - 1 }, // up
                  { x: selfCoords.x + 1, y: selfCoords.y }, // right
                  { x: selfCoords.x, y: selfCoords.y + 1 }, // down
                ];

                scene.causeAOEDamage(
                  self,
                  possibleTargets,
                  {
                    damage:
                      damage[self.basePokemon.stage - 1] +
                      amountTaken *
                        (percentReflect[self.basePokemon.stage - 1] / 100),
                    defenseStat,
                  },
                  { triggerEvents: false }
                );
              },
            },
            DURATION
          );

        // Clean up tint when effect expires
        scene.time.addEvent({
          callback: () => {
            user.setTint();
          },
          delay: DURATION,
        });
      },
    });
  },
} as const satisfies Move;
