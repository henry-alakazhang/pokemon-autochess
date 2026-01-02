import { Coords } from '../../scenes/game/combat/combat.helpers';
import { CombatScene } from '../../scenes/game/combat/combat.scene';
import { Move, MoveConfig } from '../move.model';
import * as Tweens from '../tweens';

const defenseMultiplier = 25 as const;

/**
 * Baleful Bunker - Mareanie line's move
 *
 * Mareanie gains def/spdef and deals extra damage based on its defense
 */
export const balefulBunker = {
  displayName: 'Baleful Bunker',
  type: 'active',
  cost: 10,
  startingPP: 6,
  targetting: 'ground',
  get description() {
    return `For 8 seconds, {{user}} boosts its Defense and Special Defense. When attacking, it deals additional damage equal to ${defenseMultiplier}% of its Defense per poison stack on the target.
<br /><strong>Hazard: Toxic Spikes.</strong> Applies 1/3 stacks of Poison to all enemies at the start of combat.`;
  },
  range: 1,
  getTarget(board: CombatScene['board'], myCoords: Coords) {
    return myCoords;
  },
  use({ scene, user, onComplete }: MoveConfig<'ground'>) {
    Tweens.hop(scene, { targets: [user] });

    const bunkerEffect = scene.add
      .sprite(user.x, user.y, 'baleful-bunker')
      .play('baleful-bunker')
      .once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        bunkerEffect.destroy();
        onComplete();
      });

    // Gain defense and special defense
    user.changeStats(
      {
        defense: 1,
        specDefense: 1,
      },
      8000
    );
    user.addStatus('moveIsActive', 8000);
    user.addEffect(
      {
        name: 'baleful-bunker',
        isNegative: false,
        calculateDamage({ attacker, defender, baseAmount }) {
          if (attacker !== user) {
            return baseAmount;
          }
          return (
            baseAmount +
            user.basePokemon.defense *
              (defender.status.poison?.value ?? 0) *
              (defenseMultiplier / 100)
          );
        },
      },
      8000
    );
  },
} as const satisfies Move;
