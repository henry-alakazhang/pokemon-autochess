import {
  Coords,
  getNearestEmpty,
  getRandomTarget,
} from '../../scenes/game/combat/combat.helpers';
import { CombatBoard } from '../../scenes/game/combat/combat.scene';
import { Move, MoveConfig } from '../move.model';

const bonusPP = [5, 10, 50];

/**
 * Clone - Mewtwo's move
 *
 * Copies members of the enemy team to fight for you
 */
export const clone = {
  displayName: 'Clone',
  type: 'active',
  cost: 32,
  startingPP: 18,
  range: 99,
  targetting: 'unit',
  get description() {
    return `{{user}} clones a random enemy, with ${bonusPP.join(
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
    newPokemon.owner = user;
    newPokemon.addPP(bonusPP[user.basePokemon.stage - 1]);
    scene.setTurn(newPokemon);
    onComplete();
  },
} as const satisfies Move;
