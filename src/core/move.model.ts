import { PokemonObject } from '../objects/pokemon.object';
import {
  getAngle,
  getAttackAnimation,
  getFacing,
  getTurnDelay,
} from '../scenes/game/combat/combat.helpers';

export type Move = ActiveMove | PassiveMove;
export type MoveConfig = {
  scene: Phaser.Scene;
  board: (PokemonObject | undefined)[][];
  user: PokemonObject;
  target: PokemonObject;
  onComplete: Function;
};

interface ActiveMove {
  displayName: string;
  type: 'active';
  range: number;
  /**
   * Use the move and trigger animations, effects, damage, etc.
   * Calls `onComplete` when all animations and effects are done.
   *
   * Honestly I would rather have it return a Promise,
   * but a callback keeps it more consistent with Phaser.
   */
  use: (config: MoveConfig) => void;
}

// TODO: implement this
type PassiveMove = {
  displayName: string;
  type: 'passive';
  onAttack: () => void;
  onBeingHit: () => void;
  onTurn: () => void;
} & never;

const rawMoveData = {
  braveBird: {
    displayName: 'Brave Bird',
    type: 'active',
    range: 1,
    use: ({ scene, user, target, onComplete }: MoveConfig) => {
      // animation: bird overlaying on top of Pokemon that grows
      const img = scene.add
        .image(user.x, user.y, 'braveBird')
        .setScale(0.6, 0.6)
        .setRotation(getAngle(user, target));
      // grow bird
      scene.add.tween({
        targets: [img],
        duration: 250,
        scaleX: 1.2,
        scaleY: 1.2,
        onComplete: () => {
          // do attack animation
          scene.add.tween({
            targets: [user, img],
            duration: getTurnDelay(user.basePokemon) * 0.15,
            ...getAttackAnimation(user, getFacing(user, target)),
            yoyo: true,
            ease: 'Power1',
            onYoyo: (_, tweenTarget) => {
              // yoyo is called twice since we're moving both user and img
              // this makes sure the onhit effect is only run once
              if (tweenTarget !== user) {
                return;
              }

              img.destroy();
              // do tons of damage
              target.takeDamage(target.maxHP / 2);
              // recoil
              user.takeDamage(user.maxHP / 8);
              onComplete();
            },
          });
        },
      });
    },
  },
} as const;

export type MoveName = keyof typeof rawMoveData;
export const moveData: { [k in MoveName]: Move } = rawMoveData;
