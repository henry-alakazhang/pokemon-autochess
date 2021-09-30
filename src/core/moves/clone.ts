import {
  Coords,
  getNearestEmpty,
  getRandomTarget,
} from '../../scenes/game/combat/combat.helpers';
import { CombatBoard } from '../../scenes/game/combat/combat.scene';
import { Move, MoveConfig } from '../move.model';

/**
 * Clone - Mewtwo's move
 *
 * Copies members of the enemy team to fight for you
 */
const move = {
  displayName: 'Clone',
  type: 'active',
  cost: 20,
  startingPP: 12,
  range: 99,
  targetting: 'unit',
  // amount of PP to grant the clone
  damage: [5, 10, 50],
  get description() {
    return `{{user}} clones a random enemy, with ${this.damage.join(
      '/'
    )} bonus PP.`;
  },
  getTarget(board: CombatBoard, user: Coords) {
    return getRandomTarget({ board, user, targetAllies: false });
  },
  use({
    scene,
    board,
    user,
    target,
    targetCoords,
    onComplete,
  }: MoveConfig<'unit'>) {
    // find empty space near the target
    const place = getNearestEmpty(board, targetCoords);
    if (place === undefined) {
      return onComplete();
    }

    const newPokemon = scene.addPokemon(
      user.side,
      place,
      target.basePokemon.name
    );
    newPokemon.addPP(this.damage[user.basePokemon.stage - 1]);
    scene.setTurn(newPokemon);
    onComplete();
  },
} as const;

export const clone: Move = move;
