import { NeutralRound } from './game.helpers';

/**
 * This file contains all of the different (random) rounds
 * you can encounter in Adventure Mode.
 *
 * There are 8 stages of wild Pokemon -> trainer -> gym leader rounds,
 * followed by a boss rush against 4 Elite 4 members and the Champion.
 */

export const WILD_POKEMON_ROUNDS: { [k: number]: NeutralRound[] } = [];

export const TRAINER_ROUNDS: { [k: number]: NeutralRound[] } = [];

/**
 * Mapping of stage number to gym leader rounds
 *
 * Each gym leader should be approximately 5x their stage in cost
 */
export const GYM_LEADER_ROUNDS: { [k: number]: NeutralRound[] } = {
  // 5 cost
  1: [
    // { name: 'Brock', /*rock*/ },
    // { name: 'Falkner', /*flying*/ },
    // { name: 'Roxanne', /*rock*/ },
    // { name: 'Roark', /*rock*/ },
    // { name: 'Cilan', /*grass*/ },
    // { name: 'Chili', /*fire*/ },
    // { name: 'Cress', /*water*/ },
    {
      /* normal */
      name: 'Cheren',
      board: [
        { name: 'dubwool', location: { x: 3, y: 2 } },
        { name: 'happiny', location: { x: 5, y: 2 } },
      ],
    },
    // { name: 'Viola', /*bug*/ },
    // { name: 'Ilima', /*normal*/ },
    // { name: 'Milo', /*grass*/ },
    // { name: 'Katy', /*bug*/ },
  ],
  // 10 cost
  2: [
    // { name: 'Misty', /*water*/ },
    // { name: 'Bugsy', /*bug*/ },
    // { name: 'Brawly', /*fighting*/ },
    {
      name: 'Gardenia',
      board: [
        { name: 'quilladin', location: { x: 2, y: 2 } },
        { name: 'exeggcute', location: { x: 2, y: 0 } },
        { name: 'seedot', location: { x: 3, y: 2 } },
      ],
    },
    // { name: 'Lenora', /*normal*/ },
    // { name: 'Roxie', /*poison*/ },
    // { name: 'Grant', /*rock*/ },
    // { name: 'Lana', /*water*/ },
    // { name: 'Nessa', /*water*/ },
    // { name: 'Brassius', /*grass*/ },
  ],
  // 15 cost
  3: [
    {
      name: 'Lt. Surge',
      board: [
        { name: 'pawmo', location: { x: 1, y: 2 } },
        { name: 'magneton', location: { x: 3, y: 2 } },
        { name: 'charjabug', location: { x: 0, y: 0 } },
        { name: 'timburr', location: { x: 4, y: 2 } },
      ],
    },
    // { name: 'Whitney', /*normal*/ },
    // { name: 'Wattson', /*electric*/ },
    // { name: 'Maylene', /*fighting*/ },
    // { name: 'Burgh', /*bug*/ },
    // { name: 'Korrina', /*fighting*/ },
    // { name: 'Kiawe', /*fire*/ },
    // { name: 'Kabu', /*fire*/ },
    // { name: 'Iono', /*electric*/ },
  ],
  // 20 cost
  4: [
    // { name: 'Erika', /*grass*/ },
    {
      name: 'Morty',
      board: [
        { name: 'haunter', location: { x: 0, y: 2 } },
        { name: 'honedge', location: { x: 1, y: 2 } },
        { name: 'lampent', location: { x: 0, y: 0 } },
        { name: 'dreepy', location: { x: 1, y: 0 } },
      ],
    },
    // { name: 'Flannery', /*fire*/ },
    // { name: 'Crasher Wake', /*water*/ },
    // { name: 'Elesa', /*electric*/ },
    // { name: 'Ramos', /*grass*/ },
    // { name: 'Mallow', /*grass*/ },
    // { name: 'Bea', /*fighting*/ },
    // { name: 'Allister', /*ghost*/ },
    // { name: 'Kofu', /*water*/ },
  ],
  // 25 cost
  5: [
    // { name: 'Koga', /*poison*/ },
    // { name: 'Chuck', /*fighting*/ },
    // { name: 'Norman', /*normal*/ },
    // { name: 'Fantina', /*ghost*/ },
    {
      name: 'Clay',
      board: [
        { name: 'golem', location: { x: 3, y: 2 } },
        { name: 'stonjourner', location: { x: 4, y: 1 } },
        { name: 'marshtomp', location: { x: 2, y: 1 } },
        // TODO:
        // { name: 'mamoswine', location: { x: 1, y: 0 } }
      ],
    },
    // { name: 'Clemont', /*electric*/ },
    // { name: 'Sophocles', /*electric*/ },
    // { name: 'Opal', /*fairy*/ },
    // { name: 'Larry', /*normal*/ },
  ],
  6: [
    // { name: 'Sabrina', /*psychic*/ },
    // { name: 'Jasmine', /*steel*/ },
    // { name: 'Winona', /*flying*/ },
    // { name: 'Byron', /*steel*/ },
    // { name: 'Skyla', /*flying*/ },
    // { name: 'Valerie', /*fairy*/ },
    // { name: 'Acerola', /*ghost*/ },
    // { name: 'Gordie', /*rock*/ },
    // { name: 'Melony', /*ice*/ },
    // { name: 'Ryme', /*ghost*/ },
  ],
  7: [
    // { name: 'Blaine', /*fire*/ },
    // { name: 'Pryce', /*ice*/ },
    // { name: 'Tate & Liza', /*psychic*/ },
    // { name: 'Candice', /*ice*/ },
    // { name: 'Brycen', /*ice*/ },
    // { name: 'Drayden', /*dragon*/ },
    // { name: 'Olympia', /*psychic*/ },
    // { name: 'Mina', /*fairy*/ },
    // { name: 'Piers', /*dark*/ },
    // { name: 'Tulip', /*psychic*/ },
  ],
  8: [
    // { name: 'Giovanni', /*ground*/ },
    // { name: 'Clair', /*dragon*/ },
    // { name: 'Juan', /*water*/ },
    // { name: 'Volkner', /*electric*/ },
    // { name: 'Drayden', /*dragon*/ },
    // { name: 'Marlon', /*water*/ },
    // { name: 'Wulfric', /*ice*/ },
    // { name: 'Hapu', /*ground*/ },
    // { name: 'Raihan', /*dragon*/ },
    // { name: 'Grusha', /*ice*/ },
  ],
};

export const ELITE_FOUR_ROUNDS: NeutralRound[] = [];

export const CHAMPION_ROUNDS: NeutralRound[] = [];
