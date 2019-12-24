import { Move, MoveConfig } from '../move.model';
import { flatten } from '../../helpers';

/**
 * Razor Wind - Shiftry line's move
 *
 * Starts a whirlwind which triggers after 2 seconds,
 * dealing significant damage over time to an area around the target
 *
 * TODO: add custom targetting to hit maximum AoE
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
  range: 3,
  use({ scene, user, target, board, onComplete }: MoveConfig) {
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
          .sprite(target.x + 35, target.y + 35, 'razor-wind-base')
          .setDepth(-1)
          .play('razor-wind-base');
        // turn is over after casting
        onComplete();
        // start dealing damage 2 seconds later
        window.setTimeout(() => {
          base.destroy();
          const wind = scene.add
            .sprite(target.x + 35, target.y + 35, 'razor-wind-wind')
            .setScale(0.5, 0.5)
            .play('razor-wind-wind');
          scene.add.tween({
            targets: [wind],
            duration: 1000,
            scaleX: 2,
            scaleY: 2,
          });
          // the code below uses setInterval so the first tick will occur after the tween ends

          const dph = this.damage[user.basePokemon.stage - 1] / 3;
          // get board coords of the target Pokemon
          // TODO move this into a helper / pass it into the data here
          const targetPokemon = flatten(
            board.map((col, x) => col.map((pokemon, y) => ({ x, y, pokemon })))
          ).find(({ pokemon }) => pokemon && pokemon.id === target.id);
          if (!targetPokemon) {
            return;
          }
          let hits = 0;
          const interval = window.setInterval(() => {
            // deal damage to each person in range (2 x 2 square)
            const targets = [
              board[targetPokemon.x][targetPokemon.y],
              board[targetPokemon.x][targetPokemon.y + 1],
              board[targetPokemon.x + 1][targetPokemon.y],
              board[targetPokemon.x + 1][targetPokemon.y + 1],
            ];
            targets.forEach(pokemon => {
              if (pokemon && pokemon.side !== user.side) {
                user.dealDamage(dph);
                pokemon.takeDamage(dph);
              }
            });
            hits++;
            if (hits >= 2) {
              wind.destroy();
              window.clearInterval(interval);
            }
          }, 1000);
        }, 1000);
      },
    });
  },
} as const;
