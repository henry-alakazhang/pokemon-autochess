import { Category, getSynergyTier, synergyData } from '../../core/game.model';
import { getPokemonStrength } from '../../core/pokemon.helpers';
import { Pokemon, pokemonData, PokemonName } from '../../core/pokemon.model';
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
 * Buy/sell prioritisation logic.
 *
 * Of an array of Pokemon, returns an equivalent array of whether the player wants them or not.
 */
function decideWant(
  player: Player,
  list: readonly Pokemon[],
  {
    forced,
    strict = false,
  }: {
    forced?: readonly Category[];
    /**
     * Increases how much quality we expect out of the board
     * Usually only use this for selling, since we can buy some extra crap and sell later.
     */
    strict?: boolean;
  } = {}
) {
  // count number of copies of each pokemon
  const totalCopies: { [k in PokemonName]?: number } = {};
  [...flatten(player.mainboard), ...player.sideboard]
    .filter(isDefined)
    .forEach(pokemon => {
      const count = 3 ** (pokemon.basePokemon.stage - 1);
      totalCopies[pokemon.basePokemon.base] =
        (totalCopies[pokemon.basePokemon.base] ?? 0) + count;
    });

  // find board Pokemon with most copies: that's the current reroll target
  const allBoardUnits = flatten(player.mainboard)
    .filter(isDefined)
    .map(pokemon => pokemon.basePokemon.base);
  let rerollTarget: PokemonName = allBoardUnits[0];
  allBoardUnits.forEach(pokemonName => {
    if (
      (totalCopies[pokemonName] ?? 0) > (totalCopies[rerollTarget] ?? 0) &&
      // if we already capped them, they're not a reroll target anymore
      (totalCopies[pokemonName] ?? 0) < 9 &&
      // don't bother trying to 3* a 4- or 5-cost; it's not gonna happen
      pokemonData[pokemonName].tier <= 3
    ) {
      rerollTarget = pokemonName;
    }
  });

  // then we decide if we want the Pokemon...
  return list.map(pokemon => {
    // YES if board has empty slots and no sideboard to fill them with
    if (
      player.canAddPokemonToMainboard() &&
      player.sideboard.every(slot => !isDefined(slot))
    ) {
      return true;
    }

    // NO if already have a 3* version
    if ((totalCopies[pokemon.base] ?? 0) >= 9) {
      return false;
    }

    // NO to excess copies if not rerolling for that Pokemon
    if ((totalCopies[pokemon.base] ?? 0) > 3 && pokemon.base !== rerollTarget) {
      return false;
    }

    // NO if max level and 2* Pokemon is not already on board
    // since we're unlikely to put them on the board or level them up further.
    if (
      player.level === 6 &&
      (totalCopies[pokemon.base] ?? 0) >= 3 &&
      !flatten(player.mainboard).some(
        boardMon => boardMon?.basePokemon.name === pokemon.name
      )
    ) {
      return false;
    }

    // strict:
    // NO to random weaker units at higher levels
    // level 3 start ignoring 1* 1-costs, ramping up to selling excess 2/3 costs
    if (strict && getPokemonStrength(pokemon) <= player.level + 1) {
      return false;
    }

    // YES if it matches our forced synergies
    if (pokemon.categories.some(category => forced?.includes(category))) {
      return true;
    }

    // YES if this Pokemon would give an extra tier of a synergy,
    // and player is not max level (ie. can potentially fit on board later)
    if (
      (!forced || forced.length === 1) &&
      player.level < 6 &&
      pokemon.categories.some(
        category =>
          getSynergyTier(
            synergyData[category].thresholds,
            (player.synergyMap[category] ?? 0) + 1
          ) >
          getSynergyTier(
            synergyData[category].thresholds,
            player.synergyMap[category] ?? 0
          )
      )
    ) {
      return true;
    }

    // end of forced logic: remaining is for flex only
    if (forced) {
      return false;
    }

    // YES if contributes to our on-board synergies
    if (
      player.level < 6 &&
      pokemon.categories.some(category => player.synergyMap[category])
    ) {
      return true;
    }

    // YES if we've already picked one up - might as well try to 2*
    // when strict, only keep / buy for pairs
    if (
      totalCopies[pokemon.base] === 2 ||
      (!strict && totalCopies[pokemon.base] === 1)
    ) {
      return true;
    }

    // NO otherwise
    return false;
  });
}

function genericDecideSells(player: Player) {
  // don't sell if still room to buy.
  if (player.canAddPokemonToSideboard()) {
    return [];
  }

  const wanted = decideWant(
    player,
    player.sideboard.filter(isDefined).map(pokemon => pokemon?.basePokemon),
    { strict: true }
  );
  return (
    player.sideboard
      .filter(isDefined)
      .filter((_, index) => !wanted[index])
      // don't sell tooo much
      .slice(-4)
  );
}

/** Simple flexible AI which donkey rolls, prioritising units with categories that match its active board */
const basicFlexAI: AIStrategy = {
  name: 'Basic Flex',
  decideBuys: (player: Player) => {
    const wants = decideWant(
      player,
      player.currentShop.map(pokemon => pokemonData[pokemon])
    );
    return player.currentShop.filter((_, index) => wants[index] === true);
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
      const wants = decideWant(
        player,
        player.currentShop.map(pokemon => pokemonData[pokemon]),
        { forced }
      );
      return player.currentShop.filter((_, index) => wants[index] === true);
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
