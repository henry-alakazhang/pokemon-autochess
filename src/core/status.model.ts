import { PokemonObject } from '../objects/pokemon.object';
import { Coords } from '../scenes/game/combat/combat.helpers';
import { Effect } from './game.model';

// TODO: Don't hardcode these
export const NEGATIVE_STATUS: Status[] = [
  'paralyse',
  'sleep',
  'blind',
  'poison',
  'immobile',
  'ppReduction',
  'healReduction',
  'curse',
];

export type Status =
  | 'paralyse'
  | 'sleep'
  | 'blind'
  | 'poison'
  | 'statusImmunity'
  | 'immobile'
  | 'ppReduction'
  | 'healReduction'
  | 'curse'
  /** the user can't gain PP because their move is active right now */
  | 'moveIsActive';

/**
 * Model representing any effect that can be applied to a Pokemon.
 * This is a broad definition and includes any kind of buff
 * or debuff aside from stat alterations
 */
export type StatusEffect = {
  readonly name: string;
  readonly isNegative: boolean;
} & Effect<{ self: PokemonObject; selfCoords: Coords; stacks: number }>;

/** Create an effect that reduces damage by a certain DECIMAL percentage */
export function createDamageReductionEffect(
  source: string,
  percentage: number
): StatusEffect {
  return {
    name: `damageReduction-${source}`,
    isNegative: false,
    calculateDamage: ({ self, defender, baseAmount }) => {
      return self === defender
        ? baseAmount * (1 - percentage / 100)
        : baseAmount;
    },
  };
}
