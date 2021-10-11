import { Category, getSynergyTier, synergyData } from '../core/game.model';
import { pokemonData, PokemonName } from '../core/pokemon.model';
import { flatten, isDefined } from '../helpers';
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
import { AIStrategy, getRandomAI } from './ai/ai';
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
  gold: number;
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

  /** Used mostly for AI to quickly determine if a synergy exists or not */
  synergyMap: { [k in Category]?: number } = {};

  readonly pool: ShopPool;
  currentShop: PokemonName[];

  private aiStrategy: AIStrategy;
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
      startingGold = 20,
    }: {
      pool: ShopPool;
      isHumanPlayer?: boolean;
      initialLevel?: number;
      startingGold?: number;
    }
  ) {
    super(scene, 'player');
    this.pool = pool;
    this.isHumanPlayer = isHumanPlayer;
    this.visible = isHumanPlayer;
    this.level = initialLevel;
    this.gold = startingGold;
    if (!this.isHumanPlayer) {
      this.aiStrategy = getRandomAI();
    }

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
    } else {
      this.streak = Math.min(-1, this.streak - 1);
      this.hp -= gameStage.damage();
    }
    this.gold += gameStage.gold(this, won, Math.abs(this.streak));
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
      console.log('not enough gold to buy');
      return false;
    }

    // if the board is full
    if (!this.canAddPokemonToSideboard()) {
      // if there are 2 units on the board we can evolve now, do it
      // note: this is a bit dangerous because if it returns true,
      // it will have mutated the board...
      if (this.applyEvolutions(pokemonName, 2)) {
        console.log('player', this.playerName, 'bought', pokemonName);
        this.gold -= pokemonData[pokemonName].tier;
        return true;
      }

      // otherwise unit won't fit
      console.log('not enough room to buy');
      return false;
    }

    console.log('player', this.playerName, 'bought', pokemonName);
    this.gold -= pokemonData[pokemonName].tier;
    this.addPokemonToSideboard(pokemonName);
    return true;
  }

  sellPokemon(pokemon: PokemonObject) {
    console.log('player', this.playerName, 'sold', pokemon.basePokemon.name);
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
    this.applyEvolutions(newPokemon.name);
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
   *
   * Returns whether or not the Pokemon evolved
   */
  applyEvolutions(
    speciesToCheck: PokemonName,
    /**
     * The amount of Pokemon needed on board to evolve.
     * DO NOT MODIFY unless you have a good reason
     */
    threshold = 3
  ): boolean {
    const evolutionName = pokemonData[speciesToCheck].evolution;
    if (!evolutionName) {
      return false;
    }

    // TODO: make this more imperative if the performance is bad
    // it's probably fine though
    const samePokemon =
      // get all the Pokemon
      [...flatten(this.mainboard), ...this.sideboard]
        .filter(isDefined)
        // that are have the same Name as this one
        .filter(pokemon => pokemon.name === speciesToCheck)
        // and pick the first three
        .slice(0, 3);
    if (samePokemon.length < threshold) {
      return false;
    }
    const evoLocation =
      getMainboardLocationForCoordinates(samePokemon[0]) ||
      getSideboardLocationForCoordinates(samePokemon[0]);
    if (!evoLocation) {
      // should always be defined, but sure
      console.error('Could not find place to put evolution');
      return false;
    }

    // remove existing Pokemon (without destroying)
    samePokemon.forEach(pokemon => {
      this.removePokemon(pokemon, false);
    });

    // add (hidden) evolution to board
    const evo = new PokemonObject({
      scene: this.scene,
      x: 0,
      y: 0,
      name: evolutionName,
      side: this.isHumanPlayer ? 'player' : 'enemy',
    }).setVisible(false);
    this.scene.add.existing(evo);
    this.setPokemonAtLocation(evoLocation, evo);

    // play animations
    samePokemon.forEach(pokemon => {
      if (this.visible) {
        // if visible, play animation
        // move towards Pokemon, grow, merge
        pokemon.outlineSprite.setVisible(true);
        this.scene.add.tween({
          targets: [pokemon],
          scale: 1,
          duration: 400,
        });
        pokemon.move(samePokemon[0], {
          duration: 400,
          onComplete: () => {
            pokemon.destroy();
          },
        });
      } else {
        // otherwise just destroy
        pokemon.destroy();
      }
    });

    // after animation plays, set visibility
    if (this.visible) {
      this.scene.time.addEvent({
        delay: 400,
        callback: () => {
          evo.setVisible(true);

          if (!this.applyEvolutions(evo.name)) {
            // if this is the last evo, make it obvious
            evo.setScale(1.5);
            this.scene.add.tween({
              targets: [evo],
              scale: 1,
              duration: 400,
            });
          }
        },
      });
    } else {
      // if not visible, just check for evolutions immediately
      this.applyEvolutions(evo.name);
    }
    return true;
  }

  removePokemon(pokemon: PokemonObject, destroy = true) {
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

    if (destroy) {
      pokemon.destroy();
    }
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
    this.synergyMap = synergyMap;
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
    console.log(`${this.playerName}'s turn: ${this.aiStrategy.name}`);

    this.currentShop = this.pool.reroll(this, this.currentShop);

    this.aiStrategy.decideBuys(this).forEach(pokemon => {
      if (this.buyPokemon(pokemon)) {
        delete this.currentShop[this.currentShop.indexOf(pokemon)];
      }
    });

    while (this.aiStrategy.decideReroll(this)) {
      this.currentShop = this.pool.reroll(this, this.currentShop);
      this.gold -= 2;

      this.aiStrategy.decideBuys(this).forEach(pokemon => {
        if (this.buyPokemon(pokemon)) {
          delete this.currentShop[this.currentShop.indexOf(pokemon)];
        }
      });
    }

    // for everyone in the selected board, position them onto the mainboard
    const boardOrder = this.aiStrategy.prioritiseBoard(this);
    // we position them by "removing" all the Pokemon from the board first,
    // then manually putting them in the right places using `setPokemonAtLocation`
    for (let x = 0; x < BOARD_WIDTH; x++) {
      for (let y = 0; y < BOARD_WIDTH; y++) {
        this.mainboard[x][y] = undefined;
      }
    }
    for (let i = 0; i < this.sideboard.length; i++) {
      this.sideboard[i] = undefined;
    }

    // the index of the first free space in a given row
    const spaceInRow = [0, 0, 0, 0, 0, 0];
    boardOrder.forEach((selectedPokemon, index) => {
      if (index < this.level) {
        // if index < level, we have room on the board

        // pick a spot for them based on their range.
        // ranged units go in back row, melee in front
        const y =
          selectedPokemon.basePokemon.basicAttack.range === 1
            ? Math.ceil(BOARD_WIDTH / 2)
            : BOARD_WIDTH - 1;
        const x = spaceInRow[y];

        this.setPokemonAtLocation(
          {
            location: 'mainboard',
            coords: { x, y },
          },
          selectedPokemon
        );
        spaceInRow[y]++;
        return;
      }

      // otherwise,  we've already put max pokemon on the board.
      // the rest go into the sideboard in order
      // (index - this.level starts at 0)
      this.setPokemonAtLocation(
        {
          location: 'sideboard',
          index: index - this.level,
        },
        selectedPokemon
      );
    });

    // sell any pokemon (if relevant)
    this.aiStrategy
      .decideSells?.(this)
      .forEach(toSell => this.sellPokemon(toSell));
  }
}
