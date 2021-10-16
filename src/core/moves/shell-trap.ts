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
const move = {
  displayName: 'Shell Trap',
  type: 'active',
  cost: 20,
  startingPP: 16,
  range: 1,
  targetting: 'ground',
  damage: [100, 175, 300],
  percentReflect: [10, 25, 776],
  defenseStat: 'specDefense',
  get description() {
    return `{{user}} shields itself, reducing all incoming damage by 50% for 4 seconds. When hit by an attack, {{user}} erupts to deal ${this.damage.join(
      '/'
    )} damage plus ${this.percentReflect.join(
      '/'
    )}% of the damage taken to all adjacent enemies.`;
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
            .once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
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
                defenseStat: this.defenseStat,
              });
              scene.causeDamage(user, target, damage, { isAOE: true });
            }
          });
        };

        user.on(PokemonObject.Events.Damage, damageProc);

        scene.time.addEvent({
          callback: () => {
            user.setTint();
            user.removeListener(PokemonObject.Events.Damage, damageProc);
          },
          delay: DURATION,
        });
      },
    });
  },
} as const;

export const shellTrap: Move = move;
