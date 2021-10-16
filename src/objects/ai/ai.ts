import { Category, getSynergyTier, synergyData } from '../../core/game.model';
import { getPokemonStrength } from '../../core/pokemon.helpers';
import { pokemonData, PokemonName } from '../../core/pokemon.model';
import { flatten, isDefined } from '../../helpers';
import { Player } from '../player.object';
import { PokemonObject } from '../pokemon.object';

export interface AIStrategy {
  readonly name: string;
  /** Given a player (with access to the current shop), return the Pokemon to buy */
  readonly decideBuys: (player: Player) => PokemonName[];
  /** Given a player (with access to their main/sideboard), order the Pokemon by priority to place on board */
  readonly prioritiseBoard: (player: Player) => PokemonObject[];
  /** Given a player (with access to their gold/board), decide whether to reroll the sholl or not */
  readonly decideReroll: (player: Player) => boolean;
  /** Given a player (with access to their main/sideboard), decide whether to sell any Pokemon */
  readonly decideSells?: (player: Player) => PokemonObject[];
}

/**
 * Board prioritisation logic
 * Sorts Pokemon by a provided comparator, then filters for duplicates
 */
function genericPrioritiseBoard(
  player: Player,
  sortFn = (a: PokemonObject, b: PokemonObject) =>
    getPokemonStrength(b.basePokemon) - getPokemonStrength(a.basePokemon)
): PokemonObject[] {
  const sortedPokemon = [...flatten(player.mainboard), ...player.sideboard]
    .filter(isDefined)
    .sort(sortFn);

  // get rid of duplicates (only relevant if we have sideboard units to swap to)
  if (sortedPokemon.length > player.level) {
    const seen: { [k in PokemonName]?: boolean } = {};
    let swapsMade = 0;
    for (let i = 0; i < player.level; i++) {
      if (seen[sortedPokemon[i].basePokemon.base]) {
        // if seen, swap it with someone past the end of the mainboard
        [sortedPokemon[i], sortedPokemon[player.level + swapsMade]] = [
          sortedPokemon[player.level + swapsMade],
          sortedPokemon[i],
        ];
        swapsMade++;
      }
      seen[sortedPokemon[i].basePokemon.base] = true;
    }
  }

  return sortedPokemon;
}

/**
 * Sell logic.
 * - Sells excess copies except for one Pokemon we're targetting to 3*
 * - Sells excess copies for Pokemon we've already 3*d
 * - Sells random Pokemon which won't contribute to board synergies
 */
function genericDecideSells(player: Player) {
  // don't bother selling if we can afford more Pokemon
  if (player.canAddPokemonToSideboard()) {
    return [];
  }

  // count number of copies of each pokemon
  const totalCopies: { [k in PokemonName]?: number } = {};
  [...flatten(player.mainboard), ...player.sideboard]
    .filter(isDefined)
    .forEach(pokemon => {
      const count = 3 ** (pokemon.basePokemon.stage - 1);
      totalCopies[pokemon.basePokemon.base] =
        (totalCopies[pokemon.basePokemon.base] ?? 0) + count;
    });

  // find Pokemon with most copies: that's the current reroll target
  const allCopies = Object.keys(totalCopies) as PokemonName[];
  let rerollTarget: PokemonName = allCopies[0];
  allCopies.forEach(pokemonName => {
    if (
      (totalCopies[pokemonName] ?? 0) > (totalCopies[rerollTarget] ?? 0) &&
      // if we already capped them, they're not a reroll target anymore
      (totalCopies[pokemonName] ?? 0) < 9 &&
      // don't bother trying to 3* a 4- or 5-cost; it's not gonna happen
      pokemonData[pokemonName].tier >= 4
    ) {
      rerollTarget = pokemonName;
    }
  });

  return (
    player.sideboard
      .filter(isDefined)
      .filter(pokemon => {
        // if already have a 3* version, sell
        if ((totalCopies[pokemon.basePokemon.base] ?? 0) >= 9) {
          return true;
        }

        // if not rerolling for that Pokemon and have excess copies, sell
        if (
          (totalCopies[pokemon.basePokemon.base] ?? 0) > 3 &&
          pokemon.basePokemon.base !== rerollTarget
        ) {
          return true;
        }

        // if doesn't contribute to ANY on-board synergies, sell
        if (
          !pokemon.basePokemon.categories.some(
            category => player.synergyMap[category]
          )
        ) {
          return true;
        }

        // at higher levels, sell random weaker units
        // level 3 start selling 1* 1-costs, ramping up to selling excess 2/3 costs
        if (getPokemonStrength(pokemon.basePokemon) <= player.level + 1) {
          return true;
        }

        return false;
      })
      // don't go overboard and sell more than half the board at once
      // slice from the back because the array should be sorted by power
      .slice(-4)
  );
}

