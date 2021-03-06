import { Category, Role, Type } from './game.model';
import { Move } from './move.model';
import {
  braveBird,
  clone,
  cottonGuard,
  darkestLariat,
  darkVoid,
  dragonDance,
  dragonRush,
  frenzyPlant,
  furyCutter,
  iceShard,
  magnetPull,
  meteorMash,
  nightDaze,
  quiverDance,
  razorWind,
  shadowBall,
  shadowTag,
  shellTrap,
  softboiled,
  stoneEdge,
  teleport,
  thunderWave,
  triAttack,
  twineedle,
  voltTackle,
  zapCannon,
} from './moves';
import { leechLife } from './moves/leech-life';

export interface Attack {
  /** number of squares away the move can reach */
  readonly range: number;
  /** the pokemon stat used for calculating damage */
  readonly stat: 'attack' | 'specAttack';
  /** the pokemon stat used for calculating resistance
   * defaults to the opposite of the attack stat */
  readonly defenseStat?: 'defense' | 'specDefense';
  /** details for the particle/fx for the projectile */
  readonly projectile?: {
    readonly key: string;
    readonly speed: number;
  };
  /**
   * If this attack can't be used.
   * hacky way to implement Pokemon without basic attacks :)
   */
  readonly unusable?: boolean;
}

export interface Pokemon {
  /** Internal ID / name */
  readonly name: PokemonName;
  /** Name for display in-game */
  readonly displayName: string;
  readonly categories: ReadonlyArray<Category>;
  /** Pokemon tier / shop cost */
  readonly tier: 1 | 2 | 3 | 4 | 5;
  readonly maxHP: number;
  readonly maxPP?: number;
  readonly attack: number;
  readonly defense: number;
  readonly specAttack: number;
  readonly specDefense: number;
  readonly speed: number;
  readonly basicAttack: Attack;
  readonly move?: Move;
  readonly evolution?: PokemonName;
  /**
   * Stage 1 Pokemon that this evolves from
   * Used for figuring out shop pools / selling evolved Pokemon
   */
  readonly base: PokemonName;
  /** Evolution stage */
  readonly stage: 1 | 2 | 3;
}

/**
 * The raw data for all the Pokemon bases (fully evolved)
 * Pokemon at different evolution stages is extrapolated from this
 */
