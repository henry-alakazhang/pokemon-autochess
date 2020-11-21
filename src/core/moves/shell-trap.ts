import { PokemonObject } from '../../objects/pokemon.object';
import {
  calculateDamage,
  Coords,
  getOppositeSide,
  inBounds,
} from '../../scenes/game/combat/combat.helpers';
import { CombatScene } from '../../scenes/game/combat/combat.scene';
import { Move, MoveConfig } from '../move.model';
import * as Tweens from '../tweens';

/**
 * Shell Trap - Turtonator's move
 *
 * Reduces damage taken and reflects damage at enemies during the duration
 */
export const shellTrap: Move = {
  displayName: 'Shell Trap',
  type: 'active',
  range: 1,
  targetting: 'ground',
  damage: [100, 125, 200],
  get description() {
    return `Reduces all incoming damage by 40% for 4 seconds. When hit by an attack, explodes to deal ${this.damage.join(
      '/'
    )} to all adjacent enemies`;
  },
  getTarget(board: CombatScene['board'], myCoords: Coords) {
    return myCoords;
  },
  use({ scene, board, user, onComplete }: MoveConfig<'ground'>) {
    const DURATION = 4000;
    user.addStatus('moveIsActive', DURATION);

    Tweens.hop(scene, { targets: [user] });

    // tint red
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

      onComplete: () => {
        onComplete();

        user
          // adding moveIsActive here will refresh the duration
          // so it lasts the same as everything else
          .addStatus('moveIsActive', DURATION)
          .addStatus('percentDamageReduction', DURATION, 40);

        const damageProc = () => {
          const userCoords = scene.getBoardLocationForPokemon(user);
          if (!userCoords) {
            return;
          }

          // play explosion animation
          const trapAnimation = scene.add
            .sprite(user.x, user.y, 'shell-trap')
            .play('shell-trap')
            .once(Phaser.Animations.Events.SPRITE_ANIMATION_COMPLETE, () => {
              trapAnimation.destroy();
            });

          const possibleTargets = [
            { x: userCoords.x - 1, y: userCoords.y }, // left
            { x: userCoords.x, y: userCoords.y - 1 }, // up
            { x: userCoords.x + 1, y: userCoords.y }, // right
            { x: userCoords.x, y: userCoords.y + 1 }, // down
          ].filter(coords => inBounds(board, coords));
          possibleTargets.forEach(({ x, y }) => {
            const target = board[x][y];
            if (target?.side === getOppositeSide(user.side)) {
              const damage = calculateDamage(user, target, {
                damage: this.damage[user.basePokemon.stage - 1],
                defenseStat: 'specDefense',
              });
              scene.causeDamage(user, target, damage);
            }
          });
        };

        user.on(PokemonObject.Events.Damage, damageProc);

        setTimeout(() => {
          user.setTint();
          user.removeListener(PokemonObject.Events.Damage, damageProc);
        }, DURATION);
      },
    });
  },
} as const;
