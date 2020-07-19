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
export const clone: Move = {
  displayName: 'Clone',
  type: 'active',
<<<<<<< HEAD
  range: 1,
=======
  range: 99,
>>>>>>> Add Mewtwo
  targetting: 'unit',
  // amount of PP to grant the clone
  damage: [5, 10, 50],
  get description() {
    return `Copies a Pokemon from the opposing team, with ${this.damage.join(
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
<<<<<<< HEAD
=======
    newPokemon.addPP(this.damage[user.basePokemon.stage - 1]);
>>>>>>> Add Mewtwo
    scene.setTurn(newPokemon);
    onComplete();
  },
} as const;
