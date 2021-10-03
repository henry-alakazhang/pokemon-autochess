import {
  calculateDamage,
  Coords,
  getFacing,
  getGridDistance,
  getOppositeSide,
  inBounds,
  optimiseAOE,
} from '../../scenes/game/combat/combat.helpers';
import { CombatBoard } from '../../scenes/game/combat/combat.scene';
import { getCoordinatesForMainboard } from '../../scenes/game/game.helpers';
import { animations } from '../animations';
import { Move, MoveConfig } from '../move.model';

/**
 * Therian Quake - Landorus's move
 *
 * Transforms into Therian Forme and leaps to the enemy backline to damage an area, lowering attack.
 */
const move = {
  displayName: 'Therian Quake',
  type: 'active',
  cost: 32,
  startingPP: 24,
  damage: [300, 500, 6450],
  defenseStat: 'defense',
  targetting: 'ground',
  get description() {
    return `{{user}} leaps into the air and transforms into its Therian Forme. Then it slams down, dealing ${this.damage.join(
      '/'
    )} damage to a large area and Intimidating them, lowering their Attack by 25%. Does more damage when used in Therian Forme.`;
  },
  range: 99,
  getTarget(board: CombatBoard, user: Coords) {
    return optimiseAOE({
      board,
      user,
      range: 99,
      getAOE: this.getAOE,
      targetting: 'ground',
      needsEmpty: true,
    });
  },
  /**
   * A 2-radius "circle" AOE
   * ordered inside -> out because `use` splices them
   */
  getAOE({ x, y }: Coords) {
    return [
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 },
      { x: x - 2, y },
      { x: x + 2, y },
      { x, y: y + 2 },
      { x, y: y - 2 },
      { x: x + 1, y: y + 1 },
      { x: x + 1, y: y - 1 },
      { x: x - 1, y: y + 1 },
      { x: x - 1, y: y - 1 },
    ];
  },
  use({
    scene,
    board,
    user,
    userCoords,
    targetCoords,
    onComplete,
  }: MoveConfig<'ground'>) {
    let realTarget: Coords | undefined = targetCoords;
    if (board[realTarget.x][realTarget.y]) {
      realTarget = optimiseAOE({
        board,
        user,
        range: 99,
        getAOE: this.getAOE,
        targetting: 'ground',
        needsEmpty: true,
      });
      if (!realTarget) {
        return;
      }
    }

    // immediately swap user to target position so nobody moves into it
    board[realTarget.x][realTarget.y] = user;
    board[userCoords.x][userCoords.y] = undefined;

    const facing = getFacing(userCoords, targetCoords);
    user.playAnimation(facing);

    const targetGraphicalCoords = getCoordinatesForMainboard(targetCoords);
    user.move(
      // a bit above the target location
      { x: targetGraphicalCoords.x, y: targetGraphicalCoords.y - 40 },
      {
        duration: getGridDistance(userCoords, realTarget) * 200,
        onComplete: () => {
          let baseDamage = this.damage[user.basePokemon.stage - 1];
          if (user.texture.key === 'landorus') {
            // if not transformed yet, transform into Landorus Therian
            user.setTexture('landorustherian');
            user.play('landorustherian--down');
            user.changeStats({
              attack: 1.25,
              speed: 0.9,
            });
          } else {
            // if transformed, deal more damage
            baseDamage *= 1.5;
          }

          user.move(targetGraphicalCoords, {
            ease: 'QuadIn',
            duration: 200,
            onComplete: () => {
              // reset target because user has moved
              user.currentTarget = undefined;
              // move is complete after landing
              onComplete();

              // deal damage!
              const applyToCoords = (coords: Coords) => {
                if (!inBounds(board, coords)) {
                  return;
                }
                const graphics = getCoordinatesForMainboard(coords);
                const rockHitEffect = scene.add
                  // slightly lowered to look like it's on the ground
                  .sprite(graphics.x, graphics.y + 20, 'rock-hit')
                  .play('rock-hit')
                  .once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
                    rockHitEffect.destroy();
                  });

                const possibleTarget = board[coords.x][coords.y];
                if (possibleTarget?.side === getOppositeSide(user.side)) {
                  const damage = calculateDamage(user, possibleTarget, {
                    damage: baseDamage,
                    defenseStat: this.defenseStat,
                  });
                  scene.causeDamage(user, possibleTarget, damage, {
                    isAOE: true,
                  });
                  possibleTarget.changeStats({ attack: 0.75 });
                }
              };

              // damage is dealt in two waves.
              const allTargets = this.getAOE(targetCoords);
              // first adjacent tiles...
              allTargets.splice(0, 4).forEach(applyToCoords);
              // then, after those finish playing, tiles one further out
              scene.time.addEvent({
                delay: animations['rock-hit'].duration,
                callback: () => {
                  allTargets.splice(4).forEach(applyToCoords);
                },
              });
            },
          });
        },
      }
    );
  },
} as const;

export const therianQuake: Move = move;
