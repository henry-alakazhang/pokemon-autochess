import { PokemonName } from '../../core/pokemon.model';
import { flatten } from '../../helpers';
import { Button } from '../../objects/button.object';
import { Player } from '../../objects/player.object';
import { PokemonObject } from '../../objects/pokemon.object';
import { Coords } from './combat/combat.helpers';
import {
  CombatBoard,
  CombatScene,
  CombatSceneData,
} from './combat/combat.scene';
import { ShopScene } from './shop.scene';

/** X-coordinate of the center of the grid */
const GRID_X = 400;
/** Y-coordinate of the center of the grid */
const GRID_Y = 250;
const BOARD_WIDTH = 5;

/** X-coordinate of the center of the sideboard */
const SIDEBOARD_X = 400;
/** Y-coordinate of the center of the sideboard */
const SIDEBOARD_Y = 500;
const CELL_WIDTH = 70;
const CELL_COUNT = 8;

/** X-coordinate of the center of the shop */
const SHOP_X = 400;
/** Y-coordinate of the center of the shop */
const SHOP_Y = 175;

const MAX_MAINBOARD_POKEMON = 6;

/**
 * Returns the graphical x and y coordinates for a spot in the sideboard.
 */
function getCoordinatesForSideboardIndex(i: number): Coords {
  return {
    x: SIDEBOARD_X + CELL_WIDTH * (i - (CELL_COUNT - 1) / 2),
    y: SIDEBOARD_Y,
  };
}

/**
 * Returns the graphical x and y coordinates for a spot in the mainboard
 */
function getCoordinatesForMainboard({ x, y }: Coords): Coords {
  return { x: GRID_X + (x - 2) * CELL_WIDTH, y: GRID_Y + (y - 2) * CELL_WIDTH };
}

/**
 * Returns the mainboard x and y coordinates for a graphical coordinate,
 * or `undefined` if the point isn't on the grid
 */
function getMainboardLocationForCoordinates({
  x,
  y,
}: Coords): PokemonLocation | undefined {
  // 225 = GRID_X - CELL_WIDTH * BOARD_WIDTH / 2
  // ie. the distance to the top of the grid
  const gridx = (x - 225) / CELL_WIDTH;
  // 75 = GRID_Y - CELL_WIDTH * BOARD_WIDTH / 2
  // ie. the distance to the left edge of the grid
  const gridy = (y - 75) / CELL_WIDTH;

  if (
    gridx < 0 ||
    gridx >= BOARD_WIDTH ||
    gridy < BOARD_WIDTH - 2 || // you can only put Pokemon in the bottom half of the grid
    gridy >= BOARD_WIDTH
  ) {
    return undefined;
  }

  return {
    location: 'mainboard' as const,
    coords: {
      x: Math.floor(gridx),
      y: Math.floor(gridy),
    },
  };
}

/**
 * Returns the sideboard index for a graphical coordinate,
 * or `undefined` if the point isn't within the sideboard
 */
function getSideboardLocationForCoordinates({
  x,
  y,
}: Coords): PokemonLocation | undefined {
  console.log(x, y, SIDEBOARD_Y);
  // 35 = CELL_WIDTH / 2
  // ie. the distance to the top of the sideboard
  if (y < SIDEBOARD_Y - 35 || y > SIDEBOARD_Y + 35) {
    return undefined;
  }

  // 120 = GRID_X - CELL_WIDTH * CELL_COUNT / 2
  // ie. the distance to the left edge of the sideboard
  const index = (x - 120) / CELL_WIDTH;
  if (index < 0 || index >= CELL_COUNT) {
    return undefined;
  }
  return {
    location: 'sideboard' as const,
    index: Math.floor(index),
  };
}

type PokemonLocation =
  | { location: 'mainboard'; coords: Coords }
  | { location: 'sideboard'; index: number };

/**
 * The main game scene.
 *
 * Keeps track of player state that persists through a whole game session,
 * including board layout, sideboard contents and shop contents.
 */
export class GameScene extends Phaser.Scene {
  static readonly KEY = 'GameScene';

  /* TEMPORARY JUNK */
  nextRoundButton: Button;
  shopButton: Phaser.GameObjects.GameObject;
  enemyBoard: CombatBoard;
  player: Player;
  playerGoldText: Phaser.GameObjects.Text;
  playerHPText: Phaser.GameObjects.Text;
  /* END TEMPORARY JUNK */

