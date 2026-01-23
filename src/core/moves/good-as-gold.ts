import { PokemonObject } from '../../objects/pokemon.object';
import { Move } from '../move.model';

/**
 * Good as Gold - Gholdengo's passive move
 *
 * Grants full status immunity and deals bonus damage based on player Gholdengo coins
 */
export const goodAsGold = {
  displayName: 'Good as Gold',
  type: 'passive',
  get description() {
    return `{{user}} is immune to all status effects. {{user}} deals bonus damage equal to 50% of your Gimmighoul Coins on each attack.`;
  },
  onTimer({ self }: { self: PokemonObject }) {
    // Grant permanent status immunity by refreshing it every second
    // We can't just add a "permanent" status in onRoundStart because
    // Gholdengo joins the fight after round start.
    self.addStatus('statusImmunity', 2000);
  },
  calculateDamage({ player, side, attacker, baseAmount, flags: { isAttack } }) {
    if (!isAttack || attacker.side !== side) {
      return baseAmount;
    }

    const coins = player.synergyState.steel;
    return baseAmount + Math.floor(coins * 0.5);
  },
} as const satisfies Move;
