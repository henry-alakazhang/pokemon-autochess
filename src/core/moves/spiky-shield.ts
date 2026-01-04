import { Coords } from '../../scenes/game/combat/combat.helpers';
import { CombatScene } from '../../scenes/game/combat/combat.scene';
import { Move, MoveConfig } from '../move.model';
import * as Tweens from '../tweens';

const defenseStat = 'defense' as const;
const shield = [300, 450, 600];
const damage = [200, 300, 400];

/**
 * AOE for spiky shield - hits all targets in a 3x3
 */
const getAOE = (coords: Coords) => {
  return [
    coords,
    { x: coords.x, y: coords.y + 1 },
    { x: coords.x, y: coords.y - 1 },
    { x: coords.x + 1, y: coords.y },
    { x: coords.x - 1, y: coords.y },
    { x: coords.x + 1, y: coords.y + 1 },
    { x: coords.x + 1, y: coords.y - 1 },
    { x: coords.x - 1, y: coords.y + 1 },
    { x: coords.x - 1, y: coords.y - 1 },
  ];
};

/**
 * Spiky Shield - Chespin line's move
 *
 * Applies a shield that deals AOE damage when it breaks
 */
export const spikyShield = {
  displayName: 'Spiky Shield',
  type: 'active',
  cost: 18,
  startingPP: 14,
  range: 1,
  defenseStat,
  targetting: 'ground',
  get description() {
    return `{{user}} curls up, gaining a ${shield.join(
      '/'
    )} HP shield. When the shield breaks, it explodes to deal ${damage.join(
      '/'
    )} physical damage to nearby enemies.`;
  },
  getTarget(board: CombatScene['board'], myCoords: Coords) {
    return myCoords;
  },
  use({ scene, user, onComplete }: MoveConfig<'ground'>) {
    Tweens.hop(scene, { targets: [user] });

    // Mark move as active until shield breaks
    // to prevent shields from going infinite.
    user.addStatus('moveIsActive', 99_999);

    user.applyShield(shield[user.basePokemon.stage - 1]);

    // Add effect that triggers on shield break
    user.addEffect(
      {
        name: 'spiky-shield',
        isNegative: false,
        onBeingHit({ defender, selfCoords }) {
          // First time shield HP falls below 0:
          if (defender.shieldHP <= 0) {
            // Deal AOE damage to nearby enemies
            const aoeCoords = getAOE(selfCoords);
            scene.causeAOEDamage(
              defender,
              aoeCoords,
              { damage: damage[defender.basePokemon.stage - 1], defenseStat },
              {
                isAttack: false,
                triggerEvents: true,
              }
            );

            // Remove the effect after it triggers
            delete defender.effects['spiky-shield'];
            delete defender.status['moveIsActive'];
          }
        },
      },
      99_999 // Effect lasts until shield breaks (effectively permanent)
    );

    onComplete();
  },
} as const satisfies Move;
