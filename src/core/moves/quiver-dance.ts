import { Coords } from '../../scenes/game/combat/combat.helpers';
import { CombatScene } from '../../scenes/game/combat/combat.scene';
import { Move, MoveConfig } from '../move.model';
import * as Tweens from '../tweens';

/**
 * Quiver Dance - Volcarona line's move
 *
 * Boots special attack, special defense and speed for the rest of the battle
 */
const move = {
  displayName: 'Quiver Dance',
  type: 'active',
  cost: 100,
  startingPP: 90,
  range: 1,
  targetting: 'ground',
  get description() {
    return `{{user}} dances to sharply raise its Sp. Attack, Sp. Defense and Speed PERMANENTLY.`;
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

    dance.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
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
            specAttack: +2,
            specDefense: +2,
            speed: +2,
          });
          onComplete();
        },
      });
    });
  },
} as const;

export const quiverDance: Move = move;
