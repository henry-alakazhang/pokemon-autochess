import { PokemonObject } from '../../objects/pokemon.object';
import { Move } from '../move.model';

/**
 * Gale Wings - Talonflame line's move
 *
 * Passive that grants increased attack speed / attack based on HP
 */
const move = {
  displayName: 'Gale Wings',
  type: 'passive',
  flags: {},
  damage: [35, 55, 100],
  get description() {
    return `{{user}} raises its speed while above 50% health. While below 50% health, raises its Attack instead, and recovers ${this.damage.join(
      '/'
    )} HP on hit.`;
  },
  onRoundStart({ self }: { self: PokemonObject }) {
    self.moveState = 'fast';
    self.changeStats({ speed: +1 });
  },
  onBeingHit({ defender }: { defender: PokemonObject }) {
    // bit cheesy: toggle the buff state based on hp after being hit

    if (
      defender.moveState === 'fast' &&
      defender.currentHP / defender.maxHP < 0.5
    ) {
      defender.moveState = 'slow';
      defender.changeStats({ attack: +1, speed: -1 });
    }

    if (
      defender.moveState === 'slow' &&
      defender.currentHP / defender.maxHP > 0.5
    ) {
      defender.moveState = 'fast';
      defender.changeStats({ attack: -1, speed: +1 });
    }
  },
  onHit({ attacker }: { attacker: PokemonObject }) {
    if (attacker.moveState === 'slow') {
      attacker.heal(this.damage[attacker.basePokemon.stage - 1]);
    }
  },
} as const;

export const braveBird: Move = move;
