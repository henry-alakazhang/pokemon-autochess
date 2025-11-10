import {
  Coords,
  getGridDistance,
  optimiseAOE,
} from '../../scenes/game/combat/combat.helpers';
import { CombatBoard } from '../../scenes/game/combat/combat.scene';
import { getCoordinatesForMainboard } from '../../scenes/game/game.helpers';
import { animations } from '../animations';
import { Move, MoveConfig } from '../move.model';

const defenseStat = 'specDefense' as const;
const damage = [240, 360, 640];
const range = 5;

/**
 * 3x3 area centered on a location
 */
const getAOE = ({ x, y }: Coords) => {
  return [
    { x, y },
    { x: x + 1, y },
    { x: x - 1, y },
    { x, y: y + 1 },
    { x, y: y - 1 },
    { x: x + 1, y: y + 1 },
    { x: x + 1, y: y - 1 },
    { x: x - 1, y: y + 1 },
    { x: x - 1, y: y - 1 },
  ];
};

const getTarget = (board: CombatBoard, user: Coords) => {
  return optimiseAOE({
    board,
    user,
    range,
    getAOE,
    targetting: 'unit',
  });
};

/**
 * Tri-Attack, Porygon line's move
 *
 * Flings an bomb that deals 3 waves of damage over increasing areas of effect
 * ie. Neeko from TFT
 *
 * TODO: make the projectile animated
 */
export const triAttack = {
  displayName: 'Tri-Attack',
  type: 'active',
  cost: 24,
  startingPP: 20,
  defenseStat,
  targetting: 'ground',
  get description() {
    return `{{user}} flings a bomb at a single enemy that deals ${damage.join(
      '/'
    )} damage three times. The repeat explosions hit more enemies.`;
  },
  range,
  getTarget,
  getAOE,
  use({ scene, user, targetCoords, onComplete }: MoveConfig<'ground'>) {
    scene.add.tween({
      targets: [user],
      angle: '+=360',
      duration: 500,
      onComplete: () => {
        onComplete();
        const projectile = scene.add.sprite(
          user.x,
          user.y,
          'tri-attack-projectile'
        );
        const gfxTarget = getCoordinatesForMainboard(targetCoords);
        scene.add.tween({
          targets: [projectile],
          x: gfxTarget.x,
          y: gfxTarget.y,
          duration: getGridDistance(user, gfxTarget),
          onComplete: () => {
            projectile.destroy();
            const explosions = scene.add
              .sprite(gfxTarget.x, gfxTarget.y, 'tri-attack')
              .play('tri-attack-fire')
              .setScale(1.25);
            // the animation contains 3 explosions which go off on certain frames
            // set timeouts to inflict damage when the explosions occur

            // explosion 1: single target
            scene.causeAOEDamage(user, [targetCoords], {
              damage: damage[user.basePokemon.stage - 1],
              defenseStat,
            });

            // explosion 2: 9 squares
            scene.time.addEvent({
              callback: () => {
                explosions.play('tri-attack-electric');
                scene.add.tween({
                  targets: [explosions],
                  scaleX: 2,
                  scaleY: 2,
                  duration: 150,
                  ease: Phaser.Math.Easing.Quadratic.In,
                  onComplete: () => {
                    scene.causeAOEDamage(user, getAOE(targetCoords), {
                      damage: damage[user.basePokemon.stage - 1],
                      defenseStat,
                    });
                  },
                });
              },
              delay: animations['tri-attack-fire'].duration,
            });

            // explosion 3: also 9 squares
            scene.time.addEvent({
              callback: () => {
                explosions.play('tri-attack-ice');
                scene.add.tween({
                  targets: [explosions],
                  scaleX: 3,
                  scaleY: 3,
                  duration: 150,
                  ease: Phaser.Math.Easing.Quadratic.In,
                  onComplete: () => {
                    scene.causeAOEDamage(user, getAOE(targetCoords), {
                      damage: damage[user.basePokemon.stage - 1],
                      defenseStat,
                    });
                  },
                });
              },
              delay:
                animations['tri-attack-fire'].duration +
                animations['tri-attack-electric'].duration,
            });
            scene.time.addEvent({
              callback: () => {
                explosions.destroy();
              },
              delay:
                animations['tri-attack-fire'].duration +
                animations['tri-attack-electric'].duration +
                animations['tri-attack-ice'].duration,
            });
          },
        });
      },
    });
  },
} as const satisfies Move;
