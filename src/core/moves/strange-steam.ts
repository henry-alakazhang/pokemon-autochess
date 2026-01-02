import { PokemonObject } from '../../objects/pokemon.object';
import { mapPokemonCoords } from '../../scenes/game/combat/combat.helpers';
import { Move, MoveConfig } from '../move.model';
import * as Tweens from '../tweens';

const damage = [300, 500, 850];
const healing = [150, 250, 425];
const maxBounces = [3, 3, 5];
const defenseStat = 'specDefense' as const;

/**
 * Strange Steam - Koffing / Galarian Weezing's move
 *
 * Sends steam bouncing between enemies and allies, dealing damage / healing.
 */
export const strangeSteam = {
  displayName: 'Strange Steam',
  type: 'active',
  cost: 20,
  startingPP: 10,
  defenseStat,
  targetting: 'unit',
  range: 3,
  description: `{{user}} releases steam that bounces up to ${maxBounces.join('/')} times between random enemies and allies, dealing ${damage.join('/')} special damage to enemies and healing allies for ${healing.join('/')}.`,
  async use({ scene, board, user, target, onComplete }: MoveConfig<'unit'>) {
    await Tweens.hop(scene, { targets: [user] });

    const hitTargets: PokemonObject[] = [];
    const bounce = (prevTarget: PokemonObject, currTarget: PokemonObject) => {
      // Fire the projectile at the target.
      scene.fireProjectile(
        prevTarget,
        currTarget,
        {
          key: 'blackhole',
          speed: 200,
          trajectory: 'wobble',
        },
        () => {
          // On hit, deal damage or heal.
          if (currTarget.side === user.side) {
            currTarget.heal(healing[user.basePokemon.stage - 1]);
          } else {
            scene.causeDamage(user, currTarget, {
              damage: damage[user.basePokemon.stage - 1],
              defenseStat,
            });
          }

          // Then bounce to the next target if we have bounces left.
          hitTargets.push(currTarget);
          if (hitTargets.length < maxBounces[user.basePokemon.stage - 1]) {
            const validTargets = mapPokemonCoords(board)
              .filter(({ pokemon }) => !hitTargets.includes(pokemon))
              // Bounces from enemy to ally and back again
              .filter(({ pokemon }) => pokemon.side !== currTarget.side);
            if (validTargets.length > 0) {
              const nextTarget =
                validTargets[Math.floor(Math.random() * validTargets.length)]
                  .pokemon;
              bounce(currTarget, nextTarget);
            }
          }
        }
      );
    };

    bounce(user, target);
    onComplete();
  },
} as const satisfies Move;
