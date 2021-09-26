import { Category, getSynergyTier, synergyData } from '../core/game.model';
import { pokemonData, PokemonName } from '../core/pokemon.model';
import { flatten, isDefined } from '../helpers';
import { inBounds } from '../scenes/game/combat/combat.helpers';
import { CombatBoard } from '../scenes/game/combat/combat.scene';
import {
  BOARD_WIDTH,
  getCoordinatesForMainboard,
  Stage,
} from '../scenes/game/game.helpers';
import {
  GameScene,
  getCoordinatesForSideboardIndex,
  getMainboardLocationForCoordinates,
  getSideboardLocationForCoordinates,
  PokemonLocation,
} from '../scenes/game/game.scene';
import { ShopPool } from '../scenes/game/shop.helpers';
import { PokemonObject } from './pokemon.object';
import { SynergyMarker } from './synergy-marker.object';
import { defaultStyle } from './text.helpers';

export class Player extends Phaser.GameObjects.GameObject {
  static Events = {
    SELECT: 'selectPlayer',
  };

  /**
   * Player level, which corresponds to the max number of Pokemon they can field
   * In-game, this is represented by "Gym Badges"
   */
  level = 1;
  // EXP progress to the next level
  // TODO: implement when implementing traditional games
  // exp = 0;
  hp = 100;
  gold = 20;
  /** Consecutive win/loss streak */
  streak = 0;
  /** A map storing whether a Pokemon (by id) is currently evolving. */
  markedForEvolution: { [k: string]: boolean } = {};
  isHumanPlayer: boolean;

  nameInList: Phaser.GameObjects.Text;

  /** The Pokemon board representing the player's team composition */
  mainboard: CombatBoard = Array(BOARD_WIDTH)
    .fill(undefined)
    // fill + map rather than `fill` an array because
    // `fill` will only initialise one array and fill with shallow copies
    .map(() => Array(BOARD_WIDTH).fill(undefined));

  /** The Pokemon in the player's sideboard (spare Pokemon) */
  sideboard: (PokemonObject | undefined)[] = Array(8).fill(undefined);

  synergies: { category: Category; count: number }[] = [];
  synergyMarkers: { [k in Category]?: SynergyMarker } = {};

  readonly pool: ShopPool;
  currentShop: PokemonName[];

  private visible: boolean;

  constructor(
    scene: GameScene,
    public playerName: string,
    x: number,
    y: number,
    {
      pool,
      isHumanPlayer = false,
      initialLevel = 1,
    }: { pool: ShopPool; isHumanPlayer?: boolean; initialLevel?: number }
  ) {
    super(scene, 'player');
    this.pool = pool;
    this.isHumanPlayer = isHumanPlayer;
    this.visible = isHumanPlayer;
    this.level = initialLevel;

    // not part of group - always visible
    // TODO: move to game scene?
    this.nameInList = scene.add
      .text(x, y, `${this.playerName} - ${this.hp}`, defaultStyle)
      .setInteractive()
      .on(Phaser.Input.Events.POINTER_DOWN, () => {
        this.emit(Player.Events.SELECT);
      });
  }

  update() {
    this.nameInList.setText(
      `${this.playerName} - ${this.hp} ${this.visible ? '👁️' : ''}`
    );
  }

  updatePosition(x: number, y: number) {
    this.nameInList.setPosition(x, y);
  }

  setVisible(visible: boolean): this {
    this.visible = visible;
    [...flatten(this.mainboard), ...this.sideboard].forEach(pokemon =>
      pokemon?.setVisible(visible)
    );
    this.updateSynergies();
    return this;
  }

  /**
   * Calculate streaks and award win gold
   * @param won True if the round was won by player
   */
  battleResult(won: boolean, gameStage: Stage): void {
    if (won) {
      this.streak = Math.max(1, this.streak + 1);
      this.gold += gameStage.gold(this, won, Math.abs(this.streak));
    } else {
      this.streak = Math.min(-1, this.streak - 1);
      this.hp -= gameStage.damage();
    }
  }

  /**
   * Returns the PokemonObject at the given location (if it exists)
   */
  getPokemonAtLocation(location?: PokemonLocation): PokemonObject | undefined {
    if (!location) {
      return undefined;
    }
    return location.location === 'mainboard'
      ? this.mainboard[location.coords.x][location.coords.y]
      : this.sideboard[location.index];
  }

  /**
   * Assigns a Pokemon object to a given location.
   *
   * WARNING: Doesn't do any checks or cleanup of the current Pokemon at that location.
   * Make sure that either the location is empty, or you're tracking the Pokemon there.
   */
  setPokemonAtLocation(location: PokemonLocation, pokemon?: PokemonObject) {
    if (location.location === 'mainboard') {
      this.mainboard[location.coords.x][location.coords.y] = pokemon;
      // move sprite as well
      if (pokemon) {
        const { x, y } = getCoordinatesForMainboard(location.coords);
        pokemon.setPosition(x, y);
      }
      this.updateSynergies();
    } else {
      this.sideboard[location.index] = pokemon;
      // move sprite as well
      if (pokemon) {
        const { x, y } = getCoordinatesForSideboardIndex(location.index);
        pokemon.setPosition(x, y);
      }
    }
  }

