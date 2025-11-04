import { PokemonAnimationType } from '../../objects/pokemon.object';
import { getFacing } from '../../scenes/game/combat/combat.helpers';
import { Move, MoveConfig } from '../move.model';

/**
 * Darkest Lariat - Litten line's move
 *
 * Damages surrounding targets, ignoring defense. Should have a low casting cost.
 */
const move = {
  displayName: 'Darkest Lariat',
  type: 'active',
  cost: 6,
  startingPP: 2,
  range: 1,
  targetting: 'unit',
  damage: [150, 250, 400],
  defenseStat: 'defense',
  get description() {
    return `{{user}} spins with both arms, hitting all adjacent enemies for ${this.damage.join(
      '/'
    )} physical damage, plus ${this.damage
      .map((d) => d * 0.5)
      .join('/')} damage that ignores defense. Heals for ${this.damage
      .map((d) => d * 0.5)
      .join('/')}`;
  },
  use({
    scene,
    user,
    userCoords,
    targetCoords,
    onComplete,
  }: MoveConfig<'unit'>) {
    const directions: PokemonAnimationType[] = ['left', 'up', 'right', 'down'];
    const possibleTargets = [
      { x: userCoords.x - 1, y: userCoords.y }, // left
      { x: userCoords.x, y: userCoords.y - 1 }, // up
      { x: userCoords.x + 1, y: userCoords.y }, // right
      { x: userCoords.x, y: userCoords.y + 1 }, // down
    ];
    const startingDirection = getFacing(userCoords, targetCoords);
    const startIndex = directions.indexOf(startingDirection);
    // TODO: graphics: add a dark tornado effect
    scene.tweens.addCounter({
      from: 0,
      to: 4,
      duration: 200,
      onUpdate: (tween) => {
        const index = (startIndex + Math.floor(tween.getValue() ?? 0)) % 4;
        user.playAnimation(directions[index]);
      },
      onComplete: () => {
        user.heal(this.damage[user.basePokemon.stage - 1] * 0.5);
        onComplete();
      },
    });

    const config = { canCrit: true };
    // Base damage
    scene.causeAOEDamage(
      user,
      possibleTargets,
      {
        damage: this.damage[user.basePokemon.stage - 1],
        defenseStat: this.defenseStat,
      },
      config
    );
    // Additional true damage
    scene.causeAOEDamage(
      user,
      possibleTargets,
      {
        trueDamage: this.damage[user.basePokemon.stage - 1] * 0.5,
      },
      config
    );
  },
} as const;

export const darkestLariat: Move = move;
