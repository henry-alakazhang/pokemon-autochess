import {
  Coords,
  getGridDistance,
  getOppositeSide,
  optimiseAOE,
} from '../../scenes/game/combat/combat.helpers';
import {
  CombatBoard,
  getCoordinatesForGrid,
} from '../../scenes/game/combat/combat.scene';
import { animations } from '../animations';
import { Move, MoveConfig } from '../move.model';

/**
 * Tri-Attack, Porygon line's move
 *
 * Flings an bomb that deals 3 waves of damage over increasing areas of effect
 * ie. Neeko from TFT
 *
 * TODO: make the projectile animated
 */
export const triAttack: Move = {
  displayName: 'Tri-Attack',
  type: 'active',
  damage: [200, 350, 600],
  defenseStat: 'specDefense',
  targetting: 'ground',
  get description() {
    return `Flings a bomb that deals ${this.damage.join(
      '/'
    )} 3 times over an increasing area.`;
  },
  range: 3,
  getTarget(board: CombatBoard, user: Coords) {
    return optimiseAOE({
      board,
      user,
      range: this.range,
      getAOE: this.getAOE,
      targetting: 'unit',
    });
  },
  /**
   * 3x3 area centered on a location
   */
  getAOE({ x, y }: Coords) {
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
  },
  use({ scene, board, user, targetCoords, onComplete }: MoveConfig<'ground'>) {
    const damage = this.damage[user.basePokemon.stage - 1];
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
        const gfxTarget = getCoordinatesForGrid(targetCoords);
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
            const singleTarget = board[targetCoords.x][targetCoords.y];
            if (singleTarget?.side === getOppositeSide(user.side)) {
              scene.causeDamage(user, singleTarget, damage, { isAOE: true });
            }

            // explosion 2: 9 squares
            window.setTimeout(() => {
              explosions.play('tri-attack-electric');
              scene.add.tween({
                targets: [explosions],
                scaleX: 2,
                scaleY: 2,
                duration: 150,
                ease: Phaser.Math.Easing.Quadratic.In,
                onComplete: () => {
                  this.getAOE(targetCoords).forEach(({ x, y }) => {
                    const thisTarget = board[x]?.[y];
                    if (thisTarget?.side === getOppositeSide(user.side)) {
                      scene.causeDamage(user, thisTarget, damage, {
                        isAOE: true,
                      });
                    }
                  });
                },
              });
            }, animations['tri-attack-fire'].duration);

            // explosion 3: also 9 squares
            window.setTimeout(() => {
              explosions.play('tri-attack-ice');
              scene.add.tween({
                targets: [explosions],
                scaleX: 3,
                scaleY: 3,
                duration: 150,
                ease: Phaser.Math.Easing.Quadratic.In,
                onComplete: () => {
                  this.getAOE(targetCoords).forEach(({ x, y }) => {
                    const thisTarget = board[x]?.[y];
                    if (thisTarget?.side === getOppositeSide(user.side)) {
                      scene.causeDamage(user, thisTarget, damage, {
                        isAOE: true,
                      });
                    }
                  });
                },
              });
            }, animations['tri-attack-fire'].duration + animations['tri-attack-electric'].duration);
            window.setTimeout(() => {
              explosions.destroy();
            }, animations['tri-attack-fire'].duration + animations['tri-attack-electric'].duration + animations['tri-attack-ice'].duration);
          },
        });
      },
    });
  },
} as const;
