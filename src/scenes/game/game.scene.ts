import { synergyData } from '../../core/game.model';
import {
  allPokemonNames,
  buyablePokemon,
  pokemonData,
  PokemonName,
} from '../../core/pokemon.model';
import { flatten, isDefined } from '../../helpers';
import { Button } from '../../objects/button.object';
import { Player } from '../../objects/player.object';
import { PokemonObject } from '../../objects/pokemon.object';
import { Coords, inBounds } from './combat/combat.helpers';
import { CombatScene, CombatSceneData } from './combat/combat.scene';
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

const POOL_SIZES = {
  1: 3,
  2: 3,
  3: 3,
  4: 3,
  5: 3,
};

export type PokemonLocation =
  | { location: 'mainboard'; coords: Coords }
  | { location: 'sideboard'; index: number };

/**
 * Returns the graphical x and y coordinates for a spot in the sideboard.
 */
export function getCoordinatesForSideboardIndex(i: number): Coords {
  return {
    x: SIDEBOARD_X + CELL_WIDTH * (i - (CELL_COUNT - 1) / 2),
    y: SIDEBOARD_Y,
  };
}

/**
 * Returns the graphical x and y coordinates for a spot in the mainboard
 */
export function getCoordinatesForMainboard({ x, y }: Coords): Coords {
  return { x: GRID_X + (x - 2) * CELL_WIDTH, y: GRID_Y + (y - 2) * CELL_WIDTH };
}

/**
 * Returns the mainboard x and y coordinates for a graphical coordinate,
 * or `undefined` if the point isn't on the grid
 */
