import { PokemonEffect, PokemonObject } from '../objects/pokemon.object';
import { Coords } from '../scenes/game/combat/combat.helpers';
import { CombatScene } from '../scenes/game/combat/combat.scene';

export type Move = ActiveMove<'ground'> | ActiveMove<'unit'> | PassiveMove;
export type Targetting = 'ground' | 'unit';

export interface MoveConfig<T extends Targetting> {
  scene: CombatScene;
  board: (PokemonObject | undefined)[][];
  user: PokemonObject;
  /** Board coordinates for the user */
  userCoords: Coords;
  /** The targetted Pokemon for the move. Always exists if the move is unit-targetted */
  target: T extends 'unit' ? PokemonObject : PokemonObject | undefined;
  targetCoords: Coords;
  onComplete: () => void;
}

/**
 * Moves which (typically) require PP and have to be used to have an effect
 */
export interface ActiveMove<T extends Targetting> {
  readonly displayName: string;
  readonly type: 'active';
  readonly description: string;
  readonly range: number;

  /** Amount of PP needed to use the move */
  readonly cost: number;
  /** Amount of PP Pokemon starts with */
  readonly startingPP: number;

  /**
   * Whether the move specifically targets a unit or not
   */
  readonly targetting: T;

  /**
   * Picks a target for the move and returns its coordinates,
   * or undefined if no valid target eists
   *
   * Only needs to be defined for moves with special targetting
   * (such as aoe moves, buffs, etc)
   */
  getTarget?(
    board: (PokemonObject | undefined)[][],
    userCoords?: Coords
  ): Coords | undefined;

  /**
   * Returns the set of targetted squares for the move's area
   * of effect when "centered" on a certain square.
   *
   * This may involve the user's own coords (for directional attacks)
   */
  getAOE?(coords: Coords, myCoords?: Coords): Coords[];

  /**
   * Use the move and trigger animations, effects, damage, etc.
   * Calls `onComplete` when all animations and effects are done.
   *
   * Honestly I would rather have it return a Promise,
   * but a callback keeps it more consistent with Phaser.
   */
  use(config: MoveConfig<T>): void;

  /* here follow a bunch of optional fields for damage and effect calculation */

  readonly defenseStat?: 'defense' | 'specDefense';
}

/**
 * Passive moves can have any Effects attached,
 * ... except onMoveUse because the move is not usable.
 * ... except onRoundEnd (TODO: maybe that can be added)
 */
export type PassiveMove = {
  displayName: string;
  type: 'passive';
  description: string;
} & Omit<PokemonEffect, 'onMoveUse' | 'onRoundEnd'>;
