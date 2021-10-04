import { isDefined } from '../../helpers';
import {
  calculateDamage,
  Coords,
  inBounds,
} from '../../scenes/game/combat/combat.helpers';
import { CombatScene } from '../../scenes/game/combat/combat.scene';
import { Move, MoveConfig } from '../move.model';
import * as Tweens from '../tweens';

/**
 * Ancient Power (Spot) - Stonjourner's move
 *
 * Deals damage to adjacent enemies and buffs the power of adjacent allies' moves.
 */
const move = {
  displayName: 'Power Spot',
  type: 'active',
  cost: 18,
  startingPP: 18,
  range: 1,
  targetting: 'ground',
  damage: [300, 450, 600],
  buff: [30, 50, 874],
  defenseStat: 'defense',
  get description() {
    return `{{user}} summons a circle of ancient power around it. It deals ${this.damage.join(
      '/'
    )} damage to each adjacent enemy and raises the power of each adjacent ally's moves by ${this.buff.join(
      '/'
    )}% for 6 seconds.`;
  },
  getTarget(board: CombatScene['board'], myCoords: Coords) {
    return myCoords;
  },
  async use({
    scene,
    board,
    user,
    userCoords,
    onComplete,
  }: MoveConfig<'ground'>) {
    // spin once,
    await Tweens.spin(scene, {
      targets: [user],
      height: 20,
      width: 20,
      duration: 250,
    });

    // then spin again while other animations are playing
    Tweens.spin(scene, {
      targets: [user],
      height: 20,
      width: 20,
      duration: 250,
    });
    const targets = [
      { x: userCoords.x + 1, y: userCoords.y },
      { x: userCoords.x - 1, y: userCoords.y },
      { x: userCoords.x, y: userCoords.y + 1 },
      { x: userCoords.x, y: userCoords.y - 1 },
    ]
      .filter(coords => inBounds(board, coords))
      .map(coords => board[coords.x][coords.y])
      .filter(isDefined);

    targets.forEach(target => {
      if (target.side === user.side) {
        // buff allies
        const buffEffect = scene.add
          .sprite(target.x, target.y, 'blue-buff')
          .play('blue-buff')
          .once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            buffEffect.destroy();
          });
        target.addStatus(
          'movePowerBoost',
          6000,
          1 + this.buff[user.basePokemon.stage - 1] / 100
        );
      } else {
        // hit enemies
        const hitEffect = scene.add
          .sprite(target.x, target.y, 'rock-hit')
          .play('rock-hit')
          .once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            hitEffect.destroy();
          });
        const damage = calculateDamage(user, target, {
          damage: this.damage[user.basePokemon.stage - 1],
          defenseStat: this.defenseStat,
        });
        scene.causeDamage(user, target, damage);
      }
    });

    onComplete();
  },
} as const;

export const powerSpot: Move = move;