  /** The Pokemon board representing the player's team composition */
  mainboard: CombatBoard;
  /** The Pokemon in the player's sideboard (spare Pokemon) */
  sideboard: (PokemonObject | undefined)[] = Array(8).fill(undefined);

  /** A reference to the currently selected Pokemon */
  selectedPokemon?: PokemonObject;

  /** The grid used to display team composition during the downtime phase */
  prepGrid: Phaser.GameObjects.Grid;
  /** A background for highlighting the valid regions to put Pokemon in */
  prepGridHighlight: Phaser.GameObjects.Shape;

  shop: ShopScene;

  constructor() {
    super({
      key: GameScene.KEY,
    });
  }

  init() {
    this.mainboard = Array(5)
      .fill(undefined)
      // fill + map rather than `fill` an array because
      // `fill` will only initialise one array and fill with shallow copies
      .map(_ => Array(5).fill(undefined));

    this.enemyBoard = Array(5)
      .fill(undefined)
      .map(_ => Array(5).fill(undefined));
    this.enemyBoard[0][4] = new PokemonObject({
      scene: this,
      x: 0,
      y: 0,
      name: 'chandelure',
      side: 'enemy',
    });
  }

  create() {
    this.prepGrid = this.add.grid(
      GRID_X, // center x
      GRID_Y, // center y
      CELL_WIDTH * 5, // total width
      CELL_WIDTH * 5, // total height
      CELL_WIDTH, // cell width
      CELL_WIDTH, // cell height
      0, // fill: none
      0, // fill alpha: transparent
      0xffaa00, // lines: yellow
      1 // line alpha: solid
    );

    this.add.grid(
      SIDEBOARD_X, // center x
      SIDEBOARD_Y, // center y
      CELL_WIDTH * CELL_COUNT, // total width
      CELL_WIDTH, // total height
      CELL_WIDTH, // cell width
      CELL_WIDTH, // cell height
      0, // fill: none
      0, // fill alpha: transparent
      0xffaa00, // lines: yellow
      1 // line alpha: solid
    );

    this.prepGridHighlight = this.add
      .rectangle(
        GRID_X,
        // y: 1 tile from the bottom
        GRID_Y + CELL_WIDTH * 1.5,
        // width: stretches across all columns
        CELL_WIDTH * BOARD_WIDTH,
        // height: 2 rows
        CELL_WIDTH * 2,
        // color: ligher colour highlight
        0xffffff,
        // alpha: mostly transparent
        0.2
      )
      .setZ(-1)
      .setVisible(false);

    this.player = new Player();
    this.playerGoldText = this.add.text(50, 100, `Gold: ${this.player.gold}`);
    this.playerHPText = this.add.text(50, 120, `HP: ${this.player.currentHP}`);

    this.shop = this.scene.get(ShopScene.KEY) as ShopScene;
    this.shop.player = this.player; // temporary solution
    this.shop.setCentre({ x: SHOP_X, y: SHOP_Y });
    this.scene.launch(ShopScene.KEY);

    this.input.on(
      Phaser.Input.Events.POINTER_DOWN,
      (event: Phaser.Input.Pointer) => {
        if (!this.selectedPokemon) {
          this.selectPokemon({ x: event.downX, y: event.downY });
        } else {
          this.movePokemon({ x: event.downX, y: event.downY });
        }
      }
    );

    this.input.keyboard.on('keydown-SPACE', () => {
      this.toggleShop();
    });

    this.shopButton = this.add.existing(new Button(this, 400, 580, 'Shop'));
    this.shopButton.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () =>
      this.toggleShop()
    );