const basePokemonData = {
  litwick: {
    base: 'litwick',
    categories: ['fire', 'ghost', 'sweeper'],
    tier: 2,
    maxHP: 60,
    attack: 55,
    defense: 90,
    specAttack: 145,
    specDefense: 90,
    speed: 80,
    basicAttack: {
      range: 3,
      stat: 'specAttack',
      projectile: {
        key: 'firedart',
        speed: 200,
      },
    },
    move: shadowTag,
  },
  fletchling: {
    base: 'fletchling',
    categories: ['fire', 'flying', 'revenge killer'],
    tier: 1,
    maxHP: 78,
    maxPP: 10,
    attack: 81,
    defense: 71,
    specAttack: 74,
    specDefense: 69,
    speed: 126,
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
    move: braveBird,
  },
  rotomw: {
    base: 'rotomw',
    categories: ['water', 'electric', 'support'],
    tier: 4,
    maxHP: 50,
    maxPP: 10,
    attack: 65,
    defense: 107,
    specAttack: 105,
    specDefense: 107,
    speed: 86,
    basicAttack: {
      range: 1,
      stat: 'specAttack',
    },
    move: thunderWave,
  },
  pichu: {
    base: 'pichu',
    categories: ['electric', 'revenge killer'],
    tier: 1,
    maxHP: 60,
    maxPP: 10,
    attack: 90,
    defense: 55,
    specAttack: 90,
    specDefense: 80,
    speed: 110,
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
    move: voltTackle,
  },
  seedot: {
    base: 'seedot',
    categories: ['grass', 'dark', 'disruptor'],
    tier: 1,
    maxHP: 90,
    maxPP: 15,
    attack: 100,
    defense: 60,
    specAttack: 90,
    specDefense: 60,
    speed: 80,
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
    move: razorWind,
  },
  weedle: {
    base: 'weedle',
    categories: ['bug', 'poison', 'sweeper'],
    tier: 1,
    maxHP: 65,
    // slight hack: weedle has 0 PP and an active move which effectively replaces the basic attack
    maxPP: 0,
    attack: 90,
    defense: 40,
    specAttack: 45,
    specDefense: 80,
    speed: 75,
    basicAttack: {
      range: 2,
      stat: 'attack',
      projectile: {
        key: 'stinger',
        speed: 400,
      },
    },
    move: twineedle,
  },
  happiny: {
    base: 'happiny',
    categories: ['normal', 'wall'],
    tier: 2,
    maxHP: 255,
    maxPP: 25,
    attack: 10,
    defense: 10,
    specAttack: 75,
    specDefense: 135,
    speed: 55,
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
    move: softboiled,
  },
  scyther: {
    base: 'scyther',
    // NOTE: Stage 1 Scyther is pure bug
    categories: ['bug', 'steel', 'pivot'],
    tier: 4,
    maxHP: 70,
    maxPP: 10,
    attack: 130,
    defense: 100,
    specAttack: 65,
    specDefense: 80,
    speed: 65,
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
    move: furyCutter,
  },
  magikarp: {
    base: 'magikarp',
    // NOTE: Stage 1 and 2 Magikarp are pure water
    categories: ['water', 'flying', 'sweeper'],
    tier: 1,
    maxHP: 95,
    maxPP: 20,
    attack: 125,
    defense: 79,
    specAttack: 60,
    specDefense: 100,
    speed: 81,
    // NOTE: Stage 1 Magikarp's basic attack is unusable
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
    // NOTE: Stage 1 and 2 Magikarp have no move - only Gyarados has this
    move: dragonDance,
  },
  sneasel: {
    base: 'sneasel',
    categories: ['ice', 'dark', 'revenge killer'],
    tier: 4,
    maxHP: 70,
    maxPP: 12,
    attack: 120,
    defense: 65,
    specAttack: 45,
    specDefense: 85,
    speed: 125,
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
    move: iceShard,
  },
  porygon: {
    base: 'porygon',
    categories: ['normal', 'wallbreaker'],
    tier: 3,
    maxHP: 85,
    maxPP: 22,
    attack: 80,
    defense: 70,
    specAttack: 135,
    specDefense: 75,
    speed: 90,
    basicAttack: {
      range: 2,
      stat: 'specAttack',
      projectile: {
        key: 'tri-attack-projectile',
        speed: 400,
      },
    },
    move: triAttack,
  },
  magnemite: {
    base: 'magnemite',
    categories: ['electric', 'steel', 'support'],
    tier: 2,
    maxHP: 70,
    maxPP: 20,
    attack: 70,
    defense: 115,
    specAttack: 130,
    specDefense: 90,
    speed: 60,
    basicAttack: {
      range: 2,
      stat: 'specAttack',
      projectile: {
        key: 'electricdart',
        speed: 250,
      },
    },
    move: magnetPull,
  },
  grubbin: {
    base: 'grubbin',
    categories: ['electric', 'bug', 'wallbreaker'],
    tier: 1,
    maxHP: 77,
    maxPP: 15,
    attack: 70,
    defense: 90,
    specAttack: 145,
    specDefense: 75,
    speed: 43,
    basicAttack: {
      range: 2,
      stat: 'specAttack',
      projectile: {
        key: 'electricdart',
        speed: 200,
      },
    },
    move: zapCannon,
  },
  wooloo: {
    base: 'wooloo',
    categories: ['normal', 'wall'],
    tier: 1,
    maxHP: 72,
    maxPP: 15,
    attack: 80,
    defense: 100,
    specAttack: 60,
    specDefense: 90,
    speed: 88,
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
    move: cottonGuard,
  },
  larvesta: {
    base: 'larvesta',
    categories: ['fire', 'bug', 'sweeper'],
    tier: 3,
    maxHP: 85,
    maxPP: 16,
    attack: 60,
    defense: 65,
    specAttack: 135,
    specDefense: 105,
    speed: 100,
    basicAttack: {
      range: 1,
      stat: 'specAttack',
    },
    move: quiverDance,
  },
  gible: {
    base: 'gible',
    categories: ['dragon', 'ground', 'bulky attacker'],
    tier: 3,
    maxHP: 108,
    maxPP: 5,
    attack: 130,
    defense: 95,
    specAttack: 80,
    specDefense: 85,
    speed: 102,
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
    move: dragonRush,
  },
  zorua: {
    base: 'zorua',
    categories: ['dark', 'revenge killer'],
    tier: 3,
    maxHP: 60,
    maxPP: 10,
    attack: 105,
    defense: 60,
    specAttack: 120,
    specDefense: 60,
    speed: 105,
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
    move: nightDaze,
  },
  abra: {
    base: 'abra',
    categories: ['psychic', 'sweeper'],
    tier: 2,
    maxHP: 55,
    maxPP: 10,
    attack: 50,
    defense: 45,
    specAttack: 135,
    specDefense: 95,
    speed: 120,
    basicAttack: {
      range: 2,
      stat: 'specAttack',
      projectile: {
        key: 'spoon',
        speed: 300,
      },
    },
    move: teleport,
  },
  litten: {
    base: 'litten',
    categories: ['fire', 'dark', 'bulky attacker'],
    tier: 2,
    maxHP: 95,
    maxPP: 15,
    attack: 115,
    defense: 90,
    specAttack: 80,
    specDefense: 90,
    speed: 60,
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
    move: darkestLariat,
  },
  mewtwo: {
    base: 'mewtwo',
    categories: ['psychic', 'disruptor'],
    tier: 5,
    maxHP: 106,
    maxPP: 10,
    attack: 110,
    defense: 90,
    specAttack: 154,
    specDefense: 90,
    speed: 130,
    basicAttack: {
      range: 2,
      stat: 'specAttack',
    },
    move: clone,
  },
  turtonator: {
    base: 'turtonator',
    categories: ['fire', 'dragon', 'wall'],
    tier: 4,
    maxHP: 60,
    maxPP: 15,
    attack: 78,
    defense: 135,
    specAttack: 91,
    specDefense: 85,
    speed: 36,
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
    move: shellTrap,
  },
  beldum: {
    base: 'beldum',
    categories: ['steel', 'psychic', 'bulky attacker'],
    tier: 3,
    maxHP: 80,
    maxPP: 15,
    attack: 135,
    defense: 130,
    specAttack: 95,
    specDefense: 90,
    speed: 70,
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
    move: meteorMash,
  },
  zubat: {
    base: 'zubat',
    categories: ['poison', 'flying', 'disruptor'],
    tier: 1,
    maxHP: 85,
    maxPP: 10,
    attack: 90,
    defense: 80,
    specAttack: 70,
    specDefense: 80,
    speed: 130,
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
    move: leechLife,
  },
  larvitar: {
    base: 'larvitar',
    categories: ['rock', 'dark', 'bulky attacker'],
    tier: 3,
    maxHP: 100,
    maxPP: 10,
    attack: 134,
    defense: 110,
    specAttack: 95,
    specDefense: 100,
    speed: 61,
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
    move: stoneEdge,
  },
  gastly: {
    base: 'gastly',
    categories: ['ghost', 'poison', 'bulky attacker'],
    tier: 2,
    maxHP: 60,
    maxPP: 10,
    attack: 65,
    defense: 60,
    specAttack: 130,
    specDefense: 75,
    speed: 110,
    basicAttack: {
      range: 1,
      stat: 'specAttack',
    },
    move: shadowBall,
  },
  bulbasaur: {
    base: 'bulbasaur',
    categories: ['grass', 'poison', 'wall'],
    tier: 2,
    maxHP: 80,
    maxPP: 15,
    attack: 82,
    defense: 83,
    specAttack: 100,
    specDefense: 100,
    speed: 80,
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
    move: frenzyPlant,
  },
  darkrai: {
    base: 'darkrai',
    categories: ['dark', 'support'],
    tier: 5,
    maxHP: 70,
    maxPP: 10,
    attack: 90,
    defense: 90,
    specAttack: 135,
    specDefense: 90,
    speed: 125,
    basicAttack: {
      range: 2,
      stat: 'specAttack',
      projectile: {
        key: 'blackhole',
        speed: 250,
      },
    },
    move: darkVoid,
  },
} as const;

