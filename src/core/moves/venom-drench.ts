import { flatten, isDefined } from '../../helpers';
import {
  Coords,
  getRandomTarget,
} from '../../scenes/game/combat/combat.helpers';
import { CombatBoard } from '../../scenes/game/combat/combat.scene';
import { Move, MoveConfig } from '../move.model';
import * as Tweens from '../tweens';

/**
 * Venom Drench - Nihilego's move
 *
 * Deals damage to every enemy based on their status effects, and reduces their stats.
 */
const move = {
  displayName: 'Venom Drench',
  type: 'active',
  cost: 12,
  startingPP: 4,
  damage: [273, 519, 7930],
  defenseStat: 'specDefense',
  targetting: 'unit',
  get description() {
    return `{{user}} drenches all enemies in poison, PERMANENTLY lowering a random stat. If they are already afflicted by status, they also take ${this.damage.join(
      '/'
    )} damage, doubled if poisoned.`;
  },
  range: 99,
  getTarget(board: CombatBoard, user: Coords) {
    return getRandomTarget({
      board,
      user,
    });
  },
  async use({ scene, board, user, onComplete }: MoveConfig<'unit'>) {
    await Tweens.hop(scene, { targets: [user] });
    const stats = [
      'attack',
      'defense',
      'specAttack',
      'specDefense',
      'speed',
    ] as const;

    const targets = flatten(board)
      .filter(isDefined)
      .filter((pokemon) => pokemon.side !== user.side);

    targets.forEach((target) => {
      const isStatused =
        // TODO: don't hardcode this
        // Also update whenever I add a new proper status
        target.status.paralyse ||
        target.status.poison ||
        target.status.blind ||
        target.status.sleep ||
        target.status.ppReduction ||
        target.status.healReduction ||
        target.statChanges.attack < 0 ||
        target.statChanges.defense < 0 ||
        target.statChanges.specAttack < 0 ||
        target.statChanges.specDefense < 0 ||
        target.statChanges.speed < 0;

      const hitEffect = scene.add
        .sprite(target.x, target.y, 'poison-hit')
        .play('poison-hit')
        .once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
          hitEffect.destroy();
        });
      const statToLower = stats[Math.floor(Math.random() * stats.length)];
      target.changeStats({
        [statToLower]: -1,
      });

      if (isStatused) {
        scene.causeDamage(
          user,
          target,
          {
            damage:
              this.damage[user.basePokemon.stage - 1] *
              (target.status.poison ? 2 : 1),
            defenseStat: this.defenseStat,
          },
          { isAOE: true }
        );
      }
    });
    onComplete();
  },
} as const;

export const venomDrench: Move = move;
