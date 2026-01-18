import { flatten, isDefined } from '../helpers';
import { FloatingText } from '../objects/floating-text.object';
import { Player } from '../objects/player.object';
import { PokemonObject } from '../objects/pokemon.object';
import {
  getCenter,
  getDamageReduction,
  getFacing,
  getGridDistance,
  getNearestEmpty,
  getOppositeSide,
  inBounds,
  mapPokemonCoords,
} from '../scenes/game/combat/combat.helpers';
import { CombatScene } from '../scenes/game/combat/combat.scene';
import {
  BOARD_WIDTH,
  getCoordinatesForMainboard,
} from '../scenes/game/game.helpers';
import { GameScene } from '../scenes/game/game.scene';
import { NEGATIVE_STATUS, Status } from './status.model';

export type Type =
  | 'normal'
  | 'fire'
  | 'fighting'
  | 'water'
  | 'flying'
  | 'grass'
  | 'poison'
  | 'electric'
  | 'ground'
  | 'psychic'
  | 'rock'
  | 'ice'
  | 'bug'
  | 'dragon'
  | 'ghost'
  | 'dark'
  | 'steel'
  | 'fairy';

export type Role =
  | 'sweeper'
  | 'revenge killer'
  | 'bulky attacker'
  | 'wallbreaker'
  | 'hazard setter'
  | 'wall'
  | 'disruptor'
  | 'support'
  | 'pivot'
  | 'utility';

export type Category = Type | Role;

/**
 * Model representing an effect that can be triggered during combat
 * Type parameter is for extra config that can be passed to effects
 * of certain types. (eg. current synergy counts)
 */
export interface Effect<ExtraConfig = unknown> {
  /** Possible effect that occurs when using move */
  readonly onMoveUse?: (
    config: {
      scene: CombatScene;
      player: Player;
      board: CombatScene['board'];
      user: PokemonObject;
    } & ExtraConfig
  ) => void;
  /** Possible effect that occurs on hit */
  readonly onHit?: (
    config: {
      scene: CombatScene;
      player: Player;
      board: CombatScene['board'];
      attacker: PokemonObject;
      defender: PokemonObject;
      flags: { isAttack?: boolean; isAOE?: boolean };
      damage: number;
    } & ExtraConfig
  ) => void;
  /** Possible effect that occurs on being hit */
  readonly onBeingHit?: (
    config: {
      scene: CombatScene;
      player: Player;
      board: CombatScene['board'];
      attacker: PokemonObject;
      defender: PokemonObject;
      flags: { isAttack?: boolean; isAOE?: boolean };
      damage: number;
    } & ExtraConfig
  ) => void;
  /** Possible effect that occurs on any Pokemon dying */
  readonly onDeath?: (
    config: {
      scene: CombatScene;
      player: Player;
      board: CombatScene['board'];
      pokemon: PokemonObject;
      side: 'player' | 'enemy';
    } & ExtraConfig
  ) => void;
  /** Possible effect that occurs on an ally's turn */
  readonly onTurnStart?: (
    config: {
      scene: CombatScene;
      player: Player;
      board: CombatScene['board'];
      pokemon: PokemonObject;
    } & ExtraConfig
  ) => void;
  /** Possible effect that occurs on a regular timer */
  readonly onTimer?: (
    config: {
      scene: CombatScene;
      player: Player;
      board: CombatScene['board'];
      side: 'player' | 'enemy';
      /** Time elapsed in SECONDS */
      time: number;
    } & ExtraConfig
  ) => void;
  /** Possible effect that occurs on start of round */
  readonly onRoundStart?: (
    config: {
      scene: CombatScene;
      player: Player;
      board: CombatScene['board'];
      side: 'player' | 'enemy';
    } & ExtraConfig
  ) => void;
  /** Possible effect that occurs on end of round, after combat has concluded */
  readonly onRoundEnd?: (
    config: {
      scene: GameScene;
      player: Player;
      board: CombatScene['board'];
      won: boolean;
    } & ExtraConfig
  ) => void;
  /** Possible extra damage calculation */
  readonly calculateDamage?: (
    config: {
      player: Player;
      attacker: PokemonObject;
      defender: PokemonObject;
      baseAmount: number;
      flags: { isAttack?: boolean; isAOE?: boolean };
      side: 'player' | 'enemy';
    } & ExtraConfig
  ) => number;
}

/**
 * Model representing the effects of a synergy.
 *
 * Each synergy has one or more functions which can be called during combat,
 * eg. at the start of the round, on hitting an enemy, on being hit
 *
 * The logic for these sits here
 *
 * TODO: Would it be worth moving them ALL to just add permanent Effects to Pokemon?
 * Would slightly clean up the CombatScene but in exchange make this a mess.
 */
export type Synergy = {
  readonly category: Category;
  readonly displayName: string;
  readonly description: string;
  /** Amount of synergy required to trigger different levels */
  readonly thresholds: number[];
  /** If true, thresholds are exact matches (==) instead of minimum thresholds (>=) */
  readonly isExactThreshold?: boolean;
} & Effect<{ count: number }>;

export function getSynergyTier(synergy: Synergy, count: number) {
  const { thresholds, isExactThreshold } = synergy;

  if (isExactThreshold) {
    // For exact matching, find the index of count in thresholds
    const index = thresholds.indexOf(count);
    // Return tier (index + 1) if found, or 0 if not found
    return index !== -1 ? index + 1 : 0;
  }

  // Standard threshold behavior (>= matching)
  let tier = thresholds.findIndex((threshold) => count < threshold);
  // if tier is -1, it means it's beyond the max
  if (tier === -1) {
    tier = thresholds.length;
  }
  return tier;
}

export function getNextThreshold(synergy: Synergy, count: number) {
  const { thresholds, isExactThreshold } = synergy;

  if (isExactThreshold) {
    // For exact thresholds, find nearest value below (this is the easiest criteria to meet)
    let nextThreshold = thresholds[0];
    for (const threshold of thresholds) {
      if (threshold <= count && threshold > nextThreshold) {
        nextThreshold = threshold;
      }
    }
    return nextThreshold;
  } else {
    // Standard threshold behaviour: tier starts at 1, so next threshold is just that entry.
    return (
      thresholds[getSynergyTier(synergy, count)] ??
      // tier can be `thresholds.length`, in which case it should be max.
      thresholds[thresholds.length - 1]
    );
  }
}

