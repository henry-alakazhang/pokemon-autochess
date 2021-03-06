import {
  Coords,
  getNearestEmpty,
} from '../../scenes/game/combat/combat.helpers';
import { CombatBoard } from '../../scenes/game/combat/combat.scene';
import { Move, MoveConfig } from '../move.model';

/**
 * Frenzy Plant - Bulbasaur's move
 *
 * Summons a plant that attacks enemies
 */
export const frenzyPlant: Move = {
  displayName: 'Frenzy Plant',
  type: 'active',
  range: 99,
  targetting: 'ground',
  // HP of the plant
  damage: [150, 350, 600],
  get description() {
    return `Summon a plant in a nearby square with ${this.damage.join(
      '/'
    )} HP and this Pokemon's attack`;
  },
  getTarget(board: CombatBoard, user: Coords) {
    return getNearestEmpty(board, user);
  },
  use({ scene, user, targetCoords, onComplete }: MoveConfig<'ground'>) {
    const plant = scene.addPokemon(user.side, targetCoords, 'frenzyplant');
    // override some of the stats
    const maxHP = this.damage[user.basePokemon.stage - 1];
    const { specAttack } = user.basePokemon;
    plant.maxHP = maxHP;
    plant.currentHP = maxHP;
    plant.basePokemon = {
      ...plant.basePokemon,
      specAttack,
    };
    plant.addStatus('immobile', 99999);
    scene.setTurn(plant);
    onComplete();
  },
} as const;
