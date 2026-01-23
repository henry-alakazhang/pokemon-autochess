import { Coords } from '../../scenes/game/combat/combat.helpers';
import { CombatBoard } from '../../scenes/game/combat/combat.scene';
import { Move, MoveConfig } from '../move.model';
import * as Tweens from '../tweens';

const healing = [300, 600, 1000];

/**
 * Purifying Salt - Nacli line's move
 *
 * Nacli cures itself with salt, healing itself and purging negative statuses.
 */
export const purifyingSalt = {
  displayName: 'Purifying Salt',
  type: 'active',
  cost: 16,
  startingPP: 6,
  range: 1,
  targetting: 'ground',
  get description() {
    return `{{user}} cures itself with salt, healing for ${healing.join(
      '/'
    )} HP and purging all negative status effects.
  <br /><strong>Hazard: Stealth Rock.</strong> Deals 250/750 physical damage to all enemies at the start of combat.`;
  },
  getTarget(_: CombatBoard, myCoords: Coords) {
    return myCoords;
  },
  use({ scene, user, onComplete }: MoveConfig<'ground'>) {
    Tweens.growShrink(scene, {
      targets: [user],
      onComplete: () => {
        user.heal(healing[user.basePokemon.stage - 1]);
        user.purgeNegativeStatuses();
        onComplete();
      },
    });
  },
} as const satisfies Move;