/** Simple flexible AI which donkey rolls, prioritising units with categories that match its active board */
const basicFlexAI: AIStrategy = {
  name: 'Basic Flex',
  decideBuys: (player: Player) => {
    return player.currentShop.filter(
      pokemon =>
        Object.keys(player.synergyMap).length < 4 ||
        pokemonData[pokemon].categories.some(
          category => player.synergyMap[category]
        )
    );
  },
  prioritiseBoard: genericPrioritiseBoard,
  // always reroll if enough gold to buy some units
  decideReroll: (player: Player) =>
    player.gold > 6 && player.canAddPokemonToSideboard(),
  decideSells: genericDecideSells,
};

function generateHardForceAI(forced: readonly Category[]): AIStrategy {
  return {
    name: `Hard Force ${forced.join(' + ')}`,
    /** Buy Pokemon of the categories being forced */
    decideBuys: (player: Player) => {
      const slightlyFlex = forced.length === 1;
      return player.currentShop.filter(pokemon =>
        pokemonData[pokemon].categories.some(category => {
          // if board has holes and no sideboard units to fill, just buy whatever you can
          if (
            player.canAddPokemonToMainboard() &&
            player.sideboard.every(slot => !isDefined(slot))
          ) {
            return true;
          }

          // if part of the forced build, always buy
          if (forced.includes(category)) {
            return true;
          }

          // flexible logic (for when only one category is forced)
          // can fill out the board with extra synergies that fit
          if (slightlyFlex) {
            // if this Pokemon would give an extra tier of a synergy, buy and hold
            const synergyCount = player.synergyMap[category];
            if (
              synergyCount &&
              getSynergyTier(
                synergyData[category].thresholds,
                synergyCount + 1
              ) > getSynergyTier(synergyData[category].thresholds, synergyCount)
            ) {
              return true;
            }
          }
          return false;
        })
      );
    },
    /**
     * Prioritise Pokemon that will match the forced types
     * and pick the ones that are stronger
     */
    prioritiseBoard: (player: Player) => {
      return genericPrioritiseBoard(player, (a, b) => {
        // number of categories matching the force
        const categoryCountDiff =
          b.basePokemon.categories.filter(category => forced.includes(category))
            .length -
          a.basePokemon.categories.filter(category => forced.includes(category))
            .length;
        const pokemonStrengthDiff =
          getPokemonStrength(b.basePokemon) - getPokemonStrength(a.basePokemon);
        // pick Pokemon that fit the categories, then order by power
        return categoryCountDiff || pokemonStrengthDiff;
      });
    },
    /** Donkey as long as there's money and room to buy units */
    decideReroll: (player: Player) =>
      player.gold > 6 && player.canAddPokemonToSideboard(),
    decideSells: genericDecideSells,
  };
}

const hardForceStrategies: AIStrategy[] = [
  // single vertical trait comps
  // comps capable of filling 6 vertical
  generateHardForceAI(['dark']),
  generateHardForceAI(['fire']),
  generateHardForceAI(['bulky attacker']),
  generateHardForceAI(['sweeper']),

  // comps that need a bit of flex
  generateHardForceAI(['bug']),
  generateHardForceAI(['poison']),
  generateHardForceAI(['sweeper']),
  generateHardForceAI(['ground']),

  // verticals + supports
  generateHardForceAI(['poison', 'grass']),
  generateHardForceAI(['poison', 'electric']),
  generateHardForceAI(['poison', 'disruptor']),
  generateHardForceAI(['sweeper', 'steel']),
  generateHardForceAI(['fire', 'support']),
  generateHardForceAI(['revenge killer', 'electric']),
  generateHardForceAI(['ground', 'rock']),

  // generic frontline + backline
  generateHardForceAI(['psychic', 'wall']),
  generateHardForceAI(['psychic', 'bulky attacker']),
  generateHardForceAI(['sweeper', 'wall']),
  generateHardForceAI(['sweeper', 'bulky attacker']),
  generateHardForceAI(['wallbreaker', 'wall']),

  // me mech
  generateHardForceAI(['pivot']),
  generateHardForceAI(['pivot', 'dark']),

  // force some specific carries
  generateHardForceAI(pokemonData.weedle.categories),
  generateHardForceAI(pokemonData.magikarp.categories),
  generateHardForceAI(pokemonData.larvitar.categories),
  generateHardForceAI(pokemonData.exeggcute.categories),
  generateHardForceAI(pokemonData.scyther.categories),
];

export function getRandomAI(): AIStrategy {
  // add a few flex players every game
  if (Math.random() < 0.33) {
    return basicFlexAI;
  }

  // plus some hard forcers
  return hardForceStrategies[
    Math.floor(Math.random() * hardForceStrategies.length)
  ];
}
