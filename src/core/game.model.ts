import { flatten, isDefined } from '../helpers';
import { FloatingText } from '../objects/floating-text.object';
import { PokemonObject } from '../objects/pokemon.object';
import { getNearestEmpty } from '../scenes/game/combat/combat.helpers';
import { CombatScene } from '../scenes/game/combat/combat.scene';
import { GameScene } from '../scenes/game/game.scene';

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

export type Role =
  | 'sweeper'
  | 'revenge killer'
  | 'bulky attacker'
  | 'wallbreaker'
  | 'hazard setter'
  | 'wall'
  | 'disruptor'
  | 'support'
  | 'pivot';

export type Category = Type | Role;

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
    damage: number;
    count: number;
  }) => void;
  /** Possible effect that occurs on being hit */
  readonly onBeingHit?: (config: {
    scene: CombatScene;
    board: CombatScene['board'];
    attacker: PokemonObject;
    defender: PokemonObject;
    damage: number;
    count: number;
  }) => void;
  /** Possible effect that occurs on start of round */
  readonly onRoundStart?: (config: {
    scene: CombatScene;
    board: CombatScene['board'];
    side: 'player' | 'enemy';
    count: number;
  }) => void;
  /** Possible effect that occurs on end of round, after combat has concluded */
  readonly onRoundEnd?: (config: {
    scene: GameScene;
    winner: 'player' | 'enemy';
    count: number;
  }) => void;
  /** Possible extra damage calculation */
  readonly calculateDamage?: (config: {
    attacker: PokemonObject;
    defender: PokemonObject;
    baseAmount: number;
    flags: { isAttack?: boolean };
    side: 'player' | 'enemy';
    count: number;
  }) => number;
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
    description: `Each Normal-type Pokemon has a 50% chance
to Pick Up a Pokeball at end of round.

 (3) - After winning rounds.
 (6) - After all rounds.`,
    thresholds: [3, 6],
    onRoundEnd({
      scene,
      winner,
      count,
    }: {
      scene: GameScene;
      winner: 'player' | 'enemy';
      count: number;
    }) {
      const tier = getSynergyTier(this.thresholds, count);
      if (tier === 0) {
        return;
      }
      // todo: do on a per-player basis
      if (tier === 1 && winner !== 'player') {
        return;
      }

      flatten(scene.mainboard)
        .filter(isDefined)
        .forEach(pokemon => {
          if (
            pokemon.basePokemon.categories.includes('normal') &&
            Math.random() < 0.5
          ) {
            scene.add.existing(
              new FloatingText(scene, pokemon.x, pokemon.y, 'Pick up!')
            );
            scene.player.gold++;
          }
        });
    },
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
    description: `All party members drain life when dealing damage.

 (2) - 15% of damage
 (4) - 30% of damage
 (6) - 65% of damage`,
    thresholds: [2, 4, 6],
    onHit({
      attacker,
      damage,
      count,
    }: {
      attacker: PokemonObject;
      damage: number;
      count: number;
    }) {
      // TODO add animation for healing?
      const tier = getSynergyTier(this.thresholds, count);
      if (tier === 0) {
        return;
      }
      switch (tier) {
        case 1:
          return attacker.heal(damage * 0.15);
        case 2:
          return attacker.heal(damage * 0.3);
        case 3:
          return attacker.heal(damage * 0.65);
        default: // nothing
      }
    },
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
    description: `Makes a copy of the least-evolved Bug-type
Pokemon at the start of the round.

(3) - One copy`,
    thresholds: [3],
    onRoundStart({
      scene,
      board,
      side,
      count,
    }: {
      scene: CombatScene;
      board: CombatScene['board'];
      side: 'player' | 'enemy';
      count: number;
    }) {
      const tier = getSynergyTier(this.thresholds, count);
      if (tier === 0) {
        return;
      }

      const pokemonToCopy = flatten(board)
        .filter(isDefined)
        // find all the Bug-types of the appropriate side
        .filter(
          pokemon =>
            pokemon.side === side &&
            pokemon.basePokemon.categories.includes('bug')
        )
        // and sort by star level
        .sort((pokemonA, pokemonB) => {
          return pokemonA.basePokemon.stage - pokemonB.basePokemon.stage;
        })[0];
      const locationToCopy = scene.getBoardLocationForPokemon(pokemonToCopy);
      if (!locationToCopy) {
        return;
      }
      const placeToPut = getNearestEmpty(board, locationToCopy);
      if (!placeToPut) {
        return;
      }
      scene.addPokemon(side, placeToPut, pokemonToCopy.basePokemon.name);
    },
  },
  dragon: {
    category: 'dragon',
    displayName: 'Dragon',
    description: `Boosts the power of Dragon-type moves.

(3) - 50% more damage.`,
    thresholds: [3],
    calculateDamage({
      attacker,
      baseAmount,
      side,
      count,
      flags,
    }: {
      attacker: PokemonObject;
      defender: PokemonObject;
      baseAmount: number;
      flags: { isAttack?: boolean };
      side: 'player' | 'enemy';
      count: number;
    }): number {
      const tier = getSynergyTier(this.thresholds, count);
      if (tier === 0) {
        return baseAmount;
      }

      if (
        attacker.side === side &&
        attacker.basePokemon.categories.includes('dragon') &&
        flags.isAttack === false
      ) {
        return baseAmount * 1.5;
      }

      return baseAmount;
    },
  },
  ghost: {
    category: 'ghost',
    displayName: 'Ghost',
    // TODO: if this is bullshit, make it deterministic
    // eg. every 4th / 3rd / 2nd attack
    // eg. for X seconds after using a move / critting / being crit
    description: `Ghost-types can dodge attacks.

 (2) - 20% chance
 (4) - 40% chance
 (6) - 60% chance`,
    thresholds: [2, 4, 6],
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

      const evasionBoost = tier === 1 ? 0.2 : tier === 2 ? 0.4 : 0.6;
      flatten(board)
        .filter(isDefined)
        .forEach(pokemon => {
          if (
            pokemon.side === side &&
            pokemon.basePokemon.categories.includes('ghost')
          ) {
            // TODO: better way of setting base evasion ?
            pokemon.evasion += evasionBoost;
          }
        });
    },
  },
  dark: {
    category: 'dark',
    displayName: 'Dark',
    description: `Dark-type Pokemon can critically hit.

 (2) - 15% chance to deal 200% damage.
 (4) - 30% chance to deal 250% damage.
 (6) - 45% chance to deal 300% damage.
`,
    thresholds: [2, 4, 6],
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

      const critRate = tier === 1 ? 0.15 : tier === 2 ? 0.3 : 0.45;
      const critDamage = tier === 1 ? 2 : tier === 2 ? 2.5 : 3;
      flatten(board)
        .filter(isDefined)
        .forEach(pokemon => {
          if (pokemon.side === side) {
            pokemon.critRate = critRate;
            pokemon.critDamage = critDamage;
          }
        });
    },
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
  sweeper: {
    category: 'sweeper',
    displayName: 'Sweeper',
    description: 'Does nothing.',
    thresholds: [2, 4, 6],
  },
  'revenge killer': {
    category: 'revenge killer',
    displayName: 'Revenge Killer',
    description: 'Does nothing.',
    thresholds: [2, 4],
  },
  wallbreaker: {
    category: 'wallbreaker',
    displayName: 'Wallbreaker',
    description: 'Does nothing.',
    thresholds: [2, 4],
  },
  'hazard setter': {
    category: 'hazard setter',
    displayName: 'Hazard Setter',
    description: 'Does nothing.',
    thresholds: [2, 4],
  },
  'bulky attacker': {
    category: 'bulky attacker',
    displayName: 'Bulky Attacker',
    description: 'Does nothing.',
    thresholds: [2, 4, 6],
  },
  wall: {
    category: 'wall',
    displayName: 'Wall',
    description: 'Does nothing.',
    thresholds: [2, 4, 6],
  },
  disruptor: {
    category: 'disruptor',
    displayName: 'Disruptor',
    description: 'Does nothing.',
    thresholds: [3],
  },
  support: {
    category: 'support',
    displayName: 'Support',
    description: 'Does nothing.',
    thresholds: [2, 4],
  },
  pivot: {
    category: 'pivot',
    displayName: 'Pivot',
    description: 'Does nothing.',
    thresholds: [3],
  },
};
