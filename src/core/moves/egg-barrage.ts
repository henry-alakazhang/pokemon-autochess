import { getNearestTarget } from '../../scenes/game/combat/combat.helpers';
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
  damage: [140, 240, 380],
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
          scene.causeDamage(
            user,
            targetPokemon,
            {
              damage: baseDamage,
              defenseStat: this.defenseStat,
            },
            { isAOE: true }
          );

          const possibleTargets = [
            { x: targetCoords.x - 1, y: targetCoords.y }, // left
            { x: targetCoords.x, y: targetCoords.y - 1 }, // up
            { x: targetCoords.x + 1, y: targetCoords.y }, // right
            { x: targetCoords.x, y: targetCoords.y + 1 }, // down
          ];
          scene.causeAOEDamage(user, possibleTargets, {
            damage: baseDamage / 2,
            defenseStat: this.defenseStat,
          });
        }
      );
    };

    user.addCancellableEvent({
      timer: scene.time.addEvent({
        callback: () => shootEgg(),
        delay: 200,
        repeat: 5,
      }),
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
