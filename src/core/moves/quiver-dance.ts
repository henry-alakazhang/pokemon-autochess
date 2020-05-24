import { Coords } from '../../scenes/game/combat/combat.helpers';
import { CombatScene } from '../../scenes/game/combat/combat.scene';
import { Move, MoveConfig } from '../move.model';
import * as Tweens from '../tweens';

/**
 * Quiver Dance - Volcarona line's move
 *
 * Boots special attack, special defense and speed for the rest of the battle
 */
export const quiverDance: Move = {
  displayName: 'Dragon Dance',
  type: 'active',
  range: 1,
  targetting: 'ground',
  get description() {
    return `Boosts special attack damage, special defense and speed by 50% for the rest of the battle.`;
  },
  getTarget(board: CombatScene['board'], myCoords: Coords) {
    return myCoords;
  },
  use({ scene, user, onComplete }: MoveConfig<'ground'>) {
    // play buff animation
    const dance = scene.add
      .sprite(user.x, user.y, 'quiver-dance')
      .play('quiver-dance');

    // play a spin
    Tweens.spin(scene, {
      targets: [user],
      height: 20,
      width: 10,
      duration: 500,
    });

    dance.once(Phaser.Animations.Events.SPRITE_ANIMATION_COMPLETE, () => {
      dance.destroy();
      // at the end, grow and shrink
      scene.add.tween({
        targets: [user],
        duration: 250,
        scaleX: 1.2,
        scaleY: 1.2,
        yoyo: true,
        onComplete: () => {
          user.changeStats({
            specAttack: 1.5,
            specDefense: 1.5,
            speed: 1.5,
          });
          onComplete();
        },
      });
    });
  },
} as const;