export const synergyData: { [k in Category]: Synergy } = {
  normal: {
    category: 'normal',
    displayName: 'Normal: Pick Up',
    description: `Each Normal-type Pokemon has a 50% chance
to Pick Up a Pokeball at end of round.

 (3) - After winning rounds.
 (6) - After all rounds.`,
    thresholds: [3, 6],
    onRoundEnd({ scene, board, player, won, count }) {
      const tier = getSynergyTier(this, count);
      if (tier === 0) {
        return;
      }
      if (tier === 1 && won) {
        return;
      }

      flatten(board)
        .filter(isDefined)
        .forEach((pokemon) => {
          if (
            pokemon.basePokemon.categories.includes('normal') &&
            Math.random() < 0.5
          ) {
            // FIXME: only show pick up text for visible player
            scene.add.existing(
              new FloatingText(scene, pokemon.x, pokemon.y, 'Pick up!')
            );
            player.gold++;
          }
        });
    },
  },
  fire: {
    category: 'fire',
    displayName: 'Fire: Blaze',
    description: `Fire-type Pokemon do 50% more damage
when low on health.

 (2) - Activates below 33% health.
 (4) - Activates below 50% health.
 (6) - Activates below 66% health.`,
    thresholds: [2, 4, 6],
    calculateDamage({ attacker, baseAmount, side, count }): number {
      const tier = getSynergyTier(this, count);
      if (tier === 0) {
        return baseAmount;
      }

      const threshold = tier === 1 ? 0.33 : tier === 2 ? 0.5 : 0.66;

      if (
        attacker.side === side &&
        attacker.basePokemon.categories.includes('fire') &&
        attacker.currentHP / attacker.maxHP < threshold
      ) {
        return baseAmount * 1.5;
      }

      return baseAmount;
    },
  },
  fighting: {
    category: 'fighting',
    displayName: 'Fighting: Rapid Strike Style',
    description: `Your team deals 5% more damage with attacks.

After Fighting-type Pokemon use their move,
their next two attacks are faster, deal
more damage, and heal them on hit.

 (2) - 25% more damage, heal for 150 HP.
 (4) - 45% more damage, heal for 300 HP.`,
    thresholds: [2, 4],
    onMoveUse({ user, count }) {
      const tier = getSynergyTier(this, count);
      if (tier === 0) {
        return;
      }

      if (user.basePokemon.categories.includes('fighting')) {
        // Track attack buffs in synergy state
        user.synergyState.fighting = 2;
        // significantly increase speed for next 2 attacks.
        user.changeStats({ speed: +4 });
      }
    },
    onHit({ attacker, count }) {
      const tier = getSynergyTier(this, count);
      if (tier === 0) {
        return;
      }

      // Heal on hit if user still has boosted stacks
      if (
        attacker.synergyState.fighting > 0 &&
        attacker.basePokemon.categories.includes('fighting')
      ) {
        attacker.synergyState.fighting--;
        attacker.heal(tier === 1 ? 150 : 300);

        // When we use up the last stack, reduce speed added from move use
        if (attacker.synergyState.fighting === 0) {
          attacker.changeStats({ speed: -4 });
        }
      }
    },
    calculateDamage({
      attacker,
      baseAmount,
      count,
      flags: { isAttack },
      side,
    }) {
      const tier = getSynergyTier(this, count);
      if (tier === 0) {
        return baseAmount;
      }

      // The synergy only affects basic attacks on the synergy's side
      if (side !== attacker.side || !isAttack) {
        return baseAmount;
      }

      if (
        attacker.synergyState.fighting > 0 &&
        attacker.basePokemon.categories.includes('fighting')
      ) {
        // Fighting type with stacks left: deal more damage
        // Include the base 5% increase (ie. 25 + 5, 45 + 5)
        return baseAmount * (tier === 1 ? 1.3 : 1.5);
      }

      return baseAmount * 1.05;
    },
  },
  water: {
    category: 'water',
    displayName: 'Water: Aqua Ring',
    description: `All Pokemon gain extra PP on hit.

 (2) - 1 extra PP
 (4) - 2 extra PP
 (6) - 3 extra PP`,
    thresholds: [2, 4, 6],
    onHit({ attacker, flags: { isAttack }, count }) {
      const tier = getSynergyTier(this, count);
      if (tier === 0) {
        return;
      }

      const ppGain = tier === 1 ? 1 : tier === 2 ? 2 : 3;
      if (isAttack) {
        attacker.addPP(ppGain);
        attacker.redrawBars();
      }
    },
  },
  flying: {
    category: 'flying',
    displayName: 'Flying: Sky Attack',
    description: `Flying-type Pokemon take less damage from
moves and attacks which hit an area.

 (2) - 20% less damage
 (4) - 35% less damage
 (6) - 50% less damage`,
    thresholds: [2, 4, 6],
    calculateDamage({
      defender,
      baseAmount,
      side,
      count,
      flags: { isAOE },
    }): number {
      const tier = getSynergyTier(this, count);
      if (tier === 0) {
        return baseAmount;
      }

      const multiplier = tier === 1 ? 0.8 : tier === 2 ? 0.65 : 0.5;

      if (
        isAOE &&
        defender.side === side &&
        defender.basePokemon.categories.includes('flying')
      ) {
        return baseAmount * multiplier;
      }

      return baseAmount;
    },
  },
  grass: {
    category: 'grass',
    displayName: 'Grass: Absorb',
    description: `Grass types recover HP when dealing damage.
Every 4 seconds, deal damage based on health
recovered, split among all enemies.

 (2) - Heal 15% of damage
 (3) - Heal 25% of damage
 (4) - Heal 40% of damage`,
    thresholds: [2, 3, 4],
    onHit({ scene, attacker, damage, count }) {
      // TODO add animation for healing?
      const tier = getSynergyTier(this, count);
      if (tier === 0) {
        return;
      }
      let healAmount = 0;
      switch (tier) {
        case 1:
          healAmount = damage * 0.15;
          break;
        case 2:
          healAmount = damage * 0.25;
          break;
        case 3:
          healAmount = damage * 0.4;
          break;
        default: // nothing
      }
      const healingDone = attacker.heal(Math.floor(healAmount));
      scene.data.inc(this.category, Math.floor(healingDone));
    },
    onTimer({ scene, board, side, count, time }) {
      // every 4 seconds
      if (time % 4 !== 0) {
        return;
      }

      const tier = getSynergyTier(this, count);
      if (tier === 0) {
        return;
      }

      const healPerc = tier === 1 ? 1 : tier === 2 ? 1.5 : 2;
      const healingDone = scene.data.get(this.category) || 0;
      // split damage among all targets
      const targets = flatten(board).filter(
        (pokemon) => pokemon && pokemon?.side !== side
      );
      const damage = Math.floor((healingDone * healPerc) / targets.length);
      flatten(board)
        .filter(isDefined)
        .forEach((pokemon) => {
          if (pokemon.side !== side) {
            // TODO: do this damage via combat scene so the damage gets tracked in graphs
            pokemon.takeDamage(damage, {
              tint: 0x00ff00, // Slight green tint
            });
          }
        });
      scene.data.set(this.category, 0);
    },
  },
  poison: {
    category: 'poison',
    displayName: 'Poison: Poison Point',
    description: `Poison-type Pokemon apply stacks of Poison
every time they hit or are hit with an attack.

Poison stacks deal 1% of the target's HP
at the end of each of their turns.

 (3) - 1 stack on hit, max 6 stacks
 (5) - 2 stacks on hit, max 12 stacks`,
    thresholds: [3, 5],
    onHit({ attacker, defender, count }) {
      const tier = getSynergyTier(this, count);
      if (tier === 0) {
        return;
      }

      if (attacker.basePokemon.categories.includes('poison')) {
        const stacksApplied = tier;
        const maxStacks = tier * 6;

        // Duration is endless, but that's not fixable ATM
        // FIXME: can't track stacks separately
        defender.addStatus('poison', 99999, (prev) =>
          Math.min(
            // Add one stack to the previous amount,
            // initialising to 0 if unset
            (prev ?? 0) + stacksApplied,
            // But not over max
            maxStacks
          )
        );
      }
    },
  },
  electric: {
    category: 'electric',
    displayName: 'Electric: Motor Drive',
    description: `Whenever an Electric-type pokemon uses its move,
it raises the Speed of other nearby allies.

 (2) - within 1 tile
 (4) - within 2 tiles`,
    thresholds: [2, 4],
    onMoveUse({ scene, board, user, count }) {
      const tier = getSynergyTier(this, count);
      if (tier === 0) {
        return;
      }

      if (!user.basePokemon.categories.includes('electric')) {
        return;
      }

      const range = tier === 1 ? 1 : 2;

      flatten(board)
        .filter((pokemon) => pokemon?.side === user.side)
        .filter(isDefined)
        // FIXME: a visual distance is a bit hacky
        .filter(
          (pokemon) =>
            pokemon !== user &&
            Math.round(getGridDistance(pokemon, user) / 70) <= range
        )
        .forEach((pokemon) => {
          const cog = scene.add
            .sprite(pokemon.x, pokemon.y, 'cog')
            .play('cog')
            .once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
              cog.destroy();
            });
          pokemon.changeStats({
            speed: +1,
          });
        });
    },
  },
  ground: {
    category: 'ground',
    displayName: 'Ground: Magnitude',
    description: `Ground-type Pokemon deal splash damage on hit.
33% effective for area attacks.

 (2) - 25% of hit
 (3) - 35% of hit
 (4) - 45% of hit`,
    thresholds: [2, 4],
    onHit({
      scene,
      board,
      attacker,
      defender,
      damage,
      count,
      flags: { isAOE },
    }) {
      const tier = getSynergyTier(this, count);
      if (tier === 0) {
        return;
      }

      if (!attacker.basePokemon.categories.includes('ground')) {
        return;
      }

      const targetPos = scene.getBoardLocationForPokemon(defender);
      if (!targetPos) {
        // couldn't find Pokemon: return
        // FIXME: this means last hits don't splash
        return;
      }

      let splashPerc = tier === 1 ? 0.25 : tier === 2 ? 0.35 : 0.45;
      if (isAOE) {
        splashPerc *= 0.33;
      }

      [
        // adjacent coordinates
        { x: targetPos.x + 1, y: targetPos.y },
        { x: targetPos.x - 1, y: targetPos.y },
        { x: targetPos.x, y: targetPos.y + 1 },
        { x: targetPos.x, y: targetPos.y - 1 },
      ]
        // that are in bounds
        .filter((coords) => inBounds(board, coords))
        // and have Pokemon on them
        .map((coords) => board[coords.x][coords.y])
        .filter(isDefined)
        .forEach((adjacentPokemon) => {
          if (adjacentPokemon?.side === getOppositeSide(attacker.side)) {
            // apply damage directly; no defense calcs, no synergy modifiers, no damage triggers
            adjacentPokemon.takeDamage(Math.round(damage * splashPerc));
          }
        });
    },
  },
  psychic: {
    category: 'psychic',
    displayName: 'Psychic: Magic Room',
    description: `Psychic-type Pokemon gain extra stats
when starting combat isolated.

 (2) - +1 to Atk/SpAtk
 (3) - And +1 to Def/SpDef
 (4) - And +1 to Speed`,
    thresholds: [2, 3, 4],
    onRoundStart({ scene, board, side, count }) {
      const tier = getSynergyTier(this, count);
      if (tier === 0) {
        return;
      }

      flatten(board)
        .filter(isDefined)
        .forEach((pokemon) => {
          if (
            pokemon.side === side &&
            pokemon.basePokemon.categories.includes('psychic')
          ) {
            const location = scene.getBoardLocationForPokemon(pokemon);
            if (!location) {
              return;
            }

            const adjacents = [
              { x: location.x + 1, y: location.y },
              { x: location.x - 1, y: location.y },
              { x: location.x, y: location.y + 1 },
              { x: location.x, y: location.y - 1 },
            ]
              .filter((coords) => inBounds(board, coords))
              .map((coords) => board[coords.x][coords.y])
              .filter((mon) => mon?.side === side);

            if (adjacents.length === 0) {
              // isolated!
              const statChanges = {
                attack: tier >= 1 ? +1 : 0,
                specAttack: tier >= 1 ? +1 : 0,
                defense: tier >= 2 ? +1 : 0,
                specDefense: tier >= 2 ? +1 : 0,
                speed: tier >= 3 ? +1 : 0,
              } as const;
              pokemon.changeStats(statChanges);
            }
          }
        });
    },
  },
  rock: {
    category: 'rock',
    displayName: 'Rock: Hard Rock',
    description: `All Rock-type Pokemon deal more damage
and take less damage from each hit.

 (2) - +15 / -15 damage
 (4) - +30 / -30 damage
 (6) - +50 / -50 damage`,
    thresholds: [2, 4, 6],
    calculateDamage({ attacker, defender, baseAmount, side, count }): number {
      const tier = getSynergyTier(this, count);
      if (tier === 0) {
        return baseAmount;
      }
      const effect = tier === 1 ? 15 : tier === 2 ? 30 : 50;

      if (
        attacker.side === side &&
        attacker.basePokemon.categories.includes('rock')
      ) {
        return baseAmount + effect;
      }

      if (
        defender.side === side &&
        defender.basePokemon.categories.includes('rock')
      ) {
        return Math.max(0, baseAmount - effect);
      }

      return baseAmount;
    },
  },
  ice: {
    category: 'ice',
    displayName: 'Ice: Snow Warning',
    description: `At the start of the round, all enemy Pokemon
take damage.

 (2) - 10% max HP
 (3) - and become slowed for 4 seconds`,
    thresholds: [2, 3],
    onRoundStart({ board, side, count }) {
      const tier = getSynergyTier(this, count);
      if (tier === 0) {
        return;
      }

      flatten(board).forEach((pokemon) => {
        if (pokemon && pokemon.side !== side) {
          pokemon.takeDamage(Math.floor(pokemon.maxHP * 0.1));
          if (tier >= 2) {
            pokemon.changeStats(
              {
                speed: -1,
              },
              4000
            );
          }
        }
      });
    },
  },
  bug: {
    category: 'bug',
    displayName: 'Bug: Swarm',
    description: `Makes a copy of the least-evolved Bug-type
Pokemon at the start of the round.

 (3) - One copy`,
    thresholds: [3],
    onRoundStart({ scene, board, side, count }) {
      const tier = getSynergyTier(this, count);
      if (tier === 0) {
        return;
      }

      const pokemonToCopy = flatten(board)
        .filter(isDefined)
        // find all the Bug-types of the appropriate side
        .filter(
          (pokemon) =>
            pokemon.side === side &&
            pokemon.basePokemon.categories.includes('bug')
        )
        // and sort by star level, then tier
        .sort((pokemonA, pokemonB) => {
          const stageDiff =
            pokemonA.basePokemon.stage - pokemonB.basePokemon.stage;
          if (stageDiff) {
            return stageDiff;
          }
          return pokemonA.basePokemon.tier - pokemonB.basePokemon.tier;
        })[0];
      const locationToCopy = scene.getBoardLocationForPokemon(pokemonToCopy);
      if (!locationToCopy) {
        return;
      }
      const placeToPut = getNearestEmpty(board, locationToCopy);
      if (!placeToPut) {
        return;
      }
      scene.addPokemon(side, placeToPut, pokemonToCopy.basePokemon.name);
    },
  },
  dragon: {
    category: 'dragon',
    displayName: 'Dragon: Sheer Force',
    description: `Boosts the power of Dragon-type moves.

 (3) - 50% more damage.`,
    thresholds: [3],
    calculateDamage({ attacker, baseAmount, side, count, flags }): number {
      const tier = getSynergyTier(this, count);
      if (tier === 0) {
        return baseAmount;
      }

      if (
        attacker.side === side &&
        attacker.basePokemon.categories.includes('dragon') &&
        flags.isAttack === false
      ) {
        return baseAmount * 1.5;
      }

      return baseAmount;
    },
  },
  ghost: {
    category: 'ghost',
    displayName: 'Ghost: Cursed Body',
    description: `Whenever a Ghost-type deals damage,
it applies Curse to the target.

At 4 stacks of Curse, consume them to deal
damage and Blind the target for 1 second.

 (2) - 44 + 4% max HP special damage
 (3) - 144 + 14% max HP special damage
 (4) - 244 + 24% max HP special damage`,
    thresholds: [2, 4, 6],
    onHit({ scene, attacker, defender, count }) {
      const tier = getSynergyTier(this, count);
      if (tier === 0) {
        return;
      }
      if (!attacker.basePokemon.categories.includes('ghost')) {
        return;
      }

      defender.addStatus('curse', 120_000, (prev) => (prev ?? 0) + 1);
      const newStacks = defender.status.curse?.value ?? 0;
      if (newStacks >= 4) {
        // reset statuses
        defender.addStatus('curse', 0, 0);
        defender.addStatus('blind', 1000);

        const baseDamage =
          tier === 1
            ? 44 + defender.maxHP * 0.04
            : tier === 2
              ? 144 + defender.maxHP * 0.14
              : 244 + defender.maxHP * 0.24;
        const damage = {
          damage: baseDamage,
          defenseStat: 'specDefense',
        } as const;
        scene.causeDamage(attacker, defender, damage, {
          isAttack: false,
          isAOE: false,
          triggerEvents: false,
        });
      }
    },
  },
  dark: {
    category: 'dark',
    displayName: 'Dark: Nasty Plot',
    description: `Innate: ALL Dark-type Pokemon teleport to the opposite
side of the battlefield at the start of each round.

Synergy: Dark-type Pokemon gain a critical hit ratio
to both their attacks and their moves.

 (2) - 15% chance to deal 200% damage.
 (4) - 30% chance to deal 250% damage.
 (6) - 45% chance to deal 300% damage.`,
    thresholds: [2, 4, 6],
    onRoundStart({ scene, board, side, count }) {
      const tier = getSynergyTier(this, count);
      // note: we don't skip tier 0 here because Dark-types
      // have an innate ability which is always active.

      const critRate =
        tier === 0 ? 0 : tier === 1 ? 0.15 : tier === 2 ? 0.3 : 0.45;
      const critDamage =
        tier === 0 ? 1.5 : tier === 1 ? 2 : tier === 2 ? 2.5 : 3;
      mapPokemonCoords(board).forEach((slot) => {
        if (
          slot.pokemon?.side === side &&
          slot.pokemon.basePokemon.categories.includes('dark')
        ) {
          slot.pokemon.critRate = critRate;
          slot.pokemon.critDamage = critDamage;

          if (slot.pokemon.basePokemon.name === 'regigigas') {
            // regigigas doesn't jump
            // TODO don't hardcode this?
            return;
          }

          // Jump to nearest spot on opposite side
          const jumpLocation = getNearestEmpty(board, {
            x: slot.x,
            y: board.length - slot.y - 1,
          });
          slot.pokemon.setAlpha(0.5);
          if (jumpLocation) {
            scene.movePokemon(slot, jumpLocation, () => {
              slot.pokemon?.clearAlpha();
            });
          }
        }
      });
    },
  },
  steel: {
    category: 'steel',
    displayName: 'Steel: Good As Gold',
    description: `You get a Gimmighoul outside of your board
which collects Gimmighoul Coins when any
Pokemon is KO'd (ally or enemy).

Each round, an enemy Gimmighoul appears which
gives extra Gimmighoul Coins when KO'd.

After 10 seconds in combat, your Gimmighoul
will use its move. Its effects upgrade with
the number of Gimmighoul Coins it has.

 (3) - +5 per KO, +25 on Gimmighoul.
 (5) - Get double coins and a chance
       to get money from Gimmighouls!`,
    thresholds: [3, 5],
    onRoundStart({ scene, board, count, side }) {
      const tier = getSynergyTier(this, count);
      if (tier === 0) {
        return;
      }

      const targetSide = getOppositeSide(side);
      // range of y coordinates is upper half (0->H/2) for 'enemy'
      // and lower half (H/2->H) for 'player'
      const startY = targetSide === 'player' ? BOARD_WIDTH / 2 : 0;
      const endY = targetSide === 'player' ? BOARD_WIDTH : BOARD_WIDTH / 2;

      const randSquare = {
        x: Math.floor(Math.random() * BOARD_WIDTH),
        y: Math.floor(Math.random() * (endY - startY) + startY),
      };

      // Add the Gimmighoul after a short delay
      // so it doesn't get given turns.
      scene.time.addEvent({
        callback: () => {
          const target = getNearestEmpty(board, randSquare);
          if (target) {
            // Add without calling setTurn()
            scene.addPokemon(targetSide, target, 'gimmighoul');
          }
        },
        delay: 5,
      });
    },
    onDeath({ player, pokemon, side, count }) {
      const tier = getSynergyTier(this, count);
      if (tier === 0) {
        return;
      }

      // Gimmighoul gives extra coins when KO'd by the enemy
      if (pokemon.name === 'gimmighoul' && pokemon.side !== side) {
        player.synergyState.steel += tier === 1 ? 25 : 50;
        // and can drop extra loot when synergy is at tier 2
        if (tier === 2) {
          // TODO: make this more exciting than just random money
          const rand = Math.random();
          if (rand > 0.9) {
            player.gold += 2;
          } else if (rand > 0.6) {
            player.gold++;
          }
        }
      } else {
        player.synergyState.steel += tier === 1 ? 5 : 10;
      }
    },
    onTimer({ scene, board, player, side, count, time }) {
      const tier = getSynergyTier(this, count);
      if (tier === 0) {
        return;
      }

      const coins = player.synergyState.steel;
      const sideGimmighoul = player.extraSynergyObjects.steel?.sprite;

      // Triggers at 10 seconds
      if (time === 10 && coins >= 25 && sideGimmighoul) {
        // 25 coins: Gives lowest-health ally a small shield and grants brief status immunity
        // 75 coins: Also deals damage to a random enemy and flinches
        // 150 coins: Attack deals scaling damage and gives coins if it KOs
        // 250 coins: Shield applies to all allies
        // 500 coins: Damage applies to all enemies
        // 750 coins: Also grants +1 Atk/SpAtk to all allies
        // 999 coins: Evolves into Gholdengo who actively joins the fight.

        const allies = flatten(board)
          .filter(isDefined)
          .filter((pokemon) => pokemon.side === side);
        const enemies = flatten(board)
          .filter(isDefined)
          .filter((pokemon) => pokemon.side !== side);

        const lowestHPAlly = allies.reduce((lowest, current) =>
          current.currentHP < lowest.currentHP ? current : lowest
        );

        // Shield and status immunity (0+ coins)
        const shieldTargets = coins >= 250 ? allies : [lowestHPAlly];
        shieldTargets.forEach((ally) => {
          ally.applyShield(Math.floor(200 + 0.5 * coins));
          ally.addStatus('statusImmunity', 2000 + 4 * coins);
        });

        // Damage to enemies (75+ coins)
        if (coins >= 75) {
          const damageTargets =
            coins >= 500
              ? enemies
              : [enemies[Math.floor(Math.random() * enemies.length)]];
          const damage = coins >= 150 ? 250 + 0.5 * coins : 200;
          damageTargets.forEach((enemy) => {
            if (enemy) {
              scene.causeDamage(
                sideGimmighoul,
                enemy,
                { damage, defenseStat: 'defense' },
                { isAttack: false, triggerEvents: false }
              );
              if (coins >= 150 && enemy.currentHP <= 0) {
                player.synergyState.steel += tier === 1 ? 25 : 50;
              }
            }
          });
        }

        // Grant +1 Atk/SpAtk to all allies (750+ coins)
        if (coins >= 750) {
          allies.forEach((ally) => {
            ally.changeStats({ attack: +1, specAttack: +1 });
          });
        }

        // Join fight as Gholdengo (999 coins)
        if (coins >= 999) {
          // Find a spot closest to the middle for Gholdengo
          const centerCoords = {
            x: Math.floor(BOARD_WIDTH / 2),
            y: Math.floor(BOARD_WIDTH / 2),
          };
          const emptySpot = getNearestEmpty(board, centerCoords);

          if (emptySpot) {
            // Spawn the combat gholdengo now so the spot doesn't get filled up
            // but hide it until the movement is done.
            const gholdengo = scene
              .addPokemon(side, emptySpot, 'gholdengo')
              .setVisible(false);
            const originalPos = { x: sideGimmighoul.x, y: sideGimmighoul.y };
            // Play animation that moves the off-board gimmighoul/gholdengo
            sideGimmighoul.playAnimation(getFacing(sideGimmighoul, gholdengo));
            scene.tweens.add({
              targets: [sideGimmighoul],
              ...getCoordinatesForMainboard(emptySpot),
              ease: Phaser.Math.Easing.Back.Out,
              duration: 500,
              onComplete: () => {
                // then make the real gholdengo visible
                sideGimmighoul.setVisible(false);
                sideGimmighoul.setPosition(originalPos.x, originalPos.y);
                gholdengo.setVisible(true);
                scene.setTurn(gholdengo);
              },
            });
          }
        }
      }
    },
    onRoundEnd({ player, count }) {
      const tier = getSynergyTier(this, count);
      if (tier === 0) {
        return;
      }

      const coins = player.synergyState.steel;
      const gimmighoul = player.extraSynergyObjects.steel?.sprite;

      // These fields are all unused but needed to satisfy the Move types and display correctly.
      const baseMove = {
        type: 'active',
        targetting: 'ground',
        defenseStat: 'defense',
        cost: 0,
        startingPP: 0,
        range: 0,
        use: () => {},
      } as const;

      if (gimmighoul) {
        // Set the tooltip for gimmighoul's "move" based on our coin count.
        if (coins >= 25 && coins < 75) {
          gimmighoul.basePokemon = {
            ...gimmighoul.basePokemon,
            move: {
              ...baseMove,
              displayName: 'Reflect',
              description: `Gimmighoul gives a ${200 + 0.5 * coins} (200 + 50% of coins) HP shield to the lowest-health ally and briefly grants them status immunity.`,
            },
          };
        } else if (coins >= 75 && coins < 150) {
          gimmighoul.basePokemon = {
            ...gimmighoul.basePokemon,
            move: {
              ...baseMove,
              displayName: 'Astonish',
              description: `Gimmighoul strikes a random enemy, dealing 200 physical damage and causing them to flinch.\nIt also gives a ${200 + 0.5 * coins} (200 + 50% of coins) HP shield to the lowest-health ally and briefly grants them status immunity.`,
            },
          };
        } else if (coins >= 150 && coins < 250) {
          gimmighoul.basePokemon = {
            ...gimmighoul.basePokemon,
            move: {
              ...baseMove,
              displayName: 'Pay Day',
              description: `Gimmighoul sprays a random enemy with money, dealing ${250 + 0.5 * coins} (250 + 50% of coins) physical damage and causing them to flinch. If this KOs the enemy, you get 25 Gimmighoul Coins. It also gives a ${200 + 0.5 * coins} (200 + 50% of coins) HP shield to the lowest-health ally and briefly grants them status immunity.`,
            },
          };
        } else if (coins >= 250 && coins < 500) {
          gimmighoul.basePokemon = {
            ...gimmighoul.basePokemon,
            move: {
              ...baseMove,
              displayName: 'Pay Day+',
              description: `Gimmighoul sprays a random enemy with money, dealing ${250 + 0.5 * coins} (250 + 50% of coins) physical damage and causing them to flinch. If this KOs the enemy, you get 25 Gimmighoul Coins. It also gives a ${200 + 0.5 * coins} (200 + 50% of coins) HP shield to all allies and briefly grants them status immunity.`,
            },
          };
        } else if (coins >= 500 && coins < 750) {
          gimmighoul.basePokemon = {
            ...gimmighoul.basePokemon,
            move: {
              ...baseMove,
              displayName: 'Pay Day++',
              description: `Gimmighoul sprays all enemies with money, dealing ${250 + 0.5 * coins} (250 + 50% of coins) physical damage and causing them to flinch. If this KOs any enemy, you get 25 Gimmighoul Coins. It also gives a ${200 + 0.5 * coins} (200 + 50% of coins) HP shield to all allies and briefly grants them status immunity.`,
            },
          };
        } else if (coins >= 750 && coins < 999) {
          gimmighoul.basePokemon = {
            ...gimmighoul.basePokemon,
            move: {
              ...baseMove,
              displayName: 'Make it Rain!',
              description: `Gimmighoul sprays all enemies with money, dealing ${250 + 0.5 * coins} (250 + 50% of coins) physical damage and causing them to flinch. If this KOs any enemy, you get 25 Gimmighoul Coins. It also gives a ${200 + 0.5 * coins} (200 + 50% of coins) HP shield to all allies, briefly grants them status immunity, and boosts their Attack and Special Attack.`,
            },
          };
        } else if (coins >= 999) {
          // Evolve the benched Gimmighoul to Gholdengo
          gimmighoul.setTexture('gholdengo');
          gimmighoul.playAnimation('down');
          gimmighoul.basePokemon = {
            ...gimmighoul.basePokemon,
            name: 'gholdengo',
            displayName: 'Gholdengo',
            move: {
              ...baseMove,
              displayName: 'Pay Day++++',
              description: `Gholdengo sprays all enemies with money, dealing ${250 + 0.5 * coins} (250 + 50% of coins) physical damage and causing them to flinch. If this KOs any enemy, you get 25 Gimmighoul Coins. It also gives a ${200 + 0.5 * coins} (200 + 50% of coins) HP shield to all allies, briefly grants them status immunity, and boosts their Attack and Special Attack. It then joins the fight!`,
            },
          };
          // Restore visibility (it disappears when Gholdengo goes on the board)
          gimmighoul.setVisible(true);
        }
        gimmighoul.redrawCard();
      }
    },
  },
  fairy: {
    category: 'fairy',
    displayName: 'Fairy: Crafty Shield',
    description: `All Pokemon have a maximum amount of
damage they can take from one hit.

 (2) - 1/4 of their max HP
 (3) - 1/6 of their max HP`,
    thresholds: [2, 3],
    calculateDamage({ defender, baseAmount, side, count }): number {
      const tier = getSynergyTier(this, count);
      if (tier === 0) {
        return baseAmount;
      }
      const maxHit = tier === 1 ? 1 / 4 : 1 / 6;

      if (defender.side === side) {
        return Math.min(baseAmount, maxHit * defender.maxHP);
      }
      return baseAmount;
    },
  },
  sweeper: {
    category: 'sweeper',
    displayName: 'Sweeper: Speed Boost',
    description: `Sweepers raise their Speed every other
time they hit an opponent.

 (2) - up to 2 times
 (4) - up to 3 times
 (6) - up to 4 times`,
    thresholds: [2, 4, 6],
    onHit({ attacker, count }) {
      const tier = getSynergyTier(this, count);
      if (tier === 0) {
        return;
      }

      const maxStacks = tier === 1 ? 2 : tier === 2 ? 3 : 4;

      if (
        attacker.basePokemon.categories.includes('sweeper') &&
        attacker.synergyState.sweeper < maxStacks * 2
      ) {
        // count each hit,
        attacker.synergyState.sweeper++;
        // buff every second hit
        if (attacker.synergyState.sweeper % 2 === 0) {
          attacker.changeStats({ speed: +1 });
        }
      }
    },
  },
  'revenge killer': {
    category: 'revenge killer',
    displayName: 'Revenge Killer: Retaliate',
    description: `Whenever an ally Pokemon faints, all Revenge Kilers
boost their Attack, Special Attack and Speed.

 (2) - Stacks once
 (4) - Stacks up to three times`,
    thresholds: [2, 4],
    onDeath({ scene, board, pokemon, side, count }) {
      const tier = getSynergyTier(this, count);
      if (tier === 0) {
        return;
      }

      const maxStacks = tier === 1 ? 1 : 3;

      if (pokemon.side === side) {
        flatten(board).forEach((boardPokemon) => {
          if (
            boardPokemon?.side === side &&
            boardPokemon.basePokemon.categories.includes('revenge killer') &&
            boardPokemon.synergyState.revengeKiller < maxStacks
          ) {
            // animation: goes red ANGRY
            const angry = scene.add.image(
              boardPokemon.x + 10,
              boardPokemon.y - 10,
              'angry'
            );
            scene.tweens.addCounter({
              from: 255,
              to: 100,
              onUpdate: (tween: Phaser.Tweens.Tween) => {
                boardPokemon.setTint(
                  Phaser.Display.Color.GetColor(
                    0xff,
                    Math.floor(tween.getValue() ?? 0),
                    Math.floor(tween.getValue() ?? 0)
                  )
                );
              },
              onComplete: () => {
                angry.destroy();
              },
              duration: 250,
              yoyo: true,
            });
            boardPokemon.changeStats({ attack: +1, specAttack: +1, speed: +1 });
            boardPokemon.synergyState.revengeKiller++;
          }
        });
      }
    },
  },
  wallbreaker: {
    category: 'wallbreaker',
    displayName: 'Wallbreaker: Infiltrator',
    description: `Wallbreakers ignore some Defenses
when they deal damage.

 (2) - Ignore 40% of Defenses
 (4) - Ignore 80% of Defenses`,
    thresholds: [2, 4],
    calculateDamage({
      attacker,
      defender,
      baseAmount,
      side,
      count,
      flags: { isAttack },
    }): number {
      const tier = getSynergyTier(this, count);
      if (tier === 0) {
        return baseAmount;
      }

      if (
        attacker.side !== side ||
        !attacker.basePokemon.categories.includes('wallbreaker')
      ) {
        return baseAmount;
      }

      // actual defense stat used after ignoring some
      const useDefense = tier === 1 ? 0.6 : 0.2;

      // FIXME: This needs to know which defense stat was targetted
      // For now we guess based on attacker and attack type.
      let targettedStat: 'defense' | 'specDefense';
      if (isAttack) {
        targettedStat =
          attacker.basePokemon.basicAttack.defenseStat ??
          (attacker.basePokemon.basicAttack.defenseStat === 'attack'
            ? 'defense'
            : 'specDefense');
      } else {
        // use defenseStat of active moves; fall back to just defense for other sources
        targettedStat =
          (attacker.basePokemon.move?.type === 'active' &&
            attacker.basePokemon.move.defenseStat) ||
          'defense';
      }
      const prevDR = getDamageReduction(defender.basePokemon[targettedStat]);
      const newDR = getDamageReduction(
        defender.basePokemon[targettedStat] * useDefense
      );
      return Math.round((baseAmount / (1 - prevDR)) * (1 - newDR));
    },
  },
  'hazard setter': {
    category: 'hazard setter',
    displayName: 'Hazard Setter: Trap Setup',
    description: `Each Hazard Setter has a special
entry hazard:

 (1) OR (4) - Each Hazard Setter applies
their hazards at the start of the fight.
If you have all 4, the effects are
enhanced significantly.`,
    thresholds: [1, 4],
    isExactThreshold: true,
    onMoveUse({ user, count }) {
      const tier = getSynergyTier(this, count);
      if (tier === 0) {
        return;
      }

      // Skarmory whirlwind retriggers hazards. This is implemented here
      // because the logic for triggering hazards is implemented here.
      // FIXME: Enable this when we add target to onMoveUse, as otherwise
      // this triggers on the entire enemy team.
      if (user.basePokemon.base === 'skarmory') {
        // this.onRoundStart?.({ scene, board, side: user.side, count });
      }
    },
    onRoundStart({ scene, board, side, count }) {
      const tier = getSynergyTier(this, count);
      if (tier === 0) {
        return;
      }

      const targets = flatten(board)
        .filter(isDefined)
        .filter((pokemon) => pokemon.side !== side);

      // get all the hazard setters and apply their hazards
      flatten(board)
        .filter(isDefined)
        .filter(
          (pokemon) =>
            pokemon.side === side &&
            pokemon.basePokemon.categories.includes('hazard setter')
        )
        .forEach((pokemon) => {
          // TODO: could this be part of using their move instead?
          switch (pokemon.basePokemon.base) {
            case 'nacli':
              // Stealth Rock: flat damage to all targets
              targets.forEach((target) => {
                scene.causeDamage(
                  pokemon,
                  target,
                  // This is affected by Rock synergies and defense
                  // This kinda mimics the way that Stealth Rock is "super effective"... I guess...
                  { damage: tier === 1 ? 250 : 750, defenseStat: 'defense' },
                  { triggerEvents: false, canCrit: false }
                );
              });
              break;
            case 'sewaddle':
              // Sticky Web: Slows all targets (for 5 seconds / the entire round)
              targets.forEach((target) => {
                target.changeStats({ speed: -1 }, tier === 1 ? 5000 : 99_999);
              });
              break;
            case 'mareanie':
              // Toxic Spikes: Poisons all targets
              targets.forEach((target) => {
                target.addStatus('poison', 99999, tier === 1 ? 1 : 3);
              });
              break;
            case 'skarmory':
              // Spikes: % HP damage to all targets
              targets.forEach((target) => {
                // not using scene.causeDamage so this ignores all damage modifiers.
                target.takeDamage(
                  Math.floor(
                    tier === 1 ? target.maxHP * 0.125 : target.maxHP * 0.375
                  )
                );
              });
              break;
          }
        });
    },
  },
  'bulky attacker': {
    category: 'bulky attacker',
    displayName: 'Bulky Attacker: Thick Fat',
    description: `Bulky Attackers have more HP.

 (2) - 400 bonus HP
 (4) - 800 bonus HP
 (6) - 1500 bonus HP`,
    thresholds: [2, 4, 6],
    onRoundStart({ board, side, count }) {
      const tier = getSynergyTier(this, count);
      if (tier === 0) {
        return;
      }

      const boost = tier === 1 ? 400 : tier === 2 ? 800 : 1500;
      flatten(board)
        .filter(isDefined)
        .forEach((pokemon) => {
          if (
            pokemon.side === side &&
            pokemon.basePokemon.categories.includes('bulky attacker')
          ) {
            pokemon.addStats({ maxHP: boost });
          }
        });
    },
  },
  wall: {
    category: 'wall',
    displayName: 'Wall: Wide Guard',
    description: `Walls have more of their better Defense.
Half the bonus is shared with adjacent allies
at round start.

 (2) - 20 to self, half to allies
 (4) - 50 to self
 (6) - 80 to self`,
    thresholds: [2, 4, 6],
    onRoundStart({ board, side, count }) {
      const tier = getSynergyTier(this, count);
      if (tier === 0) {
        return;
      }

      const boost = tier === 1 ? 20 : tier === 2 ? 30 : 50;
      board.forEach((col, x) =>
        col.forEach((pokemon, y) => {
          if (
            pokemon?.side === side &&
            pokemon.basePokemon.categories.includes('wall')
          ) {
            const betterStat =
              pokemon.basePokemon.defense > pokemon.basePokemon.specDefense
                ? 'defense'
                : 'specDefense';
            pokemon.addStats({ [betterStat]: boost });
            const adjacentPokemon = [
              { x, y: y - 1 },
              { x, y: y + 1 },
              { x: x - 1, y },
              { x: x + 1, y },
            ];
            adjacentPokemon.forEach(({ x: ax, y: ay }) => {
              if (
                inBounds(board, { x: ax, y: ay }) &&
                board[ax][ay]?.side === side
              ) {
                board[ax][ay]?.addStats({ [betterStat]: boost });
              }
            });
          }
        })
      );
    },
  },
  disruptor: {
    category: 'disruptor',
    displayName: 'Disruptor: Prankster',
    description: `Disruptors gain more PP after attacking
opponents with reduced stats or status effects.
  (2) - 1 extra PP
  (3) - 2 extra PP
  (4) - 3 extra PP
`,
    thresholds: [2, 3],
    onHit({ attacker, defender, flags: { isAttack }, count }) {
      const tier = getSynergyTier(this, count);
      if (tier === 0) {
        return;
      }

      if (!attacker.basePokemon.categories.includes('disruptor') || isAttack) {
        return;
      }

      const hasDebuff =
        Object.values(defender.statChanges).some((change) => change < 0) ||
        Object.entries(defender.effects).some(
          ([, effect]) => effect && effect.effect.isNegative
        ) ||
        Object.keys(defender.status).some((status) =>
          NEGATIVE_STATUS.includes(status as Status)
        );
      if (hasDebuff) {
        const ppGain = tier === 1 ? 1 : tier === 2 ? 2 : 3;
        attacker.addPP(ppGain);
        attacker.redrawBars();
      }
    },
  },
  support: {
    category: 'support',
    displayName: 'Support: Hospitality',
    // TODO: would be best if this affected the targets.
    // Needs support for returning affected targets from a move onComplete
    description: `Whenever a Support uses its move,
it and adjacent allies gain a shield.

 (2) - 10% of max HP.
 (3) - 15% of max HP.
 (4) - 25% of max HP.`,
    thresholds: [2, 3],
    onMoveUse({ scene, board, user, count }) {
      const tier = getSynergyTier(this, count);
      if (tier === 0) {
        return;
      }

      if (user.basePokemon.categories.includes('support')) {
        const shieldPercent = tier === 1 ? 0.1 : tier === 2 ? 0.15 : 0.25;
        const userCoords = scene.getBoardLocationForPokemon(user);
        if (userCoords) {
          const adjacentSquares = [
            userCoords,
            { x: userCoords.x + 1, y: userCoords.y },
            { x: userCoords.x - 1, y: userCoords.y },
            { x: userCoords.x, y: userCoords.y + 1 },
            { x: userCoords.x, y: userCoords.y - 1 },
          ];

          adjacentSquares
            .filter((coords) => inBounds(board, coords))
            .map((coords) => board[coords.x][coords.y])
            .filter((pokemon) => pokemon?.side === user.side)
            .filter(isDefined)
            .forEach((pokemon) => {
              pokemon.applyShield(Math.floor(pokemon.maxHP * shieldPercent));
            });
        }
      }
    },
  },
  pivot: {
    category: 'pivot',
    displayName: 'Pivot: U-Turn',
    description: ` (3) - At the start of combat, all Pivots
switch out to the Regigigas Mech.
They switch back in when it faints.

The Mech gains stats from the Pivots and
has all of their types combined together.`,
    // TODO Its attacks hit multiple targets.`
    thresholds: [3],
    onRoundStart({ scene, board, side, count }) {
      const isType: { [k in Type]: boolean } = {
        normal: true,
        fire: true,
        fighting: true,
        water: true,
        flying: true,
        grass: true,
        poison: true,
        electric: true,
        ground: true,
        psychic: true,
        rock: true,
        ice: true,
        bug: true,
        dragon: true,
        ghost: true,
        dark: true,
        steel: true,
        fairy: true,
      };
      if (count < 3) {
        return;
      }

      const pivots = mapPokemonCoords(board).filter(
        (slot) =>
          slot.pokemon?.side === side &&
          slot.pokemon.basePokemon.categories.includes('pivot')
      ) as { x: number; y: number; pokemon: PokemonObject }[]; // cast away the undefined, because we know it's not

      // remove each of them from being tracked by the CombatScene
      pivots.forEach((pivot) => scene.removePokemon(pivot.pokemon));

      // get the nearest space to the center of the pivot units
      const mechPosition = getNearestEmpty(board, getCenter(pivots));
      if (!mechPosition) {
        // no room for mech: should be impossible
        return;
      }

      const graphicalPosition = getCoordinatesForMainboard(mechPosition);
      const mech = scene
        .addPokemon(side, mechPosition, 'regigigas')
        .setScale(0);
      scene.add.tween({
        targets: [mech],
        scaleX: 1,
        scaleY: 1,
        ease: Phaser.Math.Easing.Quadratic.In,
        duration: 500,
      });

      pivots
        // map away the coords since we don't need them here
        .map(({ pokemon }) => pokemon)
        .forEach((pokemon) => {
          // update the mech's stats
          mech.basePokemon = {
            ...mech.basePokemon,
            categories: [
              ...mech.basePokemon.categories,
              // only keep the types
              ...pokemon.basePokemon.categories.filter(
                (synergy) => synergy in isType
              ),
            ],
          };
          mech.addStats({
            maxHP: Math.round(pokemon.basePokemon.maxHP * 0.7),
            attack: Math.round(pokemon.basePokemon.attack * 0.6),
            defense: Math.round(pokemon.basePokemon.defense * 0.1),
            specAttack: Math.round(pokemon.basePokemon.specAttack * 0.6),
            specDefense: Math.round(pokemon.basePokemon.specDefense * 0.1),
          });
          mech.synergyState.pivot += pokemon.basePokemon.stage;

          // then move them physically to the mech spot and hide them
          pokemon.move(graphicalPosition, {
            duration: 500,
            onComplete: () => {
              pokemon.setVisible(false).setActive(false);
            },
          });
        });

      mech.redrawCard();
      mech.once(PokemonObject.Events.Dead, () => {
        pivots.forEach((slot) => {
          // get the nearest position to where they were at the start of round
          const spotToJump = getNearestEmpty(scene.board, slot);
          if (!spotToJump) {
            return;
          }
          const graphicalSpot = getCoordinatesForMainboard(spotToJump);
          slot.pokemon.takeDamage(slot.pokemon.maxHP / 2);
          slot.pokemon.setVisible(true).setActive(true).move(graphicalSpot);
          scene.board[spotToJump.x][spotToJump.y] = slot.pokemon;
          scene.setTurn(slot.pokemon);
        });
      });
    },
  },
  utility: {
    category: 'utility',
    displayName: 'Utility - Stockpile',
    description: `Utility Pokemon regenerate HP or PP,
whichever one is lower.

 (2) - 5% of HP/PP per turn
 (3) - 7% of HP/PP
 (4) - 9% of HP/PP`,
    thresholds: [2, 3, 4],
    onTurnStart({ pokemon, count }) {
      const tier = getSynergyTier(this, count);
      if (tier === 0) {
        return;
      }

      if (pokemon.basePokemon.categories.includes('utility')) {
        const regen = tier === 1 ? 0.05 : tier === 2 ? 0.07 : 0.09;

        if (
          pokemon.maxPP &&
          pokemon.currentPP / pokemon.maxPP > pokemon.currentHP / pokemon.maxHP
        ) {
          pokemon.addPP(pokemon.maxPP * regen);
          pokemon.redrawBars();
        } else {
          pokemon.heal(Math.round(pokemon.maxHP * regen));
          // note: `heal` already redraws bars
        }
      }
    },
  },
};
