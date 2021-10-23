import {
  calculateDamage,
  getAttackAnimation,
  getFacing,
  getTurnDelay,
} from '../../scenes/game/combat/combat.helpers';
import { Move, MoveConfig } from '../move.model';

/**
 * Volt Tackle - Pikachu line's move
 *
 * Deals heavy damage to a single target with some recoil to the user.
 * 500ms cast time
 *
 * TODO: differentiate this from Brave Bird
 */
const move = {
  displayName: 'Volt Tackle',
  type: 'active',
  cost: 10,
  startingPP: 4,
  damage: [400, 650, 900],
  defenseStat: 'defense',
  targetting: 'unit',
  get description() {
    return `{{user}} tackles a single target, dealing ${this.damage.join(
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
          const damage = calculateDamage(user, target, {
            damage: this.damage[user.basePokemon.stage - 1],
            defenseStat: this.defenseStat,
          });
          scene.causeDamage(user, target, damage);
          user.takeDamage(Math.floor(damage / 3), { triggerEvents: false });
          onComplete();
        },
      });
    });
  },
} as const;

export const voltTackle: Move = move;
