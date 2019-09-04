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
      const img = scene.add
        .image(user.x, user.y, 'braveBird')
        .setScale(0.8, 0.8)
        .setRotation(getAngle(user, target));
      scene.add.tween({
        targets: [img],
        duration: 150,
        scaleX: 1.1,
        scaleY: 1.1,
        onComplete: () => {
          scene.add.tween({
            targets: [user, img],
            duration: getTurnDelay(user.basePokemon) * 0.15,
            ...getAttackAnimation(user, getFacing(user, target)),
            yoyo: true,
            ease: 'Power1',
            onYoyo: () => {
              img.destroy();
              target.dealDamage(target.maxHP / 2);
              user.dealDamage(user.maxHP / 8);
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