/**
 * Returns the evolution of a Pokemon, with its stats scaled based on the evolution stage.
 */
function getEvolution(pokemon: keyof typeof basePokemonData, stage: 1 | 2 | 3) {
  const basePokemon = basePokemonData[pokemon];
  // maxHP and damage scale with Pokemon level
  // stage 1 =x2=> stage 2 =x2=> stage 3
  let multi = 1;
  if (stage === 2) {
    multi = 2;
  }
  if (stage === 3) {
    multi = 4;
  }

  return {
    ...basePokemon,
    maxHP: basePokemon.maxHP * 10 * multi,
    attack: basePokemon.attack * multi,
    specAttack: basePokemon.specAttack * multi,
    stage,
  };
}

/**
 * The raw Pokemon data for all Pokemon, including evolutions.
 * Uses the BasePokemon as a basis
 */
const rawPokemonData = {
  weedle: {
    ...getEvolution('weedle', 1),
    name: 'weedle',
    displayName: 'Weedle',
    evolution: 'kakuna',
  },
  kakuna: {
    ...getEvolution('weedle', 2),
    name: 'kakuna',
    displayName: 'Kakuna',
    evolution: 'beedrill',
  },
  beedrill: {
    ...getEvolution('weedle', 3),
    name: 'beedrill',
    displayName: 'Beedrill',
  },
  happiny: {
    ...getEvolution('happiny', 1),
    name: 'happiny',
    displayName: 'Happiny',
    evolution: 'chansey',
  },
  chansey: {
    ...getEvolution('happiny', 2),
    name: 'chansey',
    displayName: 'Chansey',
    evolution: 'blissey',
  },
  blissey: {
    ...getEvolution('happiny', 3),
    name: 'blissey',
    displayName: 'Blissey',
  },
  pichu: {
    ...getEvolution('pichu', 1),
    name: 'pichu',
    displayName: 'Pichu',
    evolution: 'pikachu',
  },
  pikachu: {
    ...getEvolution('pichu', 2),
    name: 'pikachu',
    displayName: 'Pikachu',
    evolution: 'raichu',
  },
  raichu: {
    ...getEvolution('pichu', 3),
    name: 'raichu',
    displayName: 'Raichu',
  },
  scyther: {
    ...getEvolution('scyther', 1),
    categories: ['bug', 'pivot'],
    name: 'scyther',
    displayName: 'Scyther',
    evolution: 'scizor-1',
  },
  'scizor-1': {
    ...getEvolution('scyther', 2),
    name: 'scizor-1',
    displayName: 'Scizor',
    evolution: 'scizor-2',
  },
  'scizor-2': {
    ...getEvolution('scyther', 3),
    name: 'scizor-2',
    displayName: 'Scizor',
  },
  magikarp: {
    ...getEvolution('magikarp', 1),
    attack: 0,
    specAttack: 0,
    basicAttack: {
      range: 1,
      stat: 'attack',
      unusable: true,
    },
    categories: ['water', 'sweeper'],
    move: undefined,
    name: 'magikarp',
    displayName: 'Magikarp',
    evolution: 'magikarp-2',
  },
  'magikarp-2': {
    ...getEvolution('magikarp', 2),
    categories: ['water', 'sweeper'],
    move: undefined,
    name: 'magikarp-2',
    displayName: 'Magikarp',
    evolution: 'gyarados',
  },
  gyarados: {
    ...getEvolution('magikarp', 3),
    name: 'gyarados',
    displayName: 'Gyarados',
  },
  porygon: {
    ...getEvolution('porygon', 1),
    name: 'porygon',
    displayName: 'Porygon',
    evolution: 'porygon2',
  },
  porygon2: {
    ...getEvolution('porygon', 2),
    name: 'porygon2',
    displayName: 'Porygon2',
    evolution: 'porygonz',
  },
  porygonz: {
    ...getEvolution('porygon', 3),
    name: 'porygonz',
    displayName: 'Porygon-Z',
  },
  sneasel: {
    ...getEvolution('sneasel', 1),
    name: 'sneasel',
    displayName: 'Sneasel',
    evolution: 'weavile',
  },
  weavile: {
    ...getEvolution('sneasel', 2),
    name: 'weavile',
    displayName: 'Weavile',
    evolution: 'weavile-2',
  },
  'weavile-2': {
    ...getEvolution('sneasel', 3),
    name: 'weavile-2',
    displayName: 'Weavile',
  },
  seedot: {
    ...getEvolution('seedot', 1),
    name: 'seedot',
    displayName: 'Seedot',
    evolution: 'nuzleaf',
  },
  nuzleaf: {
    ...getEvolution('seedot', 2),
    name: 'nuzleaf',
    displayName: 'Nuzleaf',
    evolution: 'shiftry',
  },
  shiftry: {
    ...getEvolution('seedot', 3),
    name: 'shiftry',
    displayName: 'Shiftry',
  },
  litwick: {
    ...getEvolution('litwick', 1),
    name: 'litwick',
    displayName: 'Litwick',
    evolution: 'lampent',
  },
  lampent: {
    ...getEvolution('litwick', 2),
    name: 'lampent',
    displayName: 'Lampent',
    evolution: 'chandelure',
  },
  chandelure: {
    ...getEvolution('litwick', 3),
    name: 'chandelure',
    displayName: 'Chandelure',
  },
  fletchling: {
    ...getEvolution('fletchling', 1),
    name: 'fletchling',
    displayName: 'Fletchling',
    evolution: 'fletchinder',
  },
  fletchinder: {
    ...getEvolution('fletchling', 2),
    name: 'fletchinder',
    displayName: 'Fletchinder',
    evolution: 'talonflame',
  },
  talonflame: {
    ...getEvolution('fletchling', 3),
    name: 'talonflame',
    displayName: 'Talonflame',
  },
  rotomw: {
    ...getEvolution('rotomw', 1),
    name: 'rotomw',
    displayName: 'Rotom Wash',
    evolution: 'rotomw-2',
  },
  'rotomw-2': {
    ...getEvolution('rotomw', 2),
    name: 'rotomw-2',
    displayName: 'Rotom Wash',
    evolution: 'rotomw-3',
  },
  'rotomw-3': {
    ...getEvolution('rotomw', 3),
    name: 'rotomw-3',
    displayName: 'Rotom Wash',
  },
  magnemite: {
    ...getEvolution('magnemite', 1),
    name: 'magnemite',
    displayName: 'Magnemite',
    evolution: 'magneton',
  },
  magneton: {
    ...getEvolution('magnemite', 2),
    name: 'magneton',
    displayName: 'Magneton',
    evolution: 'magnezone',
  },
  magnezone: {
    ...getEvolution('magnemite', 3),
    name: 'magnezone',
    displayName: 'Magnezone',
  },
  grubbin: {
    ...getEvolution('grubbin', 1),
    name: 'grubbin',
    displayName: 'Grubbin',
    evolution: 'charjabug',
  },
  charjabug: {
    ...getEvolution('grubbin', 2),
    name: 'charjabug',
    displayName: 'Charjabug',
    evolution: 'vikavolt',
  },
  vikavolt: {
    ...getEvolution('grubbin', 3),
    name: 'vikavolt',
    displayName: 'Vikavolt',
  },
  wooloo: {
    ...getEvolution('wooloo', 1),
    name: 'wooloo',
    displayName: 'Wooloo',
    evolution: 'dubwool',
  },
  dubwool: {
    ...getEvolution('wooloo', 2),
    name: 'dubwool',
    displayName: 'Dubwool',
    evolution: 'dubwool-2',
  },
  'dubwool-2': {
    ...getEvolution('wooloo', 3),
    name: 'dubwool-2',
    displayName: 'Dubwool',
  },
  larvesta: {
    ...getEvolution('larvesta', 1),
    name: 'larvesta',
    displayName: 'Larvesta',
    evolution: 'volcarona',
  },
  volcarona: {
    ...getEvolution('larvesta', 2),
    name: 'volcarona',
    displayName: 'Volcarona',
    evolution: 'volcarona-2',
  },
  'volcarona-2': {
    ...getEvolution('larvesta', 2),
    name: 'volcarona-2',
    displayName: 'Volcarona',
  },
  gible: {
    ...getEvolution('gible', 1),
    name: 'gible',
    displayName: 'Gible',
    evolution: 'gabite',
  },
  gabite: {
    ...getEvolution('gible', 2),
    name: 'gabite',
    displayName: 'Gabite',
    evolution: 'garchomp',
  },
  garchomp: {
    ...getEvolution('gible', 3),
    name: 'garchomp',
    displayName: 'Garchomp',
  },
  zorua: {
    ...getEvolution('zorua', 1),
    name: 'zorua',
    displayName: 'Zorua',
    evolution: 'zorua-2',
  },
  'zorua-2': {
    ...getEvolution('zorua', 2),
    name: 'zorua-2',
    displayName: 'Zorua',
    evolution: 'zoroark',
  },
  zoroark: {
    ...getEvolution('zorua', 3),
    name: 'zoroark',
    displayName: 'Zoroark',
  },
  abra: {
    ...getEvolution('abra', 1),
    name: 'abra',
    displayName: 'Abra',
    evolution: 'kadabra',
  },
  kadabra: {
    ...getEvolution('abra', 2),
    name: 'kadabra',
    displayName: 'Kadabra',
    evolution: 'alakazam',
  },
  alakazam: {
    ...getEvolution('abra', 3),
    name: 'alakazam',
    displayName: 'Alakazam',
  },
  litten: {
    ...getEvolution('litten', 1),
    name: 'litten',
    displayName: 'Litten',
    evolution: 'torracat',
  },
  torracat: {
    ...getEvolution('litten', 2),
    name: 'torracat',
    displayName: 'Torracat',
    evolution: 'incineroar',
  },
  incineroar: {
    ...getEvolution('litten', 3),
    name: 'incineroar',
    displayName: 'Incineroar',
  },
  mewtwo: {
    ...getEvolution('mewtwo', 1),
    name: 'mewtwo',
    displayName: 'Mewtwo',
    evolution: 'mewtwo-2',
  },
  'mewtwo-2': {
    ...getEvolution('mewtwo', 2),
    name: 'mewtwo-2',
    displayName: 'Mewtwo',
    evolution: 'mewtwo-3',
  },
  'mewtwo-3': {
    ...getEvolution('mewtwo', 3),
    name: 'mewtwo-3',
    displayName: 'Mewtwo',
  },
  turtonator: {
    ...getEvolution('turtonator', 1),
    name: 'turtonator',
    displayName: 'Turtonator',
    evolution: 'turtonator-2',
  },
  'turtonator-2': {
    ...getEvolution('turtonator', 2),
    name: 'turtonator-2',
    displayName: 'Turtonator',
    evolution: 'turtonator-3',
  },
  'turtonator-3': {
    ...getEvolution('turtonator', 3),
    name: 'turtonator-3',
    displayName: 'Turtonator',
  },
  beldum: {
    ...getEvolution('beldum', 1),
    name: 'beldum',
    displayName: 'Beldum',
    evolution: 'metang',
  },
  metang: {
    ...getEvolution('beldum', 2),
    name: 'metang',
    displayName: 'Beldum',
    evolution: 'metagross',
  },
  metagross: {
    ...getEvolution('beldum', 3),
    name: 'metagross',
    displayName: 'Metagross',
  },
  zubat: {
    ...getEvolution('zubat', 1),
    name: 'zubat',
    displayName: 'Zubat',
    evolution: 'golbat',
  },
  golbat: {
    ...getEvolution('zubat', 2),
    name: 'golbat',
    displayName: 'Golbat',
    evolution: 'crobat',
  },
  crobat: {
    ...getEvolution('zubat', 3),
    name: 'crobat',
    displayName: 'Crobat',
  },
  larvitar: {
    ...getEvolution('larvitar', 1),
    name: 'larvitar',
    displayName: 'Larvitar',
    evolution: 'pupitar',
  },
  pupitar: {
    ...getEvolution('larvitar', 2),
    name: 'pupitar',
    displayName: 'Pupitar',
    evolution: 'tyranitar',
  },
  tyranitar: {
    ...getEvolution('larvitar', 3),
    name: 'tyranitar',
    displayName: 'Tyranitar',
  },
  gastly: {
    ...getEvolution('gastly', 1),
    name: 'gastly',
    displayName: 'Gastly',
    evolution: 'haunter',
  },
  haunter: {
    ...getEvolution('gastly', 2),
    name: 'haunter',
    displayName: 'Haunter',
    evolution: 'gengar',
  },
  gengar: {
    ...getEvolution('gastly', 3),
    name: 'gengar',
    displayName: 'Gengar',
  },
  bulbasaur: {
    ...getEvolution('bulbasaur', 1),
    name: 'bulbasaur',
    displayName: 'Bulbasaur',
    evolution: 'ivysaur',
  },
  ivysaur: {
    ...getEvolution('bulbasaur', 2),
    name: 'ivysaur',
    displayName: 'Ivysaur',
    evolution: 'venusaur',
  },
  venusaur: {
    ...getEvolution('bulbasaur', 3),
    name: 'venusaur',
    displayName: 'Venusaur',
  },
  // the plant from bulbasaur line's move uses bulbasaur base stats
  frenzyplant: {
    ...getEvolution('bulbasaur', 1),
    name: 'frenzyplant',
    displayName: 'Frenzy Plant',
    maxPP: undefined,
    move: undefined,
    basicAttack: {
      range: 2,
      stat: 'specAttack',
      projectile: {
        key: 'seed',
        speed: 350,
      },
    },
    // override stage so it doesn't appear in the shop
    stage: 2,
  },
  darkrai: {
    ...getEvolution('darkrai', 1),
    name: 'darkrai',
    displayName: 'Darkrai',
    evolution: 'darkrai-2',
  },
  'darkrai-2': {
    ...getEvolution('darkrai', 2),
    name: 'darkrai-2',
    displayName: 'Darkrai',
    evolution: 'darkrai-3',
  },
  'darkrai-3': {
    ...getEvolution('darkrai', 3),
    name: 'darkrai-3',
    displayName: 'Darkrai',
  },
} as const;