  buyPokemon(pokemonName: PokemonName): boolean {
    const price = pokemonData[pokemonName].tier;
    if (this.gold < price) {
      return false;
    }

    if (!this.canAddPokemonToSideboard()) {
      return false;
    }

    this.gold -= pokemonData[pokemonName].tier;
    this.addPokemonToSideboard(pokemonName);
    return true;
  }

  sellPokemon(pokemon: PokemonObject) {
    if (pokemon.basePokemon.stage === 1) {
      this.gold += pokemon.basePokemon.tier;
    } else if (pokemon.basePokemon.stage === 2) {
      this.gold += pokemon.basePokemon.tier + 2;
    } else {
      this.gold += pokemon.basePokemon.tier + 4;
    }

    this.pool.returnToShop(pokemon.basePokemon.name);
    this.removePokemon(pokemon);
  }

  addPokemonToSideboard(pokemon: PokemonName) {
    if (!this.canAddPokemonToSideboard()) {
      return;
    }

    // should never be -1 because we just checked
    const empty = this.sideboard.findIndex(v => !v);
    // insert new Pokemon
    const newPokemon = new PokemonObject({
      scene: this.scene,
      ...getCoordinatesForSideboardIndex(empty),
      name: pokemon,
      side: this.isHumanPlayer ? 'player' : 'enemy',
    }).setVisible(this.visible);
    this.scene.add.existing(newPokemon);
    this.sideboard[empty] = newPokemon;

    /* check evolutions */
    if (newPokemon.basePokemon.evolution) {
      this.applyEvolutions(newPokemon);
    }
  }

  movePokemon(pokemon: PokemonObject, newLocation: PokemonLocation) {
    // a PokemonObject has an { x, y }, so it fits the function signature
    const fromLocation =
      getMainboardLocationForCoordinates(pokemon) ||
      getSideboardLocationForCoordinates(pokemon);
    if (!fromLocation) {
      return;
    }

    // check if a Pokemon already exists here
    const swapTarget = this.getPokemonAtLocation(newLocation);

    // don't move add to mainboard if there's no room
    if (
      newLocation.location === 'mainboard' &&
      fromLocation.location === 'sideboard' &&
      !this.canAddPokemonToMainboard() &&
      // can still swap
      !swapTarget
    ) {
      return;
    }

    this.setPokemonAtLocation(newLocation, pokemon);
    this.setPokemonAtLocation(fromLocation, swapTarget);
  }

  /**
   * Checks for possible evolutions that can be triggered by a Pokemon.
   *
   * For optimisation purposes, only checks one Pokemon.
   * This should be fine if it's called every time a new Pokemon is added.
   */
  applyEvolutions(newPokemon: PokemonObject): void {
    const evolutionName = newPokemon.basePokemon.evolution;
    if (!evolutionName) {
      return;
    }

    // TODO: make this more imperative if the performance is bad
    // it's probably fine though
    const samePokemon =
      // get all the Pokemon
      [...flatten(this.mainboard), ...this.sideboard]
        .filter(isDefined)
        // that are have the same Name as this one
        .filter(pokemon => pokemon.name === newPokemon.name)
        // that aren't already evolving
        .filter(pokemon => !this.markedForEvolution[pokemon.id])
        // and pick the first three
        .slice(0, 3);
    if (samePokemon.length < 3) {
      return;
    }
    const evoLocation =
      getMainboardLocationForCoordinates(samePokemon[0]) ||
      getSideboardLocationForCoordinates(samePokemon[0]);
    if (!evoLocation) {
      // should always be defined, but sure
      console.error('Could not find place to put evolution');
      return;
    }

    // mark these pokemon as evolving
    samePokemon.forEach(pokemon => {
      this.markedForEvolution[pokemon.id] = true;
    });

    const addEvolution = () => {
      // delete old Pokemon
      samePokemon.forEach(pokemon => {
        this.markedForEvolution[pokemon.id] = false;
        this.removePokemon(pokemon);
      });
      // add new one
      const evo = new PokemonObject({
        scene: this.scene,
        x: 0,
        y: 0,
        name: evolutionName,
        side: this.isHumanPlayer ? 'player' : 'enemy',
      }).setVisible(this.visible);
      this.scene.add.existing(evo);
      this.setPokemonAtLocation(evoLocation, evo);
      return evo;
    };

    // if not visible, just immediately evolve
    if (!this.visible) {
      const evo = addEvolution();
      return this.applyEvolutions(evo);
    }

    // otherwise play a flashing animation for a bit
    // not sure how to use tweens to get a flashing trigger of the outline
    // so this just manually creates one using timers
    const flashTimer = this.scene.time.addEvent({
      callback: () => {
        samePokemon.forEach(pokemon => pokemon.toggleOutline());
        // and make it faster
        flashTimer.timeScale *= 1.5;
      },
      delay: 350,
      loop: true,
    });

    this.scene.time.addEvent({
      callback: () => {
        // end animation
        flashTimer.remove();
        const evo = addEvolution();
        // play animation to make it super clear
        evo.setScale(1.5, 1.5);
        this.scene.add.tween({
          targets: [evo],
          scaleX: 1,
          scaleY: 1,
          ease: Phaser.Math.Easing.Expo.InOut,
          duration: 500,
          onComplete: () => {
            this.applyEvolutions(evo);
          },
        });
      },
      delay: 1000,
    });
  }

