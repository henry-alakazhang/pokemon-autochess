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
export const voltTackle: Move = {
  displayName: 'Volt Tackle',
  type: 'active',
  damage: [300, 450, 600],
  defenseStat: 'defense',
  get description() {
    return `Deals ${this.damage.join(
      '/'
    )} damage to a single target, with some recoil to the user.`;
  },
  range: 1,
  use({ scene, user, target, onComplete }: MoveConfig) {
    // animation: some sparks then a tackle
    const sprite = scene.add
      .sprite(user.x, user.y, 'volt-tackle')
      .play('volt-tackle');
    sprite.on(Phaser.Animations.Events.SPRITE_ANIMATION_COMPLETE, () => {
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
          const damage = calculateDamage(user.basePokemon, target.basePokemon, {
            damage: this.damage[user.basePokemon.stage - 1],
            defenseStat: 'defense',
          });
          target.takeDamage(damage);
          user.takeDamage(Math.floor(damage / 4), false);
          onComplete();
        },
      });
    });
  },
} as const;
