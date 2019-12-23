import { Move, MoveConfig } from '../move.model';

/**
 * Razor Wind - Shiftry line's move
 *
 * Starts a whirlwind which triggers after 2 seconds,
 * dealing significant damage over time to an area around the target
 *
 * TODO: actually make it AOE
 */
export const razorWind: Move = {
  displayName: 'Razor Wind',
  type: 'active',
  damage: [600, 1000, 1800],
  defenseStat: 'specDefense',
  get description() {
    return `After 2 seconds, whips up a whirlwind which deals ${this.damage.join(
      '/'
    )} damage over 2 seconds`;
  },
  range: 1,
  use({ scene, user, target, onComplete }: MoveConfig) {
    // double-hopping animation
    scene.add.tween({
      targets: [user],
      duration: 150,
      y: user.y - 10,
      yoyo: true,
      ease: 'Quad.easeOut',
      repeat: 1,
      onComplete: () => {
        // animation: small spinny whirlwind effect below the poekmon
        const base = scene.add
          .sprite(target.x, target.y + 20, 'razor-wind-base')
          .setDepth(-1)
          .play('razor-wind-base');
        // turn is over after casting
        onComplete();
        // start dealing damage 2 seconds later
        window.setTimeout(() => {
          base.destroy();
          const wind = scene.add
            .sprite(target.x, target.y, 'razor-wind-wind')
            .play('razor-wind-wind');
          const dph = this.damage[user.basePokemon.stage - 1] / 3;
          let hits = 1;
          user.dealDamage(dph);
          target.takeDamage(dph);
          const interval = window.setInterval(() => {
            user.dealDamage(dph);
            target.takeDamage(dph);
            hits++;
            if (hits >= 3) {
              wind.destroy();
              window.clearInterval(interval);
            }
          }, 1000);
        }, 2000);
      },
    });
  },
} as const;
