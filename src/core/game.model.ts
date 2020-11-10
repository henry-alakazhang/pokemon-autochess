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
  | 'setup sweeper'
  | 'physical attacker'
  | 'special attacker'
  | 'bulky attacker'
  | 'hazard setter'
  | 'status support'
  | 'revenge killer'
  | 'wall breaker'
  | 'wall';

export type Category = Type | Role;

export interface CategoryInfo {
  readonly category: Category;
  readonly displayName: string;
  readonly description: string;
  readonly effectLevels: number[];
  readonly effectValues: {
    [k: number]: { [k: string]: number };
  };
}

export const typeInfo: { [k in Category]?: CategoryInfo } = {
  normal: {
    category: 'normal',
    displayName: 'Normal',
    description: 'Does nothing.',
    effectLevels: [2],
    effectValues: {
      2: {},
    },
  },
};
