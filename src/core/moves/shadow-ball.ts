import {
  calculateDamage,
  getOppositeSide,
  inBounds,
} from '../../scenes/game/combat/combat.helpers';
import { getCoordinatesForGrid } from '../../scenes/game/combat/combat.scene';
import { Move, MoveConfig } from '../move.model';

/**
 * Shadow Ball - Gastly line's move
 *
 * Fires a shadowy ball forward that damages and reduces the Special Defense of units hit.
 */
export const shadowBall: Move = {
  displayName: 'Shadow Ball',
  type: 'active',
  damage: [300, 550, 800],
  defenseStat: 'specDefense',
  targetting: 'unit',
  get description() {
    return `Hurls a shadowy blob through the target, dealing ${this.damage.join(
      '/'
    )} damage to every target hit and lowering the Special Defense by 50%.`;
  },
  range: 1,
  use({
    scene,
    board,
    user,
    userCoords,
    targetCoords,
    onComplete,
  }: MoveConfig<'unit'>) {
    // calculate how far the ball has to go to reach the end of the board
    const dx = targetCoords.x - userCoords.x;
    const dy = targetCoords.y - userCoords.y;
    const endCoords = { x: targetCoords.x, y: targetCoords.y };
    while (inBounds(board, endCoords)) {
      endCoords.x += dx;
      endCoords.y += dy;
    }
    endCoords.x -= dx;
    endCoords.y -= dy;
    const ballTarget = getCoordinatesForGrid(endCoords);

    const hasBeenHit: { [k: string]: boolean } = {};
    // shadow ball uses collision-based damage due to its slow projectile
    const ball = scene.physics.add
      .sprite(user.x, user.y, 'shadow-ball')
      .play('shadow-ball-start')
      .once(Phaser.Animations.Events.SPRITE_ANIMATION_COMPLETE, () => {
        ball.play('shadow-ball-float');
        scene.add.tween({
          targets: [ball],
          x: ballTarget.x,
          y: ballTarget.y,
          duration: 800,
          onUpdate: () => {
            // get all overlapping units that
            //   a. are enemies
            //   b. haven't been hit
            const targetsHit = scene
              .getOverlappingUnits(ball)
              .filter(
                pokemon =>
                  !hasBeenHit[pokemon.id] &&
                  pokemon.side === getOppositeSide(user.side)
              );
            // then hit em
            targetsHit.forEach(target => {
              const damage = calculateDamage(user, target, {
                damage: this.damage[user.basePokemon.stage - 1],
                defenseStat: this.defenseStat,
              });
              scene.causeDamage(user, target, damage, { isAOE: true });
              // TODO: don't apply this more than once ever
              target.changeStats({
                specDefense: 0.5,
              });
              hasBeenHit[target.id] = true;
            });
          },
          onComplete: () => {
            onComplete();
            ball.destroy();
          },
        });
      });
  },
} as const;
