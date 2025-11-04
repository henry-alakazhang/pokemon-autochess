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
const move = {
  displayName: 'Dark Void',
  type: 'active',
  cost: 32,
  startingPP: 10,
  defenseStat: 'specDefense',
  targetting: 'unit',
  // number of targets
  damage: [1, 2, 6],
  get description() {
    return `{{user}} puts the ${this.damage.join(
      '/'
    )} enemies with highest HP to sleep for 4 seconds, and drains 8% of their HP/s while they sleep.`;
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
          .filter((pokemon) => pokemon.side === getOppositeSide(user.side))
          // sort by max HP
          .sort(
            (a: PokemonObject, b: PokemonObject) => a.currentHP - b.currentHP
          )
          // and pick the highest X targets
          .slice(0, this.damage[user.basePokemon.stage - 1]);
        // todo: add attack graphics
        targets.forEach((target) => target.addStatus('sleep', 4000));
        // apply damage every second for 4 seconds
        scene.time.addEvent({
          callback: () => {
            targets.forEach((target) => {
              const action = {
                damage: target.maxHP * 0.08,
                defenseStat: this.defenseStat,
              };
              scene.causeDamage(user, target, action, {
                isAOE: true,
                triggerEvents: false,
              });
              // FIXME: heal based on damage dealt
              user.heal(calculateDamage(user, target, action) / 2);
            });
          },
          delay: 1000,
          repeat: 4,
        });
      },
    });
  },
} as const;

export const darkVoid: Move = move;