    this.nextRoundButton = new Button(this, SIDEBOARD_X, 450, 'Next Round');
    this.nextRoundButton.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.nextRoundButton.destroy();
      this.startCombat();
    });
    this.add.existing(this.nextRoundButton);
  }

  update() {
    this.playerGoldText.setText(`Gold: ${this.player.gold}`);
    this.playerHPText.setText(`HP: ${this.player.currentHP}`);

    // show the "valid range" highlight if a Pokemon is selected
    this.prepGridHighlight.setVisible(!!this.selectedPokemon);
  }

  startCombat() {
    // deselect any selected Pokemon
    if (this.selectedPokemon) {
      this.selectedPokemon.toggleOutline();
      this.selectedPokemon = undefined;
    }
    // hide all the prep-only stuff
    this.mainboard.forEach(col =>
      col.forEach(pokemon => pokemon && pokemon.setVisible(false))
    );
    this.prepGrid.setVisible(false);
    this.input.enabled = false;

    const sceneData: CombatSceneData = {
      playerBoard: this.mainboard,
      enemyBoard: this.enemyBoard,
      callback: (winner: 'player' | 'enemy') => {
        if (winner == 'player') {
          this.player.winGold();
        } else {
          --this.player.currentHP; // TODO: implement properly
        }
        this.startDowntime();
      },
    };
    this.scene.launch(CombatScene.KEY, sceneData);
  }

  startDowntime() {
    this.shop.reroll();
    // show all the prep-only stuff
    this.mainboard.forEach(col =>
      col.forEach(pokemon => pokemon && pokemon.setVisible(true))
    );
    this.prepGrid.setVisible(true);
    this.input.enabled = true;

    this.nextRoundButton = new Button(this, SIDEBOARD_X, 450, 'Next Round');
    this.nextRoundButton.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.nextRoundButton.destroy();
      this.startCombat();
    });
    this.add.existing(this.nextRoundButton);
  }

  /**
   * Picks the Pokemon at a given location (if it exists) and sets it as the selected Pokemon
   */
  selectPokemon(clickCoords: Coords) {
    const select =
      getMainboardLocationForCoordinates(clickCoords) ||
      getSideboardLocationForCoordinates(clickCoords);

    const pokemon = this.getPokemonAtLocation(select);
    if (!pokemon) {
      return;
    }

    this.selectedPokemon = pokemon.toggleOutline();
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

  canAddPokemonToMainboard() {
    return (
      flatten(this.mainboard).filter(v => !!v).length < MAX_MAINBOARD_POKEMON
    );
  }

  canAddPokemonToSideboard() {
    return this.sideboard.includes(undefined);
  }

  addPokemonToSideboard(pokemon: PokemonName) {
    if (!this.canAddPokemonToSideboard()) {
      return;
    }

    // should never be -1 because we just checked
    const empty = this.sideboard.findIndex(v => !v);
    // insert new Pokemon
    const newPokemon = new PokemonObject({
      scene: this,
      ...getCoordinatesForSideboardIndex(empty),
      name: pokemon,
      side: 'player',
    });
    this.add.existing(newPokemon);
    this.sideboard[empty] = newPokemon;
  }

  /**
   * Moves the currently selected Pokemon to the location determined by the `Pointer` event.
   * If no valid location is specified, the Pokemon is deselected.
   */
  movePokemon(clickCoords: Coords) {
    const fromPokemon = this.selectedPokemon;
    if (!fromPokemon) {
      return;
    }
    // a PokemonObject has an { x, y }, so it fits the function signature
    const fromLocation =
      getMainboardLocationForCoordinates(fromPokemon) ||
      getSideboardLocationForCoordinates(fromPokemon);
    if (!fromLocation) {
      return;
    }

    // deselect Pokemon even if we don't move it
    fromPokemon.toggleOutline();
    this.selectedPokemon = undefined;

    const toLocation =
      getSideboardLocationForCoordinates(clickCoords) ||
      getMainboardLocationForCoordinates(clickCoords);
    if (!toLocation) {
      return;
    }

    // check if a Pokemon already exists here
    const swapTarget = this.getPokemonAtLocation(toLocation);

    // don't move add to mainboard if there's no room
    if (
      toLocation.location === 'mainboard' &&
      fromLocation.location === 'sideboard' &&
      !this.canAddPokemonToMainboard() &&
      // can still swap
      !swapTarget
    ) {
      return;
    }

    this.setPokemonAtLocation(toLocation, fromPokemon);
    this.setPokemonAtLocation(fromLocation, swapTarget);
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
    } else {
      this.sideboard[location.index] = pokemon;
      // move sprite as well
      if (pokemon) {
        const { x, y } = getCoordinatesForSideboardIndex(location.index);
        pokemon.setPosition(x, y);
      }
    }
  }

  /**
   * Opens or closes the shop
   */
  toggleShop() {
    if (!this.scene.isPaused(ShopScene.KEY)) {
      this.scene.pause(ShopScene.KEY);
      this.scene.setVisible(false, ShopScene.KEY);
    } else {
      this.scene.resume(ShopScene.KEY);
      this.scene.setVisible(true, ShopScene.KEY);
    }
  }
}
