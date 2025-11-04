import {
  getOppositeSide,
  inBounds,
} from '../../scenes/game/combat/combat.helpers';
import { getCoordinatesForMainboard } from '../../scenes/game/game.helpers';
import { Move, MoveConfig } from '../move.model';

/**
 * Shadow Ball - Gastly line's move
 *
 * Fires a shadowy ball forward that damages and reduces the Special Defense of units hit.
 */
const move = {
  displayName: 'Shadow Ball',
  type: 'active',
  cost: 20,
  startingPP: 10,
  damage: [350, 550, 900],
  defenseStat: 'specDefense',
  targetting: 'unit',
  get description() {
    return `{{user}} hurls a shadowy blob in a straight line, dealing ${this.damage.join(
      '/'
    )} damage to every enemy hit and sharply lowering their Sp. Defense for 8 seconds.`;
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
    const ballTarget = getCoordinatesForMainboard(endCoords);

    const hasBeenHit: { [k: string]: boolean } = {};
    // shadow ball uses collision-based damage due to its slow projectile
    const ball = scene.physics.add
      .sprite(user.x, user.y, 'shadow-ball')
      .play('shadow-ball-start')
      .once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
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
                (pokemon) =>
                  !hasBeenHit[pokemon.id] &&
                  pokemon.side === getOppositeSide(user.side)
              );
            // then hit em
            targetsHit.forEach((target) => {
              scene.causeDamage(
                user,
                target,
                {
                  damage: this.damage[user.basePokemon.stage - 1],
                  defenseStat: this.defenseStat,
                },
                { isAOE: true }
              );
              // TODO: don't apply this more than once ever
              target.changeStats(
                {
                  specDefense: -2,
                },
                8000
              );
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

export const shadowBall: Move = move;
