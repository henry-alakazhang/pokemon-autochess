import { flatten, isDefined } from '../helpers';
import { PokemonObject } from '../objects/pokemon.object';
import { CombatScene } from '../scenes/game/combat/combat.scene';

export type Status =
  | 'paralyse'
  | 'sleep'
  | 'blind'
  | 'percentDamageReduction'
  | 'statusImmunity'
  | 'immobile'
  /** the user can't gain PP because their move is active right now */
  | 'moveIsActive';

export type Type =
  | 'normal'
  | 'fire'
  | 'fighting'
  | 'water'
  | 'flying'
  | 'grass'
  | 'poison'
  | 'electric'
  | 'ground'
  | 'psychic'
  | 'rock'
  | 'ice'
  | 'bug'
  | 'dragon'
  | 'ghost'
  | 'dark'
  | 'steel'
  | 'fairy';

// TODO implement when ready.
// export type Role =
//   | 'setup sweeper'
//   | 'physical attacker'
//   | 'special attacker'
//   | 'bulky attacker'
//   | 'hazard setter'
//   | 'status support'
//   | 'revenge killer'
//   | 'wall breaker'
//   | 'wall';

export type Category = Type;

/**
 * Model representing the effects of a synergy.
 *
 * Each synergy has one or more functions which can be called during combat,
 * eg. at the start of the round, on hitting an enemy, on being hit
 *
 * The logic for these sits here
 */
export interface Synergy {
  readonly category: Category;
  readonly displayName: string;
  readonly description: string;
  /** Amount of synergy required to trigger different levels */
  readonly thresholds: number[];
  /** Possible effect that occurs on hit */
  readonly onHit?: (config: {
    scene: CombatScene;
    board: CombatScene['board'];
    attacker: PokemonObject;
    defender: PokemonObject;
    count: number;
  }) => void;
  /** Possible effect that occurs on being hit */
  readonly onBeingHit?: (config: {
    scene: CombatScene;
    board: CombatScene['board'];
    attacker: PokemonObject;
    defender: PokemonObject;
    count: number;
  }) => void;
  /** TODO Possible effect that occurs on start of round */
  readonly onRoundStart?: (config: {
    scene: CombatScene;
    board: CombatScene['board'];
    side: 'player' | 'enemy';
    count: number;
  }) => void;
  /** TODO Possible replacement damage calculation */
  // readonly damageCalc?: ({ }) => number;
}

export function getSynergyTier(thresholds: number[], count: number) {
  let tier = thresholds.findIndex(threshold => count < threshold);
  // if tier is -1, it means it's beyond the max
  if (tier === -1) {
    tier = thresholds.length;
  }
  return tier;
}

export const synergyData: { [k in Category]: Synergy } = {
  normal: {
    category: 'normal',
    displayName: 'Normal',
    description: 'Does nothing.',
    thresholds: [2, 4, 6],
  },
  fire: {
    category: 'fire',
    displayName: 'Fire',
    description: 'Does nothing.',
    thresholds: [2, 4, 6],
  },
  fighting: {
    category: 'fighting',
    displayName: 'Fighting',
    description: 'Does nothing.',
    thresholds: [2, 4, 6],
  },
  water: {
    category: 'water',
    displayName: 'Water',
    description: 'Does nothing.',
    thresholds: [2, 4, 6],
  },
  flying: {
    category: 'flying',
    displayName: 'Flying',
    description: 'Does nothing.',
    thresholds: [2, 4, 6],
  },
  grass: {
    category: 'grass',
    displayName: 'Grass',
    description: 'Does nothing.',
    thresholds: [2, 4, 6],
  },
  poison: {
    category: 'poison',
    displayName: 'Poison',
    description: 'Does nothing.',
    thresholds: [3, 6],
  },
  electric: {
    category: 'electric',
    displayName: 'Electric',
    description: 'Does nothing.',
    thresholds: [2, 4, 6],
  },
  ground: {
    category: 'ground',
    displayName: 'Ground',
    description: 'Does nothing.',
    thresholds: [2, 4, 6],
  },
  psychic: {
    category: 'psychic',
    displayName: 'Psychic',
    description: 'Does nothing.',
    thresholds: [2, 4, 6],
  },
  rock: {
    category: 'rock',
    displayName: 'Rock',
    description: 'Does nothing.',
    thresholds: [2, 4, 6],
  },
  ice: {
    category: 'ice',
    displayName: 'Ice',
    description: 'Does nothing.',
    thresholds: [2, 4],
  },
  bug: {
    category: 'bug',
    displayName: 'Bug',
    description: 'Does nothing.',
    thresholds: [3],
  },
  dragon: {
    category: 'dragon',
    displayName: 'Dragon',
    description: 'Does nothing.',
    thresholds: [3],
  },
  ghost: {
    category: 'ghost',
    displayName: 'Ghost',
    description: 'Does nothing.',
    thresholds: [3, 6],
  },
  dark: {
    category: 'dark',
    displayName: 'Dark',
    description: 'Does nothing.',
    thresholds: [2, 4, 6],
  },
  steel: {
    category: 'steel',
    displayName: 'Steel',
    description: `Makes party members immune to status
effects at the start of the round.

 (2) - lasts 5 seconds
 (4) - lasts 10 seconds`,
    thresholds: [2, 4],
    onRoundStart({
      board,
      side,
      count,
    }: {
      board: CombatScene['board'];
      side: 'player' | 'enemy';
      count: number;
    }) {
      const tier = getSynergyTier(this.thresholds, count);
      if (tier === 0) {
        return;
      }

      const duration = tier === 1 ? 5000 : 10000;
      flatten(board)
        .filter(isDefined)
        .forEach(pokemon => {
          if (pokemon.side === side) {
            // TODO: apply some visual for status immunity
            pokemon.addStatus('statusImmunity', duration);
          }
        });
    },
  },
  fairy: {
    category: 'fairy',
    displayName: 'Fairy',
    description: 'Does nothing.',
    thresholds: [2, 4],
  },
};