  removePokemon(pokemon: PokemonObject) {
    const location =
      getMainboardLocationForCoordinates(pokemon) ||
      getSideboardLocationForCoordinates(pokemon);
    if (!location) {
      // just destroy since it's not displayed anyway?
      return pokemon.destroy();
    }

    if (location.location === 'mainboard') {
      this.mainboard[location.coords.x][location.coords.y] = undefined;
      this.updateSynergies();
    } else {
      this.sideboard[location.index] = undefined;
    }
    pokemon.destroy();
  }

  updateSynergies() {
    // build a map of synergy -> count
    const synergyMap: { [k in Category]?: number } = {};
    const counted: { [k in PokemonName]?: boolean } = {};
    flatten(this.mainboard)
      .filter(isDefined)
      .forEach(pokemon => {
        // ignore pokemon if counted already
        if (counted[pokemon.basePokemon.base]) {
          return;
        }

        counted[pokemon.basePokemon.base] = true;
        pokemon.basePokemon.categories.forEach(category => {
          const newValue = (synergyMap[category] ?? 0) + 1;
          synergyMap[category] = newValue;
        });
      });
    // convert to an array of existing synergies
    this.synergies = Object.entries(synergyMap)
      .map(([category, count]) =>
        count
          ? {
              category: category as Category,
              count,
              // pre-compute this for sorting purposes as well
              tier: getSynergyTier(
                synergyData[category as Category].thresholds,
                count
              ),
            }
          : undefined
      )
      .filter(isDefined)
      // order by activated tier, then count, then in alphabetical order
      .sort((a, b) => {
        if (a.tier !== b.tier) {
          return b.tier - a.tier;
        }
        if (b.count !== a.count) {
          return b.count - a.count;
        }
        return b.category > a.category ? -1 : 1;
      });

    // hide all synergy markers
    Object.values(this.synergyMarkers).forEach(marker => {
      marker.setVisible(false).setActive(false);
    });

    if (!this.visible) {
      // if this is hidden, don't bother rendering synergies.
      return;
    }

    // then show and reposition the active ones
    this.synergies.slice(0, 12).forEach((synergy, index) => {
      if (!this.synergyMarkers[synergy.category]) {
        // if we haven't created the marker yet, create it now
        this.synergyMarkers[synergy.category] = this.scene.add.existing(
          new SynergyMarker(this.scene, 0, 0, synergy.category, synergy.count)
        );
      }
      this.synergyMarkers[synergy.category]
        ?.setActive(true)
        .setVisible(true)
        .setPosition(40, 150 + index * SynergyMarker.height)
        .setCount(synergy.count);
    });
  }

  canAddPokemonToMainboard() {
    return flatten(this.mainboard).filter(v => !!v).length < this.level;
  }

  canAddPokemonToSideboard() {
    return this.sideboard.includes(undefined);
  }

  takeEnemyTurn() {
    this.currentShop = this.pool.reroll(this, this.currentShop);
    console.log('player', this.playerName, 'bought', this.currentShop[4]);
    this.buyPokemon(this.currentShop[4]);
    const newPokemon = this.getPokemonAtLocation({
      location: 'sideboard',
      index: 0,
    });
    if (!newPokemon) {
      return;
    }

    // ranged units go in back row, melee in front
    const y =
      newPokemon.basePokemon.basicAttack.range === 1
        ? Math.ceil(BOARD_WIDTH / 2)
        : BOARD_WIDTH - 1;
    let x = 0;
    // find a spot in the row where the unit will fit
    while (
      inBounds(this.mainboard, { x, y }) &&
      isDefined(this.mainboard[x][y])
    ) {
      x++;
    }
    // if such a spot exists, put them there
    if (
      inBounds(this.mainboard, { x, y }) &&
      !isDefined(this.mainboard[x][y])
    ) {
      this.movePokemon(newPokemon, { location: 'mainboard', coords: { x, y } });
    }
  }
}
