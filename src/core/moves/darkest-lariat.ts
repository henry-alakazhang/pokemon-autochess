import { PokemonAnimationType } from '../../objects/pokemon.object';
import { getFacing } from '../../scenes/game/combat/combat.helpers';
import { Move, MoveConfig } from '../move.model';

const defenseStat = 'defense' as const;
const damage = [150, 250, 400];

/**
 * Darkest Lariat - Litten line's move
 *
 * Damages surrounding targets, ignoring defense. Should have a low casting cost.
 */
export const darkestLariat = {
  displayName: 'Darkest Lariat',
  type: 'active',
  cost: 6,
  startingPP: 2,
  range: 1,
  targetting: 'unit',
  defenseStat,
  get description() {
    return `{{user}} spins with both arms, hitting all adjacent enemies for ${damage.join(
      '/'
    )} physical damage, plus ${damage
      .map((d) => d * 0.5)
      .join('/')} damage that ignores defense. Heals for ${damage
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
        user.heal(damage[user.basePokemon.stage - 1] * 0.5);
        onComplete();
      },
    });

    const config = { canCrit: true };
    // Base damage
    scene.causeAOEDamage(
      user,
      possibleTargets,
      {
        damage: damage[user.basePokemon.stage - 1],
        defenseStat,
      },
      config
    );
    // Additional true damage
    scene.causeAOEDamage(
      user,
      possibleTargets,
      {
        trueDamage: damage[user.basePokemon.stage - 1] * 0.5,
      },
      config
    );
  },
} as const satisfies Move;
