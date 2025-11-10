import {
  Coords,
  getNearestEmpty,
} from '../../scenes/game/combat/combat.helpers';
import { CombatBoard } from '../../scenes/game/combat/combat.scene';
import { Move, MoveConfig } from '../move.model';

const plantHP = [250, 400, 600];

/**
 * Frenzy Plant - Bulbasaur's move
 *
 * Summons a plant that attacks enemies
 */
export const frenzyPlant = {
  displayName: 'Frenzy Plant',
  type: 'active',
  cost: 22,
  startingPP: 18,
  range: 99,
  targetting: 'ground',
  get description() {
    return `{{user}} summons a plant in a nearby square with its Attack and ${plantHP.join(
      '/'
    )} HP.`;
  },
  getTarget(board: CombatBoard, user: Coords) {
    return getNearestEmpty(board, user);
  },
  use({ scene, user, targetCoords, onComplete }: MoveConfig<'ground'>) {
    const plant = scene.addPokemon(user.side, targetCoords, 'frenzyplant');
    // override some of the stats
    const maxHP = plantHP[user.basePokemon.stage - 1];
    const { specAttack } = user.basePokemon;
    plant.maxHP = maxHP;
    plant.currentHP = maxHP;
    plant.basePokemon = {
      ...plant.basePokemon,
      specAttack,
    };
    plant.owner = user;
    plant.addStatus('immobile', 99999);
    scene.setTurn(plant);
    onComplete();
  },
} as const satisfies Move;
