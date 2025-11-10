import {
  calculateDamage,
  getAttackAnimation,
  getFacing,
  getTurnDelay,
} from '../../scenes/game/combat/combat.helpers';
import { Move, MoveConfig } from '../move.model';

const defenseStat = 'defense' as const;
const damage = [400, 650, 900];

/**
 * Volt Tackle - Pikachu line's move
 *
 * Deals heavy damage to a single target with some recoil to the user.
 * 500ms cast time
 *
 * TODO: differentiate this from Brave Bird
 */
export const voltTackle = {
  displayName: 'Volt Tackle',
  type: 'active',
  cost: 10,
  startingPP: 4,
  defenseStat,
  targetting: 'unit',
  get description() {
    return `{{user}} tackles a single target, dealing ${damage.join(
      '/'
    )} damage. {{user}} can hurt itself.`;
  },
  range: 1,
  use({ scene, user, target, onComplete }: MoveConfig<'unit'>) {
    // animation: some sparks then a tackle
    const sprite = scene.add
      .sprite(user.x, user.y, 'volt-tackle')
      .play('volt-tackle');
    sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      sprite.destroy();
      // TODO: do some little hops or something to add some flair
      // maybe when https://trello.com/c/CZajATA8/43 is done and it's not a pain to chain tweens.
      scene.add.tween({
        targets: [user],
        duration: getTurnDelay(user.basePokemon) * 0.15,
        ...getAttackAnimation(user, getFacing(user, target)),
        yoyo: true,
        ease: 'Power1',
        onYoyo: () => {
          const action = {
            damage: damage[user.basePokemon.stage - 1],
            defenseStat,
          };
          const calculatedDamage = calculateDamage(user, target, action);
          scene.causeDamage(user, target, action);
          user.takeDamage(Math.floor(calculatedDamage / 3), {
            triggerEvents: false,
          });
          onComplete();
        },
      });
    });
  },
} as const satisfies Move;
