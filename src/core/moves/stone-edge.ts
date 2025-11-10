import { isDefined } from '../../helpers';
import {
  Coords,
  getAngle,
  getOppositeSide,
} from '../../scenes/game/combat/combat.helpers';
import { animations } from '../animations';
import { Move, MoveConfig } from '../move.model';

const getAOE = (targetCoords: Coords, myCoords: Coords): Coords[] => {
  const dx = targetCoords.x - myCoords.x;
  const dy = targetCoords.y - myCoords.y;
  // target and one behind it
  return [targetCoords, { x: targetCoords.x + dx, y: targetCoords.y + dy }];
};

const defenseStat = 'defense' as const;
const damage = [400, 700, 1400];

/**
 * Stone Edge - Larvitar line's move
 *
 * 2-tile piercing rock attack that deals more damage to a single target
 */

export const stoneEdge = {
  displayName: 'Stone Edge',
  type: 'active',
  cost: 10,
  startingPP: 2,
  range: 1,
  targetting: 'unit',
  defenseStat,
  get description() {
    return `{{user}} pierces a single enemy with shards of stone, dealing ${damage.join(
      '/'
    )} damage and hitting any enemy directly behind. Deals 50% more damage if it only hits one enemy.`;
  },
  getAOE,
  use({
    scene,
    board,
    user,
    userCoords,
    target,
    targetCoords,
    onComplete,
  }: MoveConfig<'unit'>) {
    // bit hacky: any duration on moveIsActive will last until the next status check
    // which will run after the turn is compelted
    user.addStatus('moveIsActive', 1);
    // animation: gather some stones
    const stones = scene.add
      .sprite(user.x, user.y, 'stone-edge')
      .setOrigin(0, 0.5)
      .setRotation(getAngle(user, target))
      .play('stone-edge-gather')
      .once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        // animation 2: fire stones
        stones
          .play('stone-edge-shoot')
          .once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            onComplete();
            stones.destroy();
          });

        // deal damage halfway through the shoot part of the animation
        // when the rocks pass through the targets
        scene.time.addEvent({
          callback: () => {
            const targets = getAOE(targetCoords, userCoords)
              .map((coords) => board[coords.x]?.[coords.y])
              .filter(isDefined)
              .filter((pokemon) => pokemon.side === getOppositeSide(user.side));

            const rawBaseDamage = damage[user.basePokemon.stage - 1];
            // deal more damage if there's only one target
            const realBaseDamage =
              targets.length === 1 ? rawBaseDamage * 1.5 : rawBaseDamage;
            scene.causeAOEDamage(
              user,
              targets,
              {
                damage: realBaseDamage,
                defenseStat,
              },
              { canCrit: true }
            );
          },
          delay: animations['stone-edge-shoot'].duration / 2,
        });
      });
  },
} as const satisfies Move;
