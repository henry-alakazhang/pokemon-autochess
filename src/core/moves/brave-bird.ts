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
  damage: [30, 55, 90],
  get description() {
    return `While above 50% health, {{user}} gets a 50% Speed boost. While below 50% health, it becomes brave, getting a 50% Attack boost and recovers ${this.damage.join(
      '/'
    )} HP on hit.`;
  },
  onRoundStart({ self }: { self: PokemonObject }) {
    self.moveState = 'fast';
    self.changeStats({ speed: 1.5 });
  },
  onBeingHit({ defender }: { defender: PokemonObject }) {
    // bit cheesy: toggle the buff state based on hp after being hit

    if (
      defender.moveState === 'fast' &&
      defender.currentHP / defender.maxHP < 0.5
    ) {
      defender.moveState = 'slow';
      defender.changeStats({ attack: 1.5, speed: 1 / 1.5 });
    }

    if (
      defender.moveState === 'slow' &&
      defender.currentHP / defender.maxHP > 0.5
    ) {
      defender.moveState = 'fast';
      defender.changeStats({ attack: 1 / 1.5, speed: 1.5 });
    }
  },
  onHit({ attacker }: { attacker: PokemonObject }) {
    if (attacker.moveState === 'slow') {
      attacker.heal(this.damage[attacker.basePokemon.stage - 1]);
    }
  },
} as const;

export const braveBird: Move = move;
