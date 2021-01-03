import { flatten, isDefined } from '../../helpers';
import { PokemonObject } from '../../objects/pokemon.object';
import {
  calculateDamage,
  Coords,
  getOppositeSide,
} from '../../scenes/game/combat/combat.helpers';
import { CombatBoard } from '../../scenes/game/combat/combat.scene';
import { Move, MoveConfig } from '../move.model';
import * as Tweens from '../tweens';

/**
 * Dark Void - Darkrai's move
 *
 * Puts a number of enemies to sleep and drains their HP over time.
 */
export const darkVoid: Move = {
  displayName: 'Dark Void',
  type: 'active',
  defenseStat: 'specDefense',
  targetting: 'unit',
  // number of targets
  damage: [2, 3, 8],
  get description() {
    return `Puts the ${this.damage.join(
      '/'
    )} enemies with highest HP to sleep for 4 seconds, and drains 10% of their health per second while they sleep.`;
  },
  range: 100,
  getTarget(board: CombatBoard, myCoords: Coords): Coords | undefined {
    return myCoords;
  },
  use({ scene, board, user, onComplete }: MoveConfig<'unit'>) {
    user.addStatus('moveIsActive', 4500);

    Tweens.hop(scene, {
      targets: [user],
      onComplete: () => {
        onComplete();
        const targets = flatten(board)
          .filter(isDefined)
          .filter(pokemon => pokemon.side === getOppositeSide(user.side))
          // sort by max HP
          .sort(
            (a: PokemonObject, b: PokemonObject) => a.currentHP - b.currentHP
          )
          // and pick the highest X targets
          .slice(0, this.damage[user.basePokemon.stage - 1]);
        // todo: add attack graphics
        targets.forEach(target => target.addStatus('sleep', 4000));
        // apply damage every second for 4 seconds
        const damageEffect = window.setInterval(() => {
          targets.forEach(target => {
            const damage = calculateDamage(user, target, {
              damage: target.maxHP / 10,
              defenseStat: 'specDefense',
            });
            scene.causeDamage(user, target, damage, { isAOE: true });
            user.heal(damage / 2);
          });
        }, 1000);
        window.setTimeout(() => {
          window.clearInterval(damageEffect);
        }, 4000);
      },
    });
  },
} as const;
