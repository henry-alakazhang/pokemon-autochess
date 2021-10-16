import { flatten, isDefined } from '../../helpers';
import {
  calculateDamage,
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
    return `{{user}} drenches all status-afflicted enemies in poison, dealing ${this.damage.join(
      '/'
    )} damage and PERMANENTLY lowering a random stat. Poisoned enemies take double damage.`;
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
      .filter(
        pokemon =>
          pokemon.side !== user.side &&
          // TODO: don't hardcode this
          // Also update whenever I add a new proper status
          (pokemon.status.paralyse ||
            pokemon.status.poison ||
            pokemon.status.blind ||
            pokemon.status.sleep ||
            pokemon.status.ppReduction ||
            pokemon.status.healReduction ||
            pokemon.statChanges.attack < 0 ||
            pokemon.statChanges.defense < 0 ||
            pokemon.statChanges.specAttack < 0 ||
            pokemon.statChanges.specDefense < 0 ||
            pokemon.statChanges.speed < 0)
      );

    targets.forEach(target => {
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

      const damage = calculateDamage(user, target, {
        damage:
          this.damage[user.basePokemon.stage - 1] *
          (target.status.poison ? 2 : 1),
        defenseStat: this.defenseStat,
      });
      scene.causeDamage(user, target, damage, { isAOE: true });
    });
    onComplete();
  },
} as const;

export const venomDrench: Move = move;