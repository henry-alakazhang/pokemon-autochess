import { Category } from '../../core/game.model';
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
}

/**
 * Returns the strength difference between two Pokemon, for sorting algos
 *
 * The math uses `stage * 2.5 + tier`, which looks approximately like this:
 *
 * ```
 *       5   4    3    2   1
 *  3 | 12.| 11.| 10.| 9.| 8.|
 *  2 | 10 | 9  | 8  | 7 | 6 |
 *  1 | 7. | 6. | 5. | 4.| 3.|
 * ```
 *
 * This is pretty much how most people rate units in a vacuum (for TFT at least)
 */
function pokemonDiff(a: Pokemon, b: Pokemon): number {
  return a.stage * 2.5 + a.tier - (b.stage * 2.5 + b.tier);
}

const genericPrioritiseBoard: (player: Player) => PokemonObject[] = (
  player: Player
) => {
  return [...flatten(player.mainboard), ...player.sideboard]
    .filter(isDefined)
    .sort((a, b) => pokemonDiff(a.basePokemon, b.basePokemon));
};

/** Simple flexible AI which donkey rolls, prioritising units with categories that match its current Pokemon */
const basicFlexAI: AIStrategy = {
  name: 'Basic Flex',
  decideBuys: (player: Player) => {
    const hasType: { [k in Category]?: boolean } = {};
    // build a map of all the types that are in the player's board and sideboard
    [...flatten(player.mainboard), ...player.sideboard]
      .filter(isDefined)
      .forEach(pokemon =>
        pokemon.basePokemon.categories.forEach(category => {
          hasType[category] = true;
        })
      );
    return player.currentShop.filter(
      pokemon =>
        Object.keys(hasType).length < 3 ||
        pokemonData[pokemon].categories.some(category => hasType[category])
    );
  },
  prioritiseBoard: genericPrioritiseBoard,
  // always reroll if enough gold to buy some units
  decideReroll: (player: Player) => player.gold > 6,
};

const hardForceAI = (forced: readonly Category[]) => ({
  name: `Hard Force ${forced.join(' + ')}`,
  decideBuys: (player: Player) => {
    return player.currentShop.filter(pokemon =>
      pokemonData[pokemon].categories.some(category =>
        forced.includes(category)
      )
    );
  },
  prioritiseBoard: (player: Player) => {
    return [...flatten(player.mainboard), ...player.sideboard]
      .filter(isDefined)
      .sort((a, b) => {
        // number of categories matching the force
        const categoryCountDiff =
          b.basePokemon.categories.filter(category => forced.includes(category))
            .length -
          a.basePokemon.categories.filter(category => forced.includes(category))
            .length;
        // pick Pokemon that fit the categories, then order by power
        return categoryCountDiff || pokemonDiff(b.basePokemon, a.basePokemon);
      });
  },
  decideReroll: (player: Player) => player.gold > 6,
});

const allAI: AIStrategy[] = [
  // single vertical trait comps
  hardForceAI(['dark']),
  // TODO: when there are 6 fire, sweeper etc add them here

  // verticals + supports
  hardForceAI(['poison', 'grass']),
  hardForceAI(['poison', 'electric']),
  hardForceAI(['sweeper', 'electric', 'steel']),
  hardForceAI(['fire', 'support']),
  hardForceAI(['revenge killer', 'electric']),

  // frontline + backline + support
  hardForceAI(['psychic', 'wall', 'ice']),
  hardForceAI(['psychic', 'bulky attacker', 'ice']),
  hardForceAI(['sweeper', 'wall', 'grass']),
  hardForceAI(['sweeper', 'bulky attacker', 'grass']),
  hardForceAI(['wallbreaker', 'wall', 'support']),

  // me mech
  hardForceAI(['pivot', 'steel', 'water']),

  // force some specific carries
  hardForceAI(pokemonData.weedle.categories),
  hardForceAI(pokemonData.magikarp.categories),
  hardForceAI(pokemonData.larvitar.categories),
  hardForceAI(pokemonData.exeggcute.categories),
  hardForceAI(pokemonData.scyther.categories),

  basicFlexAI,
];

export function getRandomAI(): AIStrategy {
  return allAI[Math.floor(Math.random() * allAI.length)];
}
