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
  const allPokemon = [...flatten(player.mainboard), ...player.sideboard]
    .filter(isDefined)
    .sort(sortFn);

  // Shortcut: For level 1-2, just play units sorted by strength.
  if (player.level <= 2) {
    return allPokemon;
  }

  // ==========================================================
  // STEP 1:
  // partition all the pokemon into originals and dupes
  // and calculate the max possible values of each synergy
  // ==========================================================
  const allSynergies: { [k in Category]?: number } = {};
  const seenPokemon: { [k in PokemonName]?: boolean } = {};
  let deduplicatedPokemon: PokemonObject[] = [];
  const duplicates: PokemonObject[] = [];
  allPokemon.forEach(pokemon => {
    if (seenPokemon[pokemon.basePokemon.base]) {
      duplicates.push(pokemon);
      return;
    }

    pokemon.basePokemon.categories.forEach(category => {
      allSynergies[category] = (allSynergies[category] ?? 0) + 1;
    });
    deduplicatedPokemon.push(pokemon);
    seenPokemon[pokemon.basePokemon.base] = true;
  });

  // ==========================================================
  // STEP 2:
  // track a board and synergies we're building as we go
  // ==========================================================
  const currentBoard: PokemonObject[] = [];
  const currentSynergyCounts: { [k in Category]?: number } = {};
  /** Function that adds a Pokemon to the current board we're building */
  const addToCurrentBoard = (pokemon: PokemonObject) => {
    //  add to board
    currentBoard.push(pokemon);
    // remove from current working list
    deduplicatedPokemon = deduplicatedPokemon.filter(p => p !== pokemon);
    // and count synergies
    pokemon.basePokemon.categories.forEach(category => {
      currentSynergyCounts[category] =
        (currentSynergyCounts[category] ?? 0) + 1;
    });
  };

  // ==========================================================
  // STEP 3:
  // Always add the "strongest" Pokemon, which should be
  // the first Pokemon in the list (sorted by strength)
  // ==========================================================
  currentBoard.push(deduplicatedPokemon[0]);

  // ==========================================================
  // STEP 4:
  // Find the "key" synergy, ie the one with the highest count
  // Slightly prioritise whatever the strongest Pokemon is
  // ==========================================================
  const [biggestSynergy, biggestSynergyCount] = Object.entries(allSynergies)
    .sort(
      ([aCategory, aCount], [bCategory, bCount]) =>
        aCount +
        (currentSynergyCounts[aCategory as Category] ?? 0) -
        bCount +
        (currentSynergyCounts[bCategory as Category] ?? 0)
    )
    .pop() as [Category, number];

  const biggestSynergyHighestTier = getSynergyTier(
    synergyData[biggestSynergy].thresholds,
    biggestSynergyCount
  );

  // ==========================================================
  // STEP 5:
  // Select the rest of the board one at a time, prioritising:
  //  1. The "key" synergy, up to the highest tier possible
  //  2. Any units that boost the tier of a splash trait
  //  3. The strongest unit out of the rest
  // ==========================================================
  while (currentBoard.length < player.level) {
    // if we're not at the highest possible tier,
    // then try to add the key synergy until we are.
    if (
      getSynergyTier(
        synergyData[biggestSynergy].thresholds,
        currentSynergyCounts[biggestSynergy] ?? 0
      ) < biggestSynergyHighestTier
    ) {
      const mainSynergyMon = deduplicatedPokemon.find(pokemon =>
        pokemon.basePokemon.categories.includes(biggestSynergy)
      );
      if (mainSynergyMon) {
        addToCurrentBoard(mainSynergyMon);
        continue;
      }
    }

    // otherwise, try to add some splash traits in
    const improvesAnyTraitMon = deduplicatedPokemon.find(pokemon =>
      pokemon.basePokemon.categories.some(
        category =>
          getSynergyTier(
            synergyData[category].thresholds,
            (currentSynergyCounts[category] ?? 0) + 1
          ) >
          getSynergyTier(
            synergyData[category].thresholds,
            currentSynergyCounts[category] ?? 0
          )
      )
    );
    if (improvesAnyTraitMon) {
      addToCurrentBoard(improvesAnyTraitMon);
      continue;
    }

    // otherwise, add the strongest Pokemon
    addToCurrentBoard(deduplicatedPokemon[0]);
  }

  // priority is the selected board, duplicates (so we can keep rolling), then remaining dedupes
  // This is relevant because the AI sell fallback logic will delete from the end
  // so let's not sacrifice all the stuff we spent ages rolling for...
  return [...currentBoard, ...duplicates, ...deduplicatedPokemon];
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

  // find board Pokemon with a lot of copies: that's the reroll target
  const allBoardUnits = flatten(player.mainboard)
    .filter(isDefined)
    .map(pokemon => pokemon.basePokemon.base);
  const rerollTarget = allBoardUnits.find(
    pokemonName =>
      (totalCopies[pokemonName] ?? 0) >= 3 &&
      (totalCopies[pokemonName] ?? 0) < 9 &&
      pokemonData[pokemonName].tier <= 3
  );

  /** Whether adding a Pokemon to the mainboard will improve synergies */
  const willImproveSynergies = (pokemon: Pokemon) =>
    !allBoardUnits.some(boardUnit => pokemon.base === boardUnit) &&
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
    );

  // list all the bench units that will improve synergies
  // note: this should be sorted by approxiamte strength because he sideboard should be
  const potentialNextUnits = player.sideboard
    .filter(isDefined)
    .filter(pokemon => willImproveSynergies(pokemon.basePokemon));
  // and also find if there are any already-evolved ready-to-go ones.
  const strongNextUnit = potentialNextUnits.find(
    pokemon => pokemon.basePokemon.stage >= 2
  );

  // then we decide if we want the Pokemon
  const defaultWants = list.map(pokemon => {
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
      strict &&
      player.level === 6 &&
      (totalCopies[pokemon.base] ?? 0) >= 3 &&
      !allBoardUnits.includes(pokemon.name)
    ) {
      return false;
    }

    // strict:
    // NO to random weaker units at higher levels
    // level 3 start ignoring 1* 1-costs, ramping up to selling excess 2/3 costs
    if (
      strict &&
      getPokemonStrength(pokemon) <= player.level + 1 &&
      rerollTarget !== pokemon.base
    ) {
      return false;
    }

    // YES if it matches our forced synergies
    if (pokemon.categories.some(category => forced?.includes(category))) {
      return true;
    }

    // YES if this Pokemon would give an extra tier of a synergy,
    // and player is not max level (ie. can potentially fit on board later)
    if (
      // only flex for forced comps with no explicit splash
      (!forced || forced.length === 1) &&
      // only hold extra units when can still level up
      player.level < 6 &&
      // don't pick up if we already have a candidate for next board unit
      !strongNextUnit &&
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

    // YES if can improve our active on-board synergies
    // and we don't have enough units on bench or some of them are weak
    if (
      (potentialNextUnits.length < 6 - player.level ||
        potentialNextUnits.some(
          potentialUnit => potentialUnit.basePokemon.tier < pokemon.tier
        )) &&
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

  // if we want to sell stuff and can't decide, just sell all the random 1-ofs
  if (strict && !defaultWants.includes(false)) {
    console.warn("AI couldn't decide sells, selling everything not paired");
    return list.map(pokemon => totalCopies[pokemon.base] !== 1);
  }

  // otherwise we should be good
  return defaultWants;
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

function generateHardForceAI(
  primary?: Category,
  splash: readonly Category[] = []
): AIStrategy {
  return {
    name: `Hard Force ${primary} + ${splash.join(' + ')}`,
    /** Buy Pokemon of the categories being forced */
    decideBuys: (player: Player) => {
      const wants = decideWant(
        player,
        player.currentShop.map(pokemon => pokemonData[pokemon]),
        { forced: primary ? [primary, ...splash] : splash }
      );
      return player.currentShop.filter((_, index) => wants[index] === true);
    },
    /**
     * Prioritise Pokemon that will match the forced types
     * and pick the ones that are stronger
     */
    prioritiseBoard: (player: Player) => {
      return genericPrioritiseBoard(player, (a, b) => {
        // always prioritise primary force units (if there is a primary trait)
        const primaryCategoryDiff =
          b.basePokemon.categories.filter(c => c === primary).length -
          a.basePokemon.categories.filter(c => c === primary).length;

        // include secondary categories based on how many there are
        const splashCategoryDiff =
          b.basePokemon.categories.filter(category => splash.includes(category))
            .length -
          a.basePokemon.categories.filter(category => splash.includes(category))
            .length;
        const pokemonStrengthDiff =
          getPokemonStrength(b.basePokemon) - getPokemonStrength(a.basePokemon);
        // pick Pokemon that fit the categories, then order by power
        return primaryCategoryDiff || splashCategoryDiff || pokemonStrengthDiff;
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
  generateHardForceAI('dark'),
  generateHardForceAI('fire'),
  generateHardForceAI('bulky attacker'),
  generateHardForceAI('sweeper'),

  // comps that will focus a trait with some flex units
  generateHardForceAI('dragon'),
  generateHardForceAI('bug'),
  generateHardForceAI('poison'),
  generateHardForceAI('ground'),
  generateHardForceAI('pivot'),
  generateHardForceAI('water'),
  generateHardForceAI('electric'),
  generateHardForceAI('revenge killer'),

  // non-full verticals + explicit supports
  generateHardForceAI('poison', ['disruptor']),
  generateHardForceAI('revenge killer', ['electric']),
  generateHardForceAI('ground', ['bulky attacker']),
  generateHardForceAI('pivot', ['ground']),
  generateHardForceAI('pivot', ['dark']),
  generateHardForceAI('wallbreaker', ['grass', 'steel']),

  // generic frontline + backline
  generateHardForceAI(undefined, ['psychic', 'wall']),
  generateHardForceAI(undefined, ['psychic', 'bulky attacker']),
  generateHardForceAI(undefined, ['sweeper', 'steel']),
  generateHardForceAI(undefined, ['sweeper', 'ghost']),
  generateHardForceAI(undefined, ['wallbreaker', 'wall']),
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
