export const enum Type {
  NORMAL = 'normal',
  FIRE = 'fire',
  FIGHTING = 'fighting',
  WATER = 'water',
  FLYING = 'flying',
  GRASS = 'grass',
  POISON = 'poison',
  ELECTRIC = 'electric',
  GROUND = 'ground',
  PSYCHICH = 'psychic',
  ROCK = 'rock',
  ICE = 'ice',
  BUG = 'bug',
  DRAGON = 'dragon',
  GHOST = 'ghost',
  DARK = 'dark',
  STEEL = 'steel',
  FAIRY = 'fairy',
}

export const enum Role {
  SETUP_SWEEPER = 'setup sweeper',
  PHYS_ATTACKER = 'physical attacker',
  SPEC_ATTACKER = 'special attacker',
  BULKY_ATTACKER = 'bulky attacker',
  HAZARD_SETTER = 'hazard setter',
  STATUS_SUPPORT = 'status support',
  REVENGE_KILLER = 'revenge killer',
  WALL_BREAKER = 'wall breaker',
  WALL = 'wall',
}

export type Category = Type | Role;

export interface BasePokemon {
  readonly name: string;
  readonly categories: Category[];
}
