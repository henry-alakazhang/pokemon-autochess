import { getTurnDelay } from '../scenes/game/combat/combat.helpers';
import { Category } from './game.model';
import { Move } from './move.model';
import {
  balefulBunker,
  braveBird,
  clone,
  cottonGuard,
  crushGrip,
  darkestLariat,
  darkVoid,
  dragonDance,
  dragonDarts,
  dragonRush,
  eggBarrage,
  flyingPress,
  furyCutter,
  spikyShield,
  gigatonHammer,
  iceShard,
  kingsShield,
  magmaStorm,
  magnetPull,
  megaPunch,
  moonblast,
  mudBomb,
  nightDaze,
  powerSpot,
  psychicNoise,
  purifyingSalt,
  quiverDance,
  razorLeaf,
  razorWind,
  rollout,
  shadowBall,
  shadowTag,
  shellTrap,
  softboiled,
  stoneEdge,
  strangeSteam,
  surf,
  teleport,
  therianQuake,
  thunderWave,
  triAttack,
  twineedle,
  venomDrench,
  doubleShock,
  whirlwind,
  zapCannon,
} from './moves';
import { icicleCrash } from './moves/icicle-crash';
import { drainPunch } from './moves/drain-punch';

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
    /** 300 is slow, 500 is medium, 700 is fast */
    readonly speed: 300 | 500 | 700;
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
        speed: 300,
      },
    },
    move: shadowTag,
  },
  fletchling: {
    categories: ['fire', 'flying', 'revenge killer'],
    tier: 1,
    maxHP: 78,
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
  rotom_wash: {
    categories: ['water', 'electric', 'utility'],
    tier: 4,
    maxHP: 50,
    attack: 65,
    defense: 107,
    specAttack: 105,
    specDefense: 107,
    speed: 86,
    basicAttack: {
      range: 3,
      stat: 'specAttack',
      projectile: {
        key: 'electricdart',
        speed: 300,
      },
    },
    move: thunderWave,
  },
  seedot: {
    categories: ['grass', 'dark', 'disruptor'],
    tier: 1,
    maxHP: 90,
    attack: 100,
    defense: 60,
    specAttack: 90,
    specDefense: 60,
    speed: 80,
    basicAttack: {
      range: 2,
      stat: 'attack',
      projectile: {
        key: 'seed',
        speed: 500,
      },
    },
    move: razorWind,
  },
  weedle: {
    categories: ['bug', 'poison', 'sweeper'],
    tier: 1,
    maxHP: 65,
    attack: 90,
    defense: 40,
    specAttack: 45,
    specDefense: 80,
    speed: 75,
    basicAttack: {
      range: 3,
      stat: 'attack',
      projectile: {
        key: 'stinger',
        speed: 500,
      },
    },
    move: twineedle,
  },
  happiny: {
    categories: ['normal', 'support'],
    tier: 2,
    maxHP: 255,
    attack: 10,
    defense: 10,
    specAttack: 75,
    specDefense: 135,
    speed: 55,
    basicAttack: {
      range: 2,
      stat: 'specAttack',
      projectile: {
        key: 'egg',
        speed: 300,
      },
    },
    move: softboiled,
  },
  scyther: {
    categories: ['bug', 'steel', 'pivot'],
    tier: 4,
    maxHP: 70,
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
    categories: ['water', 'flying', 'sweeper'],
    tier: 1,
    maxHP: 95,
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
    categories: ['ice', 'dark', 'revenge killer'],
    tier: 4,
    maxHP: 70,
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
    categories: ['normal', 'wallbreaker'],
    tier: 3,
    maxHP: 85,
    attack: 80,
    defense: 70,
    specAttack: 135,
    specDefense: 75,
    speed: 90,
    basicAttack: {
      range: 3,
      stat: 'specAttack',
      projectile: {
        key: 'tri-attack-projectile',
        speed: 500,
      },
    },
    move: triAttack,
  },
  magnemite: {
    categories: ['electric', 'steel', 'utility'],
    tier: 2,
    maxHP: 70,
    attack: 70,
    defense: 115,
    specAttack: 130,
    specDefense: 90,
    speed: 60,
    basicAttack: {
      range: 1,
      stat: 'specAttack',
    },
    move: magnetPull,
  },
  grubbin: {
    categories: ['electric', 'bug', 'wallbreaker'],
    tier: 1,
    maxHP: 77,
    attack: 70,
    defense: 90,
    specAttack: 145,
    specDefense: 75,
    speed: 43,
    basicAttack: {
      range: 3,
      stat: 'specAttack',
      projectile: {
        key: 'electricdart',
        speed: 300,
      },
    },
    move: zapCannon,
  },
  wooloo: {
    categories: ['normal', 'wall'],
    tier: 1,
    maxHP: 72,
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
    categories: ['fire', 'bug', 'sweeper'],
    tier: 3,
    maxHP: 85,
    attack: 60,
    defense: 65,
    specAttack: 135,
    specDefense: 105,
    speed: 100,
    basicAttack: {
      range: 3,
      stat: 'specAttack',
      projectile: {
        key: 'firedart',
        speed: 500,
      },
    },
    move: quiverDance,
  },
  gible: {
    categories: ['dragon', 'ground', 'bulky attacker'],
    tier: 3,
    maxHP: 108,
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
    categories: ['dark', 'revenge killer', 'pivot'],
    tier: 3,
    maxHP: 60,
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
    categories: ['psychic', 'sweeper'],
    tier: 2,
    maxHP: 55,
    attack: 50,
    defense: 45,
    specAttack: 135,
    specDefense: 95,
    speed: 120,
    basicAttack: {
      range: 3,
      stat: 'specAttack',
      projectile: {
        key: 'spoon',
        speed: 300,
      },
    },
    move: teleport,
  },
  litten: {
    categories: ['fire', 'dark', 'bulky attacker'],
    tier: 2,
    maxHP: 95,
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
    categories: ['psychic', 'utility'],
    tier: 5,
    maxHP: 106,
    attack: 110,
    defense: 90,
    specAttack: 154,
    specDefense: 90,
    speed: 130,
    basicAttack: {
      range: 3,
      stat: 'specAttack',
    },
    move: clone,
  },
  turtonator: {
    categories: ['fire', 'dragon', 'wall'],
    tier: 4,
    maxHP: 60,
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
  larvitar: {
    categories: ['rock', 'dark', 'revenge killer'],
    tier: 3,
    maxHP: 100,
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
    categories: ['ghost', 'poison', 'disruptor'],
    tier: 2,
    maxHP: 60,
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
  darkrai: {
    categories: ['dark', 'disruptor'],
    tier: 5,
    maxHP: 70,
    attack: 90,
    defense: 90,
    specAttack: 135,
    specDefense: 90,
    speed: 125,
    basicAttack: {
      range: 3,
      stat: 'specAttack',
      projectile: {
        key: 'blackhole',
        speed: 500,
      },
    },
    move: darkVoid,
  },
  exeggcute: {
    categories: ['grass', 'psychic', 'wallbreaker'],
    tier: 3,
    maxHP: 95,
    attack: 95,
    defense: 85,
    specAttack: 125,
    specDefense: 75,
    speed: 55,
    basicAttack: {
      range: 3,
      stat: 'attack',
      projectile: {
        key: 'egg',
        speed: 300,
      },
    },
    move: eggBarrage,
  },
  lapras: {
    categories: ['water', 'ice', 'bulky attacker'],
    tier: 4,
    maxHP: 130,
    attack: 85,
    defense: 80,
    specAttack: 85,
    specDefense: 95,
    speed: 60,
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
    move: surf,
  },
  mudkip: {
    categories: ['water', 'ground', 'pivot'],
    tier: 2,
    maxHP: 100,
    attack: 110,
    defense: 90,
    specAttack: 85,
    specDefense: 90,
    speed: 60,
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
    move: mudBomb,
  },
  regigigas: {
    categories: [],
    tier: 5,
    // hp, attack, defense, specattack, specdefense also get boosted based on pivot stats
    maxHP: 100,
    attack: 160,
    defense: 110,
    specAttack: 80,
    specDefense: 110,
    speed: 100,
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
    move: crushGrip,
  },
  dreepy: {
    categories: ['dragon', 'ghost', 'revenge killer'],
    tier: 3,
    maxHP: 88,
    attack: 120,
    defense: 75,
    specAttack: 100,
    specDefense: 75,
    speed: 142,
    basicAttack: {
      range: 2,
      stat: 'attack',
    },
    move: dragonDarts,
  },
  heatran: {
    categories: ['fire', 'steel', 'wallbreaker'],
    tier: 5,
    maxHP: 91,
    attack: 90,
    defense: 106,
    specAttack: 130,
    specDefense: 106,
    speed: 77,
    basicAttack: {
      range: 1,
      stat: 'specAttack',
    },
    move: magmaStorm,
  },
  landorus: {
    categories: ['ground', 'flying', 'bulky attacker'],
    tier: 5,
    maxHP: 89,
    attack: 125,
    defense: 90,
    specAttack: 115,
    specDefense: 80,
    speed: 101,
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
    move: therianQuake,
  },
  nihilego: {
    categories: ['rock', 'poison', 'wall'],
    tier: 5,
    maxHP: 109,
    attack: 53,
    defense: 47,
    specAttack: 127,
    specDefense: 131,
    speed: 103,
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
    move: venomDrench,
  },
  stonjourner: {
    categories: ['rock', 'support'],
    tier: 4,
    maxHP: 100,
    attack: 125,
    defense: 135,
    specAttack: 20,
    specDefense: 20,
    speed: 70,
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
    move: powerSpot,
  },
  geodude: {
    categories: ['rock', 'ground', 'wall'],
    tier: 1,
    maxHP: 80,
    attack: 120,
    defense: 130,
    specAttack: 55,
    specDefense: 65,
    speed: 45,
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
    move: rollout,
  },
  honedge: {
    categories: ['steel', 'ghost', 'sweeper'],
    tier: 3,
    maxHP: 60,
    attack: 50,
    defense: 140,
    specAttack: 50,
    specDefense: 140,
    speed: 60,
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
    move: kingsShield,
  },
  swinub: {
    categories: ['ice', 'ground', 'disruptor'],
    tier: 2,
    maxHP: 110,
    attack: 130,
    defense: 80,
    specAttack: 70,
    specDefense: 60,
    speed: 80,
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
    move: icicleCrash,
  },
  nacli: {
    categories: ['rock', 'wall', 'hazard setter'],
    tier: 1,
    maxHP: 85,
    attack: 135,
    defense: 130,
    specAttack: 60,
    specDefense: 80,
    speed: 25,
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
    move: purifyingSalt,
  },
  sewaddle: {
    categories: ['grass', 'bug', 'hazard setter'],
    tier: 2,
    maxHP: 75,
    attack: 103,
    defense: 80,
    specAttack: 70,
    specDefense: 80,
    speed: 92,
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
    move: razorLeaf,
  },
  mareanie: {
    categories: ['water', 'poison', 'hazard setter'],
    tier: 3,
    maxHP: 50,
    attack: 63,
    defense: 152,
    specAttack: 53,
    specDefense: 142,
    speed: 35,
    basicAttack: {
      range: 1,
      stat: 'specAttack',
    },
    move: balefulBunker,
  },
  skarmory: {
    categories: ['steel', 'flying', 'hazard setter'],
    tier: 4,
    maxHP: 65,
    attack: 80,
    defense: 140,
    specAttack: 40,
    specDefense: 70,
    speed: 70,
    basicAttack: {
      range: 3,
      stat: 'attack',
      projectile: {
        key: 'wind-projectile',
        speed: 500,
      },
    },
    move: whirlwind,
  },
  hatenna: {
    categories: ['psychic', 'fairy', 'utility'],
    tier: 1,
    maxHP: 57,
    attack: 90,
    defense: 95,
    specAttack: 136,
    specDefense: 103,
    speed: 29,
    basicAttack: {
      range: 1,
      stat: 'specAttack',
    },
    move: psychicNoise,
  },
  tinkatink: {
    categories: ['steel', 'fairy', 'wallbreaker'],
    tier: 2,
    maxHP: 75,
    attack: 75,
    defense: 77,
    specAttack: 70,
    specDefense: 105,
    speed: 94,
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
    move: gigatonHammer,
  },
  koffing: {
    categories: ['poison', 'fairy', 'support'],
    tier: 3,
    maxHP: 65,
    attack: 90,
    defense: 120,
    specAttack: 85,
    specDefense: 70,
    speed: 60,
    basicAttack: {
      range: 2,
      stat: 'specAttack',
      projectile: {
        key: 'stinger',
        speed: 500,
      },
    },
    move: strangeSteam,
  },
  fluttermane: {
    categories: ['ghost', 'fairy', 'disruptor'],
    tier: 4,
    maxHP: 55,
    attack: 55,
    defense: 55,
    specAttack: 135,
    specDefense: 135,
    speed: 135,
    basicAttack: {
      range: 3,
      stat: 'specAttack',
      projectile: {
        key: 'blackhole',
        speed: 500,
      },
    },
    move: moonblast,
  },
  timburr: {
    categories: ['fighting', 'bulky attacker'],
    tier: 1,
    maxHP: 105,
    attack: 140,
    defense: 95,
    specAttack: 55,
    specDefense: 65,
    speed: 45,
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
    move: drainPunch,
  },
  pawmi: {
    categories: ['electric', 'fighting', 'revenge killer'],
    tier: 1,
    maxHP: 70,
    attack: 115,
    defense: 70,
    specAttack: 70,
    specDefense: 60,
    speed: 105,
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
    move: doubleShock,
  },
  chespin: {
    categories: ['grass', 'fighting', 'wall'],
    tier: 2,
    maxHP: 88,
    attack: 107,
    defense: 122,
    specAttack: 74,
    specDefense: 75,
    speed: 64,
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
    move: spikyShield,
  },
  stufful: {
    categories: ['normal', 'fighting', 'bulky attacker'],
    tier: 3,
    maxHP: 120,
    attack: 125,
    defense: 80,
    specAttack: 55,
    specDefense: 60,
    speed: 60,
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
    move: megaPunch,
  },
  hawlucha: {
    categories: ['fighting', 'flying', 'sweeper'],
    tier: 4,
    maxHP: 78,
    attack: 92,
    defense: 75,
    specAttack: 74,
    specDefense: 63,
    speed: 118,
    basicAttack: {
      range: 3,
      stat: 'attack',
    },
    move: flyingPress,
  },
  // NOT A REAL POKEMON
  // ONLY USED FOR NEUTRAL ROUNDS
  neutral_only_rattata: {
    categories: ['normal'],
    tier: 1,
    maxHP: 20,
    attack: 56,
    defense: 35,
    specAttack: 25,
    specDefense: 35,
    speed: 72,
    basicAttack: {
      range: 1,
      stat: 'attack',
    },
    move: {
      displayName: 'Tackle',
      type: 'passive',
      description: `{{user}} tackles as a normal attack. It's not special or top percentage.`,
    },
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
    base: pokemon,
    // effectively sqrt(baseHP) * 100, but rounded to nearest 50
    // most pokemon max HP will range from 700 (50 base HP) to 1000 (100 base HP)
    maxHP: Math.ceil(2 * Math.sqrt(basePokemon.maxHP) - 1) * 50 * multi,
    // just the raw base attack / specAttack stats
    // most range from 70 to 120
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
  pawmi: {
    ...getEvolution('pawmi', 1),
    name: 'pawmi',
    displayName: 'Pawmi',
    evolution: 'pawmo',
  },
  pawmo: {
    ...getEvolution('pawmi', 2),
    name: 'pawmo',
    displayName: 'Pawmo',
    evolution: 'pawmot',
  },
  pawmot: {
    ...getEvolution('pawmi', 3),
    name: 'pawmot',
    displayName: 'Pawmot',
  },
  scyther: {
    ...getEvolution('scyther', 1),
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
    basicAttack: {
      range: 1,
      stat: 'attack',
      unusable: true,
    },
    move: {
      displayName: 'Splash',
      type: 'passive',
      description: `{{user}} flops around to no effect at all. It can't attack.`,
    },
    name: 'magikarp',
    displayName: 'Magikarp',
    evolution: 'magikarp-2',
  },
  'magikarp-2': {
    ...getEvolution('magikarp', 2),
    move: {
      displayName: 'Tackle',
      type: 'passive',
      description: `{{user}} tackles as a normal attack. It has no move.`,
    },
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
  rotom_wash: {
    ...getEvolution('rotom_wash', 1),
    name: 'rotom_wash',
    displayName: 'Rotom Wash',
    evolution: 'rotom_wash-2',
  },
  'rotom_wash-2': {
    ...getEvolution('rotom_wash', 2),
    name: 'rotom_wash-2',
    displayName: 'Rotom Wash',
    evolution: 'rotom_wash-3',
  },
  'rotom_wash-3': {
    ...getEvolution('rotom_wash', 3),
    name: 'rotom_wash-3',
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
  stufful: {
    ...getEvolution('stufful', 1),
    name: 'stufful',
    displayName: 'Stufful',
    evolution: 'bewear',
  },
  bewear: {
    ...getEvolution('stufful', 2),
    name: 'bewear',
    displayName: 'Bewear',
    evolution: 'bewear-2',
  },
  'bewear-2': {
    ...getEvolution('stufful', 3),
    name: 'bewear-2',
    displayName: 'Bewear',
  },
  timburr: {
    ...getEvolution('timburr', 1),
    name: 'timburr',
    displayName: 'Timburr',
    evolution: 'gurdurr',
  },
  gurdurr: {
    ...getEvolution('timburr', 2),
    name: 'gurdurr',
    displayName: 'Gurdurr',
    evolution: 'conkeldurr',
  },
  conkeldurr: {
    ...getEvolution('timburr', 3),
    name: 'conkeldurr',
    displayName: 'Conkeldurr',
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
  chespin: {
    ...getEvolution('chespin', 1),
    name: 'chespin',
    displayName: 'Chespin',
    evolution: 'quilladin',
  },
  quilladin: {
    ...getEvolution('chespin', 2),
    name: 'quilladin',
    displayName: 'Quilladin',
    evolution: 'chesnaught',
  },
  chesnaught: {
    ...getEvolution('chespin', 3),
    name: 'chesnaught',
    displayName: 'Chesnaught',
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
  exeggcute: {
    ...getEvolution('exeggcute', 1),
    name: 'exeggcute',
    displayName: 'Exeggcute',
    evolution: 'exeggutor',
  },
  exeggutor: {
    ...getEvolution('exeggcute', 2),
    name: 'exeggutor',
    displayName: 'Exeggutor',
    evolution: 'exeggutor-2',
  },
  'exeggutor-2': {
    ...getEvolution('exeggcute', 2),
    name: 'exeggutor-2',
    displayName: 'Exeggutor',
  },
  lapras: {
    ...getEvolution('lapras', 1),
    name: 'lapras',
    displayName: 'Lapras',
    evolution: 'lapras-2',
  },
  'lapras-2': {
    ...getEvolution('lapras', 2),
    name: 'lapras-2',
    displayName: 'Lapras',
    evolution: 'lapras-3',
  },
  'lapras-3': {
    ...getEvolution('lapras', 3),
    name: 'lapras-3',
    displayName: 'Lapras',
  },
  mudkip: {
    ...getEvolution('mudkip', 1),
    name: 'mudkip',
    displayName: 'Mudkip',
    evolution: 'marshtomp',
  },
  marshtomp: {
    ...getEvolution('mudkip', 2),
    name: 'marshtomp',
    displayName: 'Marshtomp',
    evolution: 'swampert',
  },
  swampert: {
    ...getEvolution('mudkip', 3),
    name: 'swampert',
    displayName: 'Swampert',
  },
  // the mech from the pivot synergy
  regigigas: {
    ...getEvolution('regigigas', 1),
    name: 'regigigas',
    displayName: 'Regigigas',
    stage: 3,
  },
  dreepy: {
    ...getEvolution('dreepy', 1),
    name: 'dreepy',
    displayName: 'Dreepy',
    evolution: 'drakloak',
  },
  drakloak: {
    ...getEvolution('dreepy', 2),
    name: 'drakloak',
    displayName: 'Drakloak',
    evolution: 'dragapult',
  },
  dragapult: {
    ...getEvolution('dreepy', 3),
    name: 'dragapult',
    displayName: 'Dragapult',
  },
  heatran: {
    ...getEvolution('heatran', 1),
    name: 'heatran',
    displayName: 'Heatran',
    evolution: 'heatran-2',
  },
  'heatran-2': {
    ...getEvolution('heatran', 2),
    name: 'heatran-2',
    displayName: 'Heatran',
    evolution: 'heatran-3',
  },
  'heatran-3': {
    ...getEvolution('heatran', 3),
    name: 'heatran-3',
    displayName: 'Heatran',
  },
  landorus: {
    ...getEvolution('landorus', 1),
    name: 'landorus',
    displayName: 'Landorus',
    evolution: 'landorus-2',
  },
  'landorus-2': {
    ...getEvolution('landorus', 2),
    name: 'landorus-2',
    displayName: 'Landorus',
    evolution: 'landorus-3',
  },
  'landorus-3': {
    ...getEvolution('landorus', 3),
    name: 'landorus-3',
    displayName: 'Landorus',
  },
  // not actually used - just here so the landorus_therian texture gets loaded properly.
  landorus_therian: {
    ...getEvolution('landorus', 3),
    name: 'landorus_therian',
    displayName: 'landorus_therian',
  },
  nihilego: {
    ...getEvolution('nihilego', 1),
    name: 'nihilego',
    displayName: 'Nihilego',
    evolution: 'nihilego-2',
  },
  'nihilego-2': {
    ...getEvolution('nihilego', 2),
    name: 'nihilego-2',
    displayName: 'Nihilego',
    evolution: 'nihilego-3',
  },
  'nihilego-3': {
    ...getEvolution('nihilego', 3),
    name: 'nihilego-3',
    displayName: 'Nihilego',
  },
  stonjourner: {
    ...getEvolution('stonjourner', 1),
    name: 'stonjourner',
    displayName: 'Stonjourner',
    evolution: 'stonjourner-2',
  },
  'stonjourner-2': {
    ...getEvolution('stonjourner', 2),
    name: 'stonjourner-2',
    displayName: 'Stonjourner',
    evolution: 'stonjourner-3',
  },
  'stonjourner-3': {
    ...getEvolution('stonjourner', 3),
    name: 'stonjourner-3',
    displayName: 'Stonjourner',
  },
  geodude: {
    ...getEvolution('geodude', 1),
    name: 'geodude',
    displayName: 'Geodude',
    evolution: 'graveler',
  },
  graveler: {
    ...getEvolution('geodude', 2),
    name: 'graveler',
    displayName: 'Graveler',
    evolution: 'golem',
  },
  golem: {
    ...getEvolution('geodude', 3),
    name: 'golem',
    displayName: 'Golem',
  },
  honedge: {
    ...getEvolution('honedge', 1),
    name: 'honedge',
    displayName: 'Honedge',
    evolution: 'doublade',
  },
  doublade: {
    ...getEvolution('honedge', 2),
    name: 'doublade',
    displayName: 'Doublade',
    evolution: 'aegislash',
  },
  aegislash: {
    ...getEvolution('honedge', 3),
    name: 'aegislash',
    displayName: 'Aegislash',
  },
  // not actually used - just here so the 'aegislash_shield' texture gets loaded properly.
  aegislash_shield: {
    ...getEvolution('honedge', 3),
    name: 'aegislash_shield',
    displayName: 'aegislash_shield',
  },
  swinub: {
    ...getEvolution('swinub', 1),
    name: 'swinub',
    displayName: 'Swinub',
    evolution: 'piloswine',
  },
  piloswine: {
    ...getEvolution('swinub', 2),
    name: 'piloswine',
    displayName: 'Piloswine',
    evolution: 'mamoswine',
  },
  mamoswine: {
    ...getEvolution('swinub', 3),
    name: 'mamoswine',
    displayName: 'Mamoswine',
  },
  nacli: {
    ...getEvolution('nacli', 1),
    name: 'nacli',
    displayName: 'Nacli',
    evolution: 'naclstack',
  },
  naclstack: {
    ...getEvolution('nacli', 2),
    name: 'naclstack',
    displayName: 'Naclstack',
    evolution: 'garganacl',
  },
  garganacl: {
    ...getEvolution('nacli', 3),
    name: 'garganacl',
    displayName: 'Garganacl',
  },
  sewaddle: {
    ...getEvolution('sewaddle', 1),
    name: 'sewaddle',
    displayName: 'Sewaddle',
    evolution: 'swadloon',
  },
  swadloon: {
    ...getEvolution('sewaddle', 2),
    name: 'swadloon',
    displayName: 'Swadloon',
    evolution: 'leavanny',
  },
  leavanny: {
    ...getEvolution('sewaddle', 3),
    name: 'leavanny',
    displayName: 'Leavanny',
  },
  mareanie: {
    ...getEvolution('mareanie', 1),
    name: 'mareanie',
    displayName: 'Mareanie',
    evolution: 'toxapex',
  },
  toxapex: {
    ...getEvolution('mareanie', 2),
    name: 'toxapex',
    displayName: 'Toxapex',
    evolution: 'toxapex-2',
  },
  'toxapex-2': {
    ...getEvolution('mareanie', 3),
    name: 'toxapex-2',
    displayName: 'Toxapex',
  },
  skarmory: {
    ...getEvolution('skarmory', 1),
    name: 'skarmory',
    displayName: 'Skarmory',
    evolution: 'skarmory-2',
  },
  'skarmory-2': {
    ...getEvolution('skarmory', 2),
    name: 'skarmory-2',
    displayName: 'Skarmory',
    evolution: 'skarmory-3',
  },
  'skarmory-3': {
    ...getEvolution('skarmory', 3),
    name: 'skarmory-3',
    displayName: 'Skarmory',
  },
  hatenna: {
    ...getEvolution('hatenna', 1),
    name: 'hatenna',
    displayName: 'Hatenna',
    evolution: 'hattrem',
  },
  hattrem: {
    ...getEvolution('hatenna', 2),
    name: 'hattrem',
    displayName: 'Hattrem',
    evolution: 'hatterene',
  },
  hatterene: {
    ...getEvolution('hatenna', 3),
    name: 'hatterene',
    displayName: 'Hatterene',
  },
  tinkatink: {
    ...getEvolution('tinkatink', 1),
    name: 'tinkatink',
    displayName: 'Tinkatink',
    evolution: 'tinkatuff',
  },
  tinkatuff: {
    ...getEvolution('tinkatink', 2),
    name: 'tinkatuff',
    displayName: 'Tinkatuff',
    evolution: 'tinkaton',
  },
  tinkaton: {
    ...getEvolution('tinkatink', 3),
    name: 'tinkaton',
    displayName: 'Tinkaton',
  },
  koffing: {
    ...getEvolution('koffing', 1),
    name: 'koffing',
    displayName: 'Koffing',
    evolution: 'weezing_galar',
  },
  weezing_galar: {
    ...getEvolution('koffing', 2),
    name: 'weezing_galar',
    displayName: 'Galarian Weezing',
    evolution: 'weezing_galar-2',
  },
  'weezing_galar-2': {
    ...getEvolution('koffing', 3),
    name: 'weezing_galar-2',
    displayName: 'Galarian Weezing',
  },
  fluttermane: {
    ...getEvolution('fluttermane', 1),
    name: 'fluttermane',
    displayName: 'Flutter Mane',
    evolution: 'fluttermane-2',
  },
  'fluttermane-2': {
    ...getEvolution('fluttermane', 2),
    name: 'fluttermane-2',
    displayName: 'Flutter Mane',
    evolution: 'fluttermane-3',
  },
  'fluttermane-3': {
    ...getEvolution('fluttermane', 3),
    name: 'fluttermane-3',
    displayName: 'Flutter Mane',
  },
  hawlucha: {
    ...getEvolution('hawlucha', 1),
    name: 'hawlucha',
    displayName: 'Hawlucha',
    evolution: 'hawlucha-2',
  },
  'hawlucha-2': {
    ...getEvolution('hawlucha', 2),
    name: 'hawlucha-2',
    displayName: 'Hawlucha',
    evolution: 'hawlucha-3',
  },
  'hawlucha-3': {
    ...getEvolution('hawlucha', 3),
    name: 'hawlucha-3',
    displayName: 'Hawlucha',
  },
  neutral_only_rattata: {
    ...getEvolution('neutral_only_rattata', 1),
    name: 'neutral_only_rattata',
    displayName: 'Rattata',
    stage: 2,
  },
} as const;

export type PokemonName = keyof typeof rawPokemonData;
export const allPokemonNames = Object.keys(
  rawPokemonData
) as Array<PokemonName>;
export const buyablePokemon = allPokemonNames.filter(
  (name) => rawPokemonData[name].stage === 1
);

/**
 * The data for Pokemon, exported in a shape guaranteed to match the `Pokemon` type.
 */
export const pokemonData: { [k in PokemonName]: Pokemon } = rawPokemonData;

export const pokemonPerSynergy: { [k in Category]: PokemonName[] } = {
  normal: [],
  fire: [],
  fighting: [],
  water: [],
  flying: [],
  grass: [],
  poison: [],
  electric: [],
  ground: [],
  psychic: [],
  rock: [],
  ice: [],
  bug: [],
  dragon: [],
  ghost: [],
  dark: [],
  steel: [],
  fairy: [],
  sweeper: [],
  'revenge killer': [],
  'bulky attacker': [],
  wallbreaker: [],
  'hazard setter': [],
  wall: [],
  disruptor: [],
  support: [],
  pivot: [],
  utility: [],
};

// add all buyable pokemon of the appropriate synergy
buyablePokemon.forEach((pokemon) => {
  pokemonData[pokemon].categories.forEach((category) => {
    pokemonPerSynergy[category].push(pokemon);
  });
});

// and sort by tier (ascending)
Object.values(pokemonPerSynergy).forEach((list) => {
  list.sort((a, b) => pokemonData[a].tier - pokemonData[b].tier);
});

/**
 * some logging stuff
 * todo: remove in prod
 */
const tiers = {
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
};

const ranges: { [k: number]: number } = {};

const stats = {
  attack: [] as number[],
  specAttack: [] as number[],
  dps: [] as number[],
  maxHP: [] as number[],
};

const defenseTargetting = {
  defense: 0,
  specDefense: 0,
};

console.log(allPokemonNames);

Object.values(basePokemonData).forEach((pokemon) => {
  if (
    'move' in pokemon &&
    'defenseStat' in pokemon.move &&
    pokemon.move.defenseStat
  ) {
    defenseTargetting[pokemon.move.defenseStat]++;
  }

  if (!ranges[pokemon.basicAttack.range]) {
    ranges[pokemon.basicAttack.range] = 0;
  }
  ranges[pokemon.basicAttack.range]++;
  stats[pokemon.basicAttack.stat].push(pokemon[pokemon.basicAttack.stat]);
  stats.dps.push(
    pokemon[pokemon.basicAttack.stat] *
      (1000 / getTurnDelay(pokemon as unknown as Pokemon))
  );
  // copied from getEvolution... whatever
  stats.maxHP.push(Math.round(2 * Math.sqrt(pokemon.maxHP) - 1) * 50 + 200);

  tiers[pokemon.tier]++;
});

console.log('Synergies:', pokemonPerSynergy);
console.log('Stages:', tiers);
console.log('Basic attack ranges:', ranges);
console.log('Basic attack stats', {
  attack: stats.attack.length,
  specAttack: stats.specAttack.length,
  averageDamage:
    [...stats.attack, ...stats.specAttack].reduce((acc, n) => acc + n, 0) /
    (stats.attack.length + stats.specAttack.length),
  averageDps: stats.dps.reduce((acc, n) => acc + n, 0) / stats.dps.length,
});

console.log('hp', {
  average: stats.maxHP.reduce((acc, n) => acc + n, 0) / stats.maxHP.length,
});

console.log('Move damage targetting', defenseTargetting);
