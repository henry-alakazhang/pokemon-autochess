import {
  Coords,
  getFacing,
  getGridDistance,
  mapPokemonCoords,
} from '../../scenes/game/combat/combat.helpers';
import { CombatBoard } from '../../scenes/game/combat/combat.scene';
import { Move, MoveConfig } from '../move.model';

const defenseStat = 'defense' as const;
const bonusDamage = [200, 350, 500];
const activeDamage = [600, 950, 1300];

/**
 * Flying Press - Hawlucha's move
 *
 * Passive: Every third attack deals bonus damage
 * Active: Jumps to the lowest health enemy, deals damage, and bounces back
 */
export const flyingPress = {
  displayName: 'Flying Press',
  type: 'active',
  cost: 16,
  startingPP: 8,
  defenseStat,
  targetting: 'unit',
  get description() {
    return `<strong>Passive:</strong> {{user}} deals ${bonusDamage.join('/')} bonus damage every third attack.
<br /> <strong>Active:</strong> {{user}} leaps to the lowest-health enemy within range, deals ${activeDamage.join('/')} damage, and bounces back. If this KOs the target, {{user}} gains 1 range.`;
  },
  range: 99,
  /**
   * Finds the lowest health enemy within basic-attack range
   */
  getTarget(board: CombatBoard, myCoords: Coords): Coords | undefined {
    const self = board[myCoords.x][myCoords.y];
    let weakestHP = Infinity;
    let weakestCoords: Coords | undefined;

    // Find the lowest health enemy within basic attack range
    mapPokemonCoords(board)
      .filter(
        ({ x, y, pokemon }) =>
          self &&
          pokemon.side !== self.side &&
          getGridDistance(myCoords, { x, y }) <=
            self.basePokemon.basicAttack.range
      )
      .forEach(({ x, y, pokemon }) => {
        if (pokemon.currentHP < weakestHP) {
          weakestHP = pokemon.currentHP;
          weakestCoords = { x, y };
        }
      });

    return weakestCoords;
  },
  /**
   * Passive: Bonus damage every third attack
   */
  onHit({ attacker, defender, scene, flags }) {
    // Only trigger on basic attacks
    if (!flags.isAttack) {
      return;
    }

    attacker.consecutiveAttacks++;
    if (attacker.consecutiveAttacks >= 3) {
      attacker.consecutiveAttacks = 0;
      // Deal bonus damage
      scene.causeDamage(attacker, defender, {
        damage: bonusDamage[attacker.basePokemon.stage - 1],
        defenseStat,
      });
    }
  },
  use({
    scene,
    user,
    userCoords,
    target,
    targetCoords,
    onComplete,
  }: MoveConfig<'unit'>) {
    // Face the target
    user.playAnimation(getFacing(userCoords, targetCoords));

    const originalLocation = { x: user.x, y: user.y };

    // "Jump" onto the enemy (this is purely animation and not actual movement)
    // tween for y: leap above and then down onto target.
    // Maybe there's an easier way to do this lol.
    scene.add.tween({
      targets: [user],
      duration: 200,
      y: Math.min(user.y, target.y) - 64,
      ease: 'Quad.easeOut',
      onComplete: () => {
        scene.add.tween({
          targets: [user],
          duration: 200,
          y: target.y,
          ease: 'Quad.easeIn',
        });
      },
    });
    // tween for x: move directly toward target.
    scene.add.tween({
      targets: [user],
      duration: 400,
      x: target.x,
      ease: 'Quad.easeOut',
      onComplete: () => {
        // Deal damage
        const hpBefore = target.currentHP;
        scene.causeDamage(user, target, {
          damage: activeDamage[user.basePokemon.stage - 1],
          defenseStat,
        });

        // Check if KO and grant range bonus
        if (hpBefore > 0 && target.currentHP <= 0) {
          // Grant 1 range bonus
          user.basePokemon = {
            ...user.basePokemon,
            basicAttack: {
              ...user.basePokemon.basicAttack,
              range: user.basePokemon.basicAttack.range + 1,
            },
          };
        }

        // Bounce back to original position
        scene.add.tween({
          targets: [user],
          duration: 200,
          y: Math.min(originalLocation.y, target.y) - 64,
          ease: 'Quad.easeOut',
          onComplete: () => {
            scene.add.tween({
              targets: [user],
              duration: 200,
              y: originalLocation.y,
              ease: 'Quad.easeIn',
            });
          },
        });
        scene.add.tween({
          targets: [user],
          duration: 400,
          x: originalLocation.x,
          ease: 'Quad.easeIn',
          onComplete: () => {
            // Ensure we're back at the exact original position
            user.setPosition(originalLocation.x, originalLocation.y);
            onComplete();
          },
        });
      },
    });
  },
} as const satisfies Move;