export type PokemonName = keyof typeof rawPokemonData;
export const allPokemonNames = Object.keys(rawPokemonData) as Array<
  PokemonName
>;
export const buyablePokemon = allPokemonNames.filter(
  name => rawPokemonData[name].stage === 1
);

/**
 * The data for Pokemon, exported in a shape guaranteed to match the `Pokemon` type.
 */
export const pokemonData: { [k in PokemonName]: Pokemon } = rawPokemonData;

/**
 * some logging stuff
 * todo: remove in prod
 */

const types: { [k in Type]: number } = {
  normal: 0,
  fire: 0,
  fighting: 0,
  water: 0,
  flying: 0,
  grass: 0,
  poison: 0,
  electric: 0,
  ground: 0,
  psychic: 0,
  rock: 0,
  ice: 0,
  bug: 0,
  dragon: 0,
  ghost: 0,
  dark: 0,
  steel: 0,
  fairy: 0,
};

const roles: { [k in Role]: number } = {
  sweeper: 0,
  'revenge killer': 0,
  'bulky attacker': 0,
  wallbreaker: 0,
  'hazard setter': 0,
  wall: 0,
  disruptor: 0,
  support: 0,
  pivot: 0,
};

const tiers = {
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
};

const ranges: { [k: number]: number } = {};

const attackStats = {
  attack: 0,
  specAttack: 0,
};

Object.values(basePokemonData).forEach(pokemon => {
  // sum up the types/categories
  pokemon.categories.forEach((category: Category) => {
    if (category in types) {
      types[category as Type]++;
    }
    if (category in roles) {
      roles[category as Role]++;
    }
  });

  if (!ranges[pokemon.basicAttack.range]) {
    ranges[pokemon.basicAttack.range] = 0;
  }
  ranges[pokemon.basicAttack.range]++;
  attackStats[pokemon.basicAttack.stat]++;

  tiers[pokemon.tier]++;
});

console.log('Types:', types);
console.log('Roles:', roles);
console.log('Stages:', tiers);
console.log('Basic attack ranges:', ranges);
console.log('Basic attack stats', attackStats);
