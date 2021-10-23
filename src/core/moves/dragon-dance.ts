import { Coords } from '../../scenes/game/combat/combat.helpers';
import { CombatScene } from '../../scenes/game/combat/combat.scene';
import { animations } from '../animations';
import { Move, MoveConfig } from '../move.model';

/**
 * Dragon Dance - Gyarados line's move
 *
 * Boots attack damage and speed for the rest of the battle
 */
const move = {
  displayName: 'Dragon Dance',
  type: 'active',
  // FIXME: Just disable mana after using move
  cost: 100,
  startingPP: 94,
  range: 1,
  targetting: 'ground',
  get description() {
    return `{{user}} dances to drastically boost its Attack and Speed PERMANENTLY.`;
  },
  getTarget(board: CombatScene['board'], myCoords: Coords) {
    return myCoords;
  },
  use({ scene, user, onComplete }: MoveConfig<'ground'>) {
    // play dragon-dancy animation
    const dance = scene.add
      .sprite(user.x, user.y, 'dragon-dance')
      .play('dragon-dance');
    // red tints to represent growth
    scene.tweens.addCounter({
      from: 255,
      to: 150,
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        user.setTint(
          Phaser.Display.Color.GetColor(
            0xff,
            Math.floor(tween.getValue()),
            Math.floor(tween.getValue())
          )
        );
      },
      duration: animations['dragon-dance'].duration / 2,
      yoyo: true,
      onComplete: () => {
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
              attack: +3,
              speed: +3,
            });
            onComplete();
          },
        });
      },
    });
  },
} as const;

export const dragonDance: Move = move;
