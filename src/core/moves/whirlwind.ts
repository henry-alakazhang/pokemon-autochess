import {
  Coords,
  getFacing,
  getFurthestTarget,
  inBounds,
} from '../../scenes/game/combat/combat.helpers';
import { CombatBoard } from '../../scenes/game/combat/combat.scene';
import { Move, MoveConfig } from '../move.model';
import * as Tweens from '../tweens';

const defenseStat = 'specDefense' as const;
const damage = [150, 250, 400];

/**
 * Whirlwind - Skarmory line's move
 *
 * Skarmory summons a whirlwind which damages and pushes back a target, reapplying entry hazards.
 * Note: the entry hazard application will be done by the synergy itself lol.
 */
export const whirlwind = {
  displayName: 'Whirlwind',
  type: 'active',
  cost: 18,
  startingPP: 8,
  defenseStat,
  targetting: 'unit',
  get description() {
    return `{{user}} summons a whirlwind on the furthest target that briefly stuns it, deals ${damage.join(
      '/'
    )} damage, pushes it in a random direction and reapplies entry hazards.
    <br /><strong>Hazard: Spikes.</strong> Deals 12.5%/37.5% max HP damage to all enemies at the start of combat. Ignores defenses and synergies.`;
  },
  range: 99,
  getTarget(board: CombatBoard, userCoords: Coords) {
    return getFurthestTarget({
      board,
      user: userCoords,
    });
  },
  use({
    scene,
    board,
    user,
    userCoords,
    target,
    targetCoords,
    onComplete,
  }: MoveConfig<'unit'>) {
    const facing = getFacing(userCoords, targetCoords);
    user.playAnimation(facing);

    Tweens.hop(scene, { targets: [user] });

    target.addStatus('paralyse', 2000);
    const whirlwindSprite = scene.add
      .sprite(target.x, target.y, 'whirlwind')
      .play('whirlwind')
      .once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        // Deal damage
        scene.causeDamage(user, target, {
          damage: damage[user.basePokemon.stage - 1],
          defenseStat,
        });
        // Push around: find an empty space next to the target
        const possiblePushCoords = [
          { x: targetCoords.x + 1, y: targetCoords.y },
          { x: targetCoords.x - 1, y: targetCoords.y },
          { x: targetCoords.x, y: targetCoords.y + 1 },
          { x: targetCoords.x, y: targetCoords.y - 1 },
        ]
          .filter((coords) => inBounds(board, coords))
          .filter(({ x, y }) => !board[x][y]);

        const pushCoords =
          possiblePushCoords[
            Math.floor(Math.random() * possiblePushCoords.length)
          ];
        if (pushCoords) {
          scene.movePokemon(targetCoords, pushCoords);
        }
        whirlwindSprite.destroy();
        onComplete();
      });
  },
} as const satisfies Move;
