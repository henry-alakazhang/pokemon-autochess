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
  cost: 10,
  startingPP: 4,
  damage: [140, 210, 350],
  defenseStat: 'specDefense',
  targetting: 'unit',
  get description() {
    return `{{user}} rapidly fires 5 eggs at the nearest enemy, each dealing ${this.damage.join(
      '/'
    )} damage to the target and half to adjacent enemies.`;
  },
  range: 99,
  async use({ scene, user, userCoords, onComplete }: MoveConfig<'unit'>) {
    user.addStatus('moveIsActive', 1000);
    const baseDamage = this.damage[user.basePokemon.stage - 1];
    const shootEgg = () => {
      // fetch latest board to include pokemon that died during attack
      const { board } = scene;
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
                const secondaryDamage = calculateDamage(user, secondaryTarget, {
                  damage: baseDamage / 2,
                  defenseStat: this.defenseStat,
                });
                scene.causeDamage(user, secondaryTarget, secondaryDamage, {
                  isAOE: true,
                });
              }
            });
        }
      );
    };

    scene.time.addEvent({
      callback: () => shootEgg(),
      delay: 200,
      repeat: 5,
    });
    Tweens.spin(scene, {
      targets: [user],
      height: 25,
      width: 25,
      duration: 1000,
      onComplete: () => {
        onComplete();
      },
    });
  },
} as const;

export const eggBarrage: Move = move;
