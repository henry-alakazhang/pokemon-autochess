import { flatten } from '../../helpers';
import { Coords } from '../../scenes/game/combat/combat.helpers';
import { CombatScene } from '../../scenes/game/combat/combat.scene';
import { Move, MoveConfig } from '../move.model';

/**
 * Softboiled, Blissey line's move
 *
 * Heals the lowest-health ally for some health.
 *
 * TODO: actually make it target the lowest-health rather than just any low-health
 */
export const softboiled: Move = {
  displayName: 'Softboiled',
  type: 'active',
  damage: [300, 500, 700],
  get description() {
    return `Heals the lowest-health ally for ${this.damage.join('/')}`;
  },
  range: 100,
  /**
   * The target for softboiled is the lowest-health ally, if they're below 2/3 HP.
   */
  getTarget(board: CombatScene['board'], myCoords: Coords): Coords | undefined {
    const self = board[myCoords.x][myCoords.y];
    const found = flatten(
      board.map((col, x) => col.map((pokemon, y) => ({ x, y, pokemon })))
    ).find(
      ({ pokemon }) =>
        pokemon &&
        self &&
        pokemon.side === self.side &&
        pokemon.currentHP <= pokemon.maxHP * 0.66
    );
    // clean pokemon out of coords
    return found ? { x: found.x, y: found.y } : undefined;
  },
  use({ scene, board, user, targetCoords, onComplete }: MoveConfig) {
    const target = board[targetCoords.x][targetCoords.y];
    if (!target) {
      return onComplete();
    }

    // hopping animation
    scene.add.tween({
      targets: [user],
      duration: 150,
      y: user.y - 10,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        // throw egg
        scene.fireProjectile(user, target, { key: 'egg', speed: 300 }, () => {
          const eggCrack = scene.add
            .sprite(target.x, target.y, 'softboiled')
            .play('softboiled')
            .on(Phaser.Animations.Events.SPRITE_ANIMATION_COMPLETE, () => {
              target.heal(this.damage[user.basePokemon.stage - 1]);
              eggCrack.destroy();
            });
        });
        onComplete();
      },
    });
  },
} as const;
