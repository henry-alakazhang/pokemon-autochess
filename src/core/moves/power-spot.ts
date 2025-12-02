import { isDefined } from '../../helpers';
import { Coords, inBounds } from '../../scenes/game/combat/combat.helpers';
import { CombatScene } from '../../scenes/game/combat/combat.scene';
import { Move, MoveConfig } from '../move.model';
import * as Tweens from '../tweens';

const defenseStat = 'defense' as const;
const damage = [300, 500, 1000];
const movePowerBoost = [30, 50, 874];

/**
 * Ancient Power (Spot) - Stonjourner's move
 *
 * Deals damage to adjacent enemies and buffs the power of adjacent allies' moves.
 */
export const powerSpot = {
  displayName: 'Power Spot',
  type: 'active',
  cost: 24,
  startingPP: 16,
  range: 1,
  targetting: 'ground',
  defenseStat,
  get description() {
    return `{{user}} summons a circle of ancient power around it. It deals ${damage.join(
      '/'
    )} damage to each adjacent enemy and raises the power of each adjacent ally's moves by ${movePowerBoost.join(
      '/'
    )}% for 6 seconds.`;
  },
  getTarget(board: CombatScene['board'], myCoords: Coords) {
    return myCoords;
  },
  async use({
    scene,
    board,
    user,
    userCoords,
    onComplete,
  }: MoveConfig<'ground'>) {
    // spin once,
    await Tweens.spin(scene, {
      targets: [user],
      height: 20,
      width: 20,
      duration: 250,
    });

    // then spin again while other animations are playing
    Tweens.spin(scene, {
      targets: [user],
      height: 20,
      width: 20,
      duration: 250,
    });
    const targets = [
      { x: userCoords.x + 1, y: userCoords.y },
      { x: userCoords.x - 1, y: userCoords.y },
      { x: userCoords.x, y: userCoords.y + 1 },
      { x: userCoords.x, y: userCoords.y - 1 },
    ]
      .filter((coords) => inBounds(board, coords))
      .map((coords) => board[coords.x][coords.y])
      .filter(isDefined);

    targets.forEach((target) => {
      if (target.side === user.side) {
        // buff allies
        const buffEffect = scene.add
          .sprite(target.x, target.y, 'blue-buff')
          .play('blue-buff')
          .once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            buffEffect.destroy();
          });
        target.addEffect(
          {
            name: 'powerSpotBoost',
            isNegative: false,
            calculateDamage: ({
              self,
              attacker,
              baseAmount,
              flags: { isAttack },
            }) => {
              if (isAttack || self == attacker) {
                return baseAmount;
              }
              return (
                baseAmount *
                (1 + movePowerBoost[user.basePokemon.stage - 1] / 100)
              );
            },
          },
          6000
        );
      } else {
        // hit enemies
        const hitEffect = scene.add
          .sprite(target.x, target.y, 'rock-hit')
          .play('rock-hit')
          .once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            hitEffect.destroy();
          });
        scene.causeDamage(
          user,
          target,
          {
            damage: damage[user.basePokemon.stage - 1],
            defenseStat,
          },
          { isAOE: true }
        );
      }
    });

    onComplete();
  },
} as const satisfies Move;
