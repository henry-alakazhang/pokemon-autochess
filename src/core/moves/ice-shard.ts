import { flatten } from '../../helpers';
import { PokemonObject } from '../../objects/pokemon.object';
import { Coords } from '../../scenes/game/combat/combat.helpers';
import { CombatBoard } from '../../scenes/game/combat/combat.scene';
import { Move, MoveConfig } from '../move.model';

/**
 * Ice Shard - Weavile line's move
 *
 * Teleports behind you * nothing personnel kid
 *
 * TODO: make this just an auto-crit when that exists
 */
const move = {
  displayName: 'Ice Shard',
  type: 'active',
  cost: 4,
  startingPP: 2,
  defenseStat: 'defense',
  targetting: 'ground',
  get description() {
    return `{{user}} dashes to the weakest enemy and attacks immediately for a guaranteed critical hit.`;
  },
  range: 100,
  getTarget(board: CombatBoard, myCoords: Coords): Coords | undefined {
    const self = board[myCoords.x][myCoords.y];
    let weakest: Coords | undefined;
    let weakestHP = Infinity;
    flatten(
      board.map((col, x) => col.map((pokemon, y) => ({ x, y, pokemon })))
    ).forEach(({ x, y, pokemon }) => {
      if (
        pokemon &&
        self &&
        pokemon.side !== self.side &&
        pokemon.currentHP <= weakestHP
      ) {
        // target is an empty spot next to the weakest unit
        if (x - 1 >= 0 && board[x - 1][y] === undefined) {
          weakest = { x: x - 1, y };
          weakestHP = pokemon.currentHP;
        } else if (x + 1 < board.length && board[x + 1][y] === undefined) {
          weakest = { x: x + 1, y };
          weakestHP = pokemon.currentHP;
        } else if (y - 1 >= 0 && board[x][y - 1] === undefined) {
          weakest = { x, y: y - 1 };
          weakestHP = pokemon.currentHP;
        } else if (y + 1 < board[0].length && board[x][y + 1] === undefined) {
          weakest = { x, y: y + 1 };
          weakestHP = pokemon.currentHP;
        }
      }
    });
    return weakest;
  },
  use({
    scene,
    board,
    user,
    userCoords,
    targetCoords,
    onComplete,
  }: MoveConfig<'ground'>) {
    // make it slightly transparent for extra edginess
    user.setAlpha(0.5);
    scene.movePokemon(userCoords, targetCoords, () => {
      // get the lowest HP enemy nearby
      let weakestPokemon: PokemonObject | undefined;
      let weakestHP = Infinity;
      [
        board[targetCoords.x + 1]?.[targetCoords.y],
        board[targetCoords.x - 1]?.[targetCoords.y],
        board[targetCoords.x]?.[targetCoords.y + 1],
        board[targetCoords.x]?.[targetCoords.y - 1],
      ].forEach(possibleTarget => {
        if (
          possibleTarget &&
          possibleTarget.side !== user.side &&
          possibleTarget.currentHP < weakestHP
        ) {
          weakestPokemon = possibleTarget;
          weakestHP = possibleTarget.currentHP;
        }
      });

      // attack them
      if (weakestPokemon) {
        const prevCritRate = user.critRate;
        user.critRate = 1;
        scene.basicAttack(user, weakestPokemon, () => {
          // reset to previous state
          user.critRate = prevCritRate;
          user.clearAlpha();
          onComplete();
        });
        // reassign target after movement
        user.currentTarget = weakestPokemon;
      }
    });
  },
} as const;

export const iceShard: Move = move;
