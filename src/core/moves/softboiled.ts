import {
  Coords,
  mapPokemonCoords,
} from '../../scenes/game/combat/combat.helpers';
import { CombatScene } from '../../scenes/game/combat/combat.scene';
import { Move, MoveConfig } from '../move.model';
import * as Tweens from '../tweens';

const healing = [200, 350, 550];

/**
 * Softboiled, Blissey line's move
 *
 * Heals the lowest-health ally for some health.
 *
 * TODO: actually make it target the lowest-health rather than just any low-health
 */
export const softboiled = {
  displayName: 'Softboiled',
  type: 'active',
  cost: 14,
  startingPP: 4,
  targetting: 'unit',
  get description() {
    return `{{user}} throws an egg to the lowest-health ally that that heals it for 20% of their missing HP plus ${healing.join(
      '/'
    )}`;
  },
  range: 100,
  /**
   * The target for softboiled is the lowest-health ally, if they're below 2/3 HP.
   */
  getTarget(board: CombatScene['board'], myCoords: Coords): Coords | undefined {
    const self = board[myCoords.x][myCoords.y];
    const found = mapPokemonCoords(board).find(
      ({ pokemon }) =>
        self &&
        pokemon.side === self.side &&
        pokemon.currentHP <= pokemon.maxHP * 0.66
    );
    // clean pokemon out of coords
    return found ? { x: found.x, y: found.y } : undefined;
  },
  use({ scene, user, target, onComplete }: MoveConfig<'unit'>) {
    Tweens.hop(scene, {
      targets: [user],
      onComplete: () => {
        // throw egg
        scene.fireProjectile(user, target, { key: 'egg', speed: 300 }, () => {
          const eggCrack = scene.add
            .sprite(target.x, target.y, 'softboiled')
            .play('softboiled')
            .on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
              target.heal(
                // move flat healing
                healing[user.basePokemon.stage - 1] +
                  // plus 20% missing health
                  (target.maxHP - target.currentHP) * 0.2
              );
              eggCrack.destroy();
            });
        });
        onComplete();
      },
    });
  },
} as const satisfies Move;
