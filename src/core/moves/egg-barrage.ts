import { isDefined } from '../../helpers';
import {
  calculateDamage,
  getNearestTarget,
  inBounds,
} from '../../scenes/game/combat/combat.helpers';
import { Move, MoveConfig } from '../move.model';
import * as Tweens from '../tweens';

/**
 * Egg Barrage - Exeggcute line's move
 *
 * Fires a barrage of 5 egg bombs at the nearest Pokemon,
 * dealing damage to it and surrounding enemies.
 */
const move = {
  displayName: 'Egg Barrage',
  type: 'active',
  damage: [80, 140, 200],
  defenseStat: 'specDefense',
  targetting: 'unit',
  get description() {
    return `Fires a barrage of 5 egg bombs at the nearest enemy Pokemon, each dealing ${this.damage.join(
      '/'
    )} damage to the target and half to nearby enemy Pokemon.`;
  },
  range: 99,
  async use({ scene, user, userCoords, onComplete }: MoveConfig<'unit'>) {
    const baseDamage = this.damage[user.basePokemon.tier - 1];
    const shootEgg = () => {
      // fetch latest board to include pokemon that died during attack
      const board = scene.board;
      const targetCoords = getNearestTarget(board, userCoords);
      if (!targetCoords) {
        // end
        return;
      }
      const targetPokemon = board[targetCoords.x][targetCoords.y];
      if (!targetPokemon) {
        // end
        return;
      }
      scene.fireProjectile(
        user,
        targetPokemon,
        { key: 'egg', speed: 600 },
        () => {
          // play explosion effect
          const explosion = scene.add
            .sprite(targetPokemon.x, targetPokemon.y, 'explosion')
            .play('explosion')
            .on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
              explosion.destroy();
            });
          // damage applies separately
          const damage = calculateDamage(user, targetPokemon, {
            damage: baseDamage,
            defenseStat: this.defenseStat,
          });
          scene.causeDamage(user, targetPokemon, damage, { isAOE: true });

          const possibleTargets = [
            { x: targetCoords.x - 1, y: targetCoords.y }, // left
            { x: targetCoords.x, y: targetCoords.y - 1 }, // up
            { x: targetCoords.x + 1, y: targetCoords.y }, // right
            { x: targetCoords.x, y: targetCoords.y + 1 }, // down
          ];
          possibleTargets
            // get Pokemon if in bounds
            .map(coords =>
              inBounds(board, coords) ? board[coords.x][coords.y] : undefined
            )
            // filter out nonexistent ones
            .filter(isDefined)
            .forEach(secondaryTarget => {
              if (secondaryTarget.side !== user.side) {
                const damage = calculateDamage(user, secondaryTarget, {
                  damage: baseDamage / 2,
                  defenseStat: this.defenseStat,
                });
                scene.causeDamage(user, secondaryTarget, damage, {
                  isAOE: true,
                });
              }
            });
        }
      );
    };

    const eggFiringInterval = window.setInterval(() => {
      shootEgg();
    }, 200);
    Tweens.spin(scene, {
      targets: [user],
      height: 25,
      width: 25,
      duration: 1000,
      onComplete: () => {
        window.clearInterval(eggFiringInterval);
        onComplete();
      },
    });
  },
} as const;

export const eggBarrage: Move = move;