export function getMainboardLocationForCoordinates({
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
export function getSideboardLocationForCoordinates({
  x,
  y,
}: Coords): PokemonLocation | undefined {
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

/**
 * The main game scene.
 *
 * Keeps track of player state that persists through a whole game session,
 * including board layout, sideboard contents and shop contents.
 */
export class GameScene extends Phaser.Scene {
  static readonly KEY = 'GameScene';

  /**
   * The pool of available Pokemon to buy in the shop
   */
  private pool: {
    [k in PokemonName]?: number;
  } = {};

  players: Player[];

  /* TEMPORARY JUNK */
  nextRoundButton: Button;
  shopButton: Phaser.GameObjects.GameObject;
  player: Player;
  playerGoldText: Phaser.GameObjects.Text;
  playerHPText: Phaser.GameObjects.Text;
  sellArea: Phaser.GameObjects.Shape;
  sellText: Phaser.GameObjects.Text;
  /* END TEMPORARY JUNK */

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
    buyablePokemon.forEach(pokemon => {
      this.pool[pokemon] = POOL_SIZES[pokemonData[pokemon].tier];
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

    this.players = new Array(8).fill(undefined).map(() => new Player(this));
    // players[0] is always the human player
    [this.player] = this.players;
    this.playerGoldText = this.add.text(50, 100, `Gold: ${this.player.gold}`);
    this.playerHPText = this.add.text(50, 120, `HP: ${this.player.currentHP}`);

    this.shop = this.scene.get(ShopScene.KEY) as ShopScene;
    this.shop.player = this.player; // temporary solution
    this.shop.pool = this.pool;
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

    this.sellArea = this.add
      .rectangle(
        710, // centre x
        300, // centre y
        100, // width
        250, // height
        0xff0000, // color: red
        0.2 // alpha: mostly transparent
      )
      .setVisible(false);

    this.sellArea.setInteractive().on('pointerdown', () => {
      this.sellPokemon(this.player, this.selectedPokemon as PokemonObject);
    });

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
    this.sellArea.setVisible(!!this.selectedPokemon);
  }

  startCombat() {
    // deselect any selected Pokemon
    if (this.selectedPokemon) {
      this.selectedPokemon.toggleOutline();
      this.selectedPokemon = undefined;
    }
    // hide all the prep-only stuff
    this.player.mainboard.forEach(col =>
      col.forEach(pokemon => pokemon?.setVisible(false))
    );
    this.prepGrid.setVisible(false);
    this.input.enabled = false;
    // hide the shop
    if (!this.scene.isPaused(ShopScene.KEY)) {
      this.scene.setVisible(false, ShopScene.KEY);
      this.scene.pause(ShopScene.KEY);
    }

    const sceneData: CombatSceneData = {
      playerBoard: this.player.mainboard,
      playerSynergies: this.player.synergies,
      // enemyBoard: this.enemyBoard,
      enemyBoard: this.generateEnemyBoard(),
      enemySynergies: [],
      callback: (winner: 'player' | 'enemy') => {
        this.player.synergies.forEach(synergy => {
          synergyData[synergy.category].onRoundEnd?.({
            scene: this,
            board: this.player.mainboard,
            winner,
            count: synergy.count,
          });
        });
        this.player.battleResult(winner === 'player');
        this.startDowntime();
      },
    };
    this.scene.launch(CombatScene.KEY, sceneData);
  }

  startDowntime() {
    this.shop.reroll();
    this.players.forEach(player => player.gainRoundEndGold());

    // show all the prep-only stuff
    this.player.mainboard.forEach(col =>
      col.forEach(pokemon => pokemon?.setVisible(true))
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

    const pokemon = this.player.getPokemonAtLocation(select);
    if (!pokemon) {
      return;
    }

    this.selectedPokemon = pokemon.toggleOutline();
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
    const swapTarget = this.player.getPokemonAtLocation(toLocation);

    // don't move add to mainboard if there's no room
    if (
      toLocation.location === 'mainboard' &&
      fromLocation.location === 'sideboard' &&
      !this.player.canAddPokemonToMainboard() &&
      // can still swap
      !swapTarget
    ) {
      return;
    }

    this.player.setPokemonAtLocation(toLocation, fromPokemon);
    this.player.setPokemonAtLocation(fromLocation, swapTarget);
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

  buyPokemon(player: Player, pokemonName: PokemonName): boolean {
    const price = pokemonData[pokemonName].tier;
    if (this.player.gold < price) {
      return false;
    }

    if (!this.player.canAddPokemonToSideboard()) {
      return false;
    }

    player.gold -= pokemonData[pokemonName].tier;
    this.player.addPokemonToSideboard(pokemonName);
    return true;
  }

  sellPokemon(player: Player, pokemon: PokemonObject) {
    if (pokemon.basePokemon.stage === 1) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.pool[pokemon.basePokemon.base]! += 1;
      player.gold += pokemon.basePokemon.tier;
    } else if (pokemon.basePokemon.stage === 2) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.pool[pokemon.basePokemon.base]! += 3;
      player.gold += pokemon.basePokemon.tier + 2;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.pool[pokemon.basePokemon.base]! += 9;
      player.gold += pokemon.basePokemon.tier + 4;
    }

    this.player.removePokemon(pokemon);
  }

  /**
   * Generates a random enemy board with "comparable strength" to the player board.
   * TEMP function until multiple players are implemented
   *
   * TODO: generate with synergies taken into account
   */
  generateEnemyBoard() {
    // calculate total cost of player board
    const value = flatten(this.player.mainboard)
      .filter(isDefined)
      .reduce(
        (total, pokemon) =>
          total + pokemon.basePokemon.tier * 3 ** pokemon.basePokemon.stage,
        0
      );
    let enemyValue = 0;
    let addedCount = 0;
    const enemyBoard = Array(5)
      .fill(undefined)
      .map(() => Array(5).fill(undefined));

    while (enemyValue < value && addedCount < 6) {
      const pick =
        pokemonData[
          allPokemonNames[Math.floor(Math.random() * allPokemonNames.length)]
        ];
      const pickValue = pick.tier * 3 ** pick.stage;
      if (pickValue < value - enemyValue + 2) {
        // ranged units go in back row, melee in front
        const y = pick.basicAttack.range === 1 ? 3 : 4;
        let x = 0;
        // find a spot in the row where the unit will fit
        while (inBounds(enemyBoard, { x, y }) && isDefined(enemyBoard[x][y])) {
          x++;
        }
        // if such a spot exists, put them there
        if (inBounds(enemyBoard, { x, y }) && !isDefined(enemyBoard[x][y])) {
          enemyBoard[x][y] = new PokemonObject({
            scene: this,
            x: 0,
            y: 0,
            name: pick.name,
            side: 'enemy',
          });
          enemyValue += pickValue;
          addedCount += 1;
        }
      }
    }
    return enemyBoard;
  }
}
