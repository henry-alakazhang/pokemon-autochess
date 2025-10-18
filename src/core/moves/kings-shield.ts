import { isDefined } from '../../helpers';
import {
  Coords,
  getFacing,
  inBounds,
} from '../../scenes/game/combat/combat.helpers';
import { Move, MoveConfig } from '../move.model';
import * as Tweens from '../tweens';

/**
 * King's Shield - Honedge line's move
 *
 * Gains some damage reduction for 3 seconds, then transforms into Sword Stance and buff self bigly
 */
const move = {
  displayName: "King's Shield",
  type: 'active',
  cost: 32,
  startingPP: 28,
  range: 1,
  targetting: 'unit',
  damage: [70, 80, 90],
  get description() {
    return `{{user}} guards for 2 seconds, reducing incoming damage by ${this.damage.join(
      '/'
    )}%. Afterwards, it lashes out, lowering Attack of nearby enemies for 8 seconds and raising its own Attack and Defense for each enemy hit.`;
  },
  getAOE({ x, y }: Coords) {
    return [
      { x, y },
      { x, y: y + 1 },
      { x, y: y + 1 },
      { x: x + 1, y },
      { x: x + 1, y: y + 1 },
      { x: x + 1, y: y - 1 },
      { x: x - 1, y },
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
  }: MoveConfig<'unit'>) {
    user.addStatus('moveIsActive', 2000);
    user.addStatus(
      'percentDamageReduction',
      2000,
      this.damage[user.basePokemon.stage - 1]
    );

    // graphics: two crossed swords
    const leftSword = scene.add
      .image(user.x, user.y, 'sword')
      .setRotation(-0.9 * Phaser.Math.PI2)
      .setScale(0);
    const rightSword = scene.add
      .image(user.x, user.y, 'sword')
      .setRotation(0.9 * Phaser.Math.PI2)
      .setScale(0);
    scene.add.tween({
      targets: [leftSword, rightSword],
      scaleX: 1,
      scaleY: 1,
      duration: 150,
    });
    user.attach(leftSword);
    user.attach(rightSword);

    // aegislash only: changes Forme visually
    if (user.texture.key === 'aegislash') {
      user.setTexture('aegislashshield');
      user.playAnimation(getFacing(userCoords, targetCoords));
    }

    // finish turn; can still take other actions while blocking
    onComplete();
    scene.time.addEvent({
      delay: 3000,
      callback: () => {
        // find new location if moved
        const currentCoords = scene.getBoardLocationForPokemon(user);
        if (!currentCoords) {
          // dead lol
          return;
        }

        Tweens.hop(scene, { targets: [user] });
        // slice swords
        scene.add.tween({
          targets: [leftSword],
          x: '+=40',
          rotation: '+=1',
          duration: 100,
          onComplete: () => {
            user.detach(leftSword);
            leftSword.destroy();
          },
        });
        scene.add.tween({
          targets: [rightSword],
          x: '-=40',
          rotation: '-=1',
          duration: 100,
          onComplete: () => {
            user.detach(rightSword);
            rightSword.destroy();
          },
        });

        // aegislash only: changes Forme back
        if (user.texture.key === 'aegislashshield') {
          user.setTexture('aegislash');
          user.playAnimation(getFacing(userCoords, targetCoords));
        }

        // get all valid targets
        const targets = this.getAOE(currentCoords)
          .filter((coords) => inBounds(board, coords))
          .map((coords) => board[coords.x][coords.y])
          .filter(isDefined);

        targets.forEach((target) => {
          // reduce their attack
          target.changeStats(
            {
              attack: -1,
            },
            8000
          );
        });
        // increase self attack/speed by one stack, or 2 if it hit 2+ targets
        const targetsHit = targets.length >= 2 ? 2 : 1;
        user.changeStats(
          {
            attack: targetsHit,
            defense: targetsHit,
            specDefense: targetsHit,
          },
          8000
        );
      },
    });
  },
} as const;

export const kingsShield: Move = move;
