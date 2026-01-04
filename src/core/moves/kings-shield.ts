import { isDefined } from '../../helpers';
import {
  Coords,
  getFacing,
  inBounds,
} from '../../scenes/game/combat/combat.helpers';
import { Move, MoveConfig } from '../move.model';
import { createDamageReductionEffect } from '../status.model';
import * as Tweens from '../tweens';

const getAOE = ({ x, y }: Coords) => {
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
};

const damageReduction = [70, 80, 90];

/**
 * King's Shield - Honedge line's move
 *
 * Gains some damage reduction for 3 seconds, then transforms into Sword Stance and buff self bigly
 */
export const kingsShield = {
  displayName: "King's Shield",
  type: 'active',
  cost: 32,
  startingPP: 28,
  range: 1,
  targetting: 'unit',
  get description() {
    return `{{user}} guards for 2 seconds, reducing incoming damage by ${damageReduction.join(
      '/'
    )}%. Afterwards, it lashes out, lowering Attack of nearby enemies for 8 seconds and raising its own Attack and Defenses for each enemy hit.`;
  },
  getAOE,
  use({
    scene,
    board,
    user,
    userCoords,
    targetCoords,
    onComplete,
  }: MoveConfig<'unit'> & {
    user: {
      /**
       * Ref counter for transformations.
       * This is used to make sure we don't accidentally revert forms at the wrogn time
       */
      moveState: number;
    };
  }) {
    user
      .addStatus('moveIsActive', 2000)
      .addEffect(
        createDamageReductionEffect(
          'kings-shield',
          damageReduction[user.basePokemon.stage - 1]
        ),
        2000
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
    if (user.texture.key === 'aegislash_sword') {
      // Increment cast tracking
      user.moveState += 1;
      user.setTexture('aegislash');
      user.playAnimation(getFacing(userCoords, targetCoords));
    }

    // finish turn; can still take other actions while blocking
    onComplete();
    scene.time.addEvent({
      delay: 2000,
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

        // get all valid targets
        const targets = getAOE(currentCoords)
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
        // increase self stats by one stack, or 2 if it hit 2+ targets
        const targetsHit = targets.length >= 2 ? 2 : 1;
        user.changeStats(
          {
            attack: targetsHit,
            defense: targetsHit,
            specDefense: targetsHit,
          },
          8000
        );

        // aegislash only: changes Forme to sword for duration of buff
        if (user.texture.key === 'aegislash') {
          user.setTexture('aegislash_sword');
          user.playAnimation(getFacing(userCoords, targetCoords));
        }
        scene.time.addEvent({
          delay: 8000,
          callback: () => {
            if (user.texture.key === 'aegislash_sword') {
              // Decrement cast tracking to mark this move usage as fully complete
              // If this is now 0, we can revert to shield forme as the buffs are all gone.
              // If this isn't 0, then Aegislash has used the move again so we should
              // stay in sword forme.
              user.moveState -= 1;
              if (user.moveState <= 0) {
                user.setTexture('aegislash');
                user.playAnimation(getFacing(userCoords, targetCoords));
              }
            }
          },
        });
      },
    });
  },
} as const satisfies Move;
