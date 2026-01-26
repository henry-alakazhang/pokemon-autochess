import { flatten, getRandomInArray, isDefined } from '../../helpers';
import { PokemonAnimationType } from '../../objects/pokemon.object';
import { Coords } from '../../scenes/game/combat/combat.helpers';
import { CombatScene } from '../../scenes/game/combat/combat.scene';
import { Move, MoveConfig } from '../move.model';

const healPercent = [15, 20, 33];

/**
 * Teleport - Abra line's move
 *
 * Teleports to a random spot on the grid, healing and dropping aggro.
 */
export const teleport = {
  displayName: 'Teleport',
  type: 'active',
  cost: 28,
  startingPP: 4,
  range: 1,
  targetting: 'ground',
  get description() {
    return `{{user}} teleports to a random spot on the grid, healing for ${healPercent.join(
      '/'
    )}% missing HP and dropping aggro.`;
  },
  getTarget(board: CombatScene['board'], myCoords: Coords) {
    return myCoords;
  },
  use({ scene, board, user, userCoords, onComplete }: MoveConfig<'ground'>) {
    const animations: PokemonAnimationType[] = ['left', 'up', 'right', 'down'];

    scene.tweens.addCounter({
      from: 0,
      to: 15,
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        user.playAnimation(animations[Math.floor(tween.getValue() ?? 0) % 4]);
      },
      duration: 1000,
      ease: 'Quad.easeIn',
      onComplete: () => {
        const emptySpaces = flatten(
          board.map((col, x) => col.map((pokemon, y) => ({ x, y, pokemon })))
        ).filter(({ pokemon }) => !isDefined(pokemon));
        if (emptySpaces.length === 0) {
          return onComplete();
        }
        const pick = getRandomInArray(emptySpaces);
        user.setVisible(false);
        scene.movePokemon(userCoords, pick, () => {
          user.heal(
            ((user.maxHP - user.currentHP) *
              healPercent[user.basePokemon.stage - 1]) /
              100
          );
          // reset user targetting
          user.currentTarget = undefined;
          // drop aggro from all units targetting the user
          flatten(board).forEach((pokemon) => {
            if (pokemon?.currentTarget === user) {
              pokemon.currentTarget = undefined;
            }
          });
          user.setVisible(true);
          onComplete();
        });
      },
    });
  },
} as const satisfies Move;
