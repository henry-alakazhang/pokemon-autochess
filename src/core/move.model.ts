import { PokemonObject } from '../objects/pokemon.object';

export type Move = ActiveMove | PassiveMove;
export interface MoveConfig {
  scene: Phaser.Scene;
  board: (PokemonObject | undefined)[][];
  user: PokemonObject;
  target: PokemonObject;
  onComplete: Function;
}

interface ActiveMove {
  displayName: string;
  type: 'active';
  description: string;
  range: number;
  /**
   * Use the move and trigger animations, effects, damage, etc.
   * Calls `onComplete` when all animations and effects are done.
   *
   * Honestly I would rather have it return a Promise,
   * but a callback keeps it more consistent with Phaser.
   */
  use(config: MoveConfig): void;

  /* here follow a bunch of optional fields for damage and effect calculation */

  /**
   * Flat damage at each stage of evolution
   */
  damage?: readonly [number, number, number];
  defenseStat?: 'defense' | 'specDefense';
}

// TODO: implement this
interface PassiveMove {
  displayName: string;
  type: 'passive';
  description: string;
  onAttack?: () => void;
  onBeingHit?: () => void;
  onTurn?: () => void;
  flags: {
    undodgable?: true;
  };
}
