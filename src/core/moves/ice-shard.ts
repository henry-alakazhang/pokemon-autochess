import { PokemonObject } from '../../objects/pokemon.object';
import {
  Coords,
  mapPokemonCoords,
} from '../../scenes/game/combat/combat.helpers';
import { CombatBoard } from '../../scenes/game/combat/combat.scene';
import { Move, MoveConfig } from '../move.model';

const defenseStat = 'defense' as const;
const bonusDamage = [400, 550, 1400];

/**
 * Ice Shard - Weavile line's move
 *
 * Teleports behind you * nothing personnel kid
 *
 * TODO: make this just an auto-crit when that exists
 */
export const iceShard = {
  displayName: 'Ice Shard',
  type: 'active',
  cost: 4,
  startingPP: 2,
  defenseStat,
  targetting: 'ground',
  get description() {
    return `{{user}} dashes to the lowest-health enemy and attacks immediately for a guaranteed critical, plus ${bonusDamage.join(
      '/'
    )} damage.`;
  },
  range: 100,
  getTarget(board: CombatBoard, myCoords: Coords): Coords | undefined {
    const self = board[myCoords.x][myCoords.y];
    let weakest: Coords | undefined;
    let weakestHP = Infinity;
    mapPokemonCoords(board).forEach(({ x, y, pokemon }) => {
      if (
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
      ].forEach((possibleTarget) => {
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
        const target = weakestPokemon;
        const prevCritRate = user.critRate;
        user.critRate = 1;
        scene.basicAttack(user, weakestPokemon, {
          onHit: () => {
            const action = {
              damage: bonusDamage[user.basePokemon.stage - 1],
              defenseStat,
            };
            scene.causeDamage(user, target, action);
          },
          onComplete: () => {
            // reset to previous state
            user.critRate = prevCritRate;
            user.clearAlpha();
            onComplete();
          },
        });
        // reassign target after movement
        user.currentTarget = weakestPokemon;
      }
    });
  },
} as const satisfies Move;
