import { allPokemonNames, PokemonName } from '../../core/pokemon.model';
import { flatten } from '../../helpers';
import { Button } from '../../objects/button.object';
import { PokemonObject } from '../../objects/pokemon.object';
import { Coords } from './combat/combat.helpers';
import {
  CombatBoard,
  CombatScene,
  CombatSceneData,
} from './combat/combat.scene';

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
 * The main game scene.
 *
 * Keeps track of player state that persists through a whole game session,
 * including board layout, sideboard contents and shop contents.
 */
export class GameScene extends Phaser.Scene {
  static readonly KEY = 'GameScene';

  /* TEMPORARY JUNK */
  nextRoundButton: Button;
  addButton: Phaser.GameObjects.GameObject;
  enemyBoard: CombatBoard;
  /* END TEMPORARY JUNK */

  /** The Pokemon board representing the player's team composition */
  mainboard: CombatBoard;
  /** The Pokemon in the player's sideboard (spare Pokemon) */
  sideboard: (PokemonObject | undefined)[] = Array(8).fill(undefined);

  /** The grid used to display team composition during the downtime phase */
  prepGrid: Phaser.GameObjects.Grid;

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
      id: 'asdfgh',
      name: 'rotomw',
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

    this.addButton = this.add.existing(
      new Button(this, 400, 580, 'Add Pokemon')
    );
    this.addButton.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () =>
      this.addPokemonToSideboard(
        allPokemonNames[Math.floor(Math.random() * allPokemonNames.length)]
      )
    );

    this.addPokemonToMainboard({ x: 3, y: 4 }, 'talonflame');
    this.nextRoundButton = new Button(this, SIDEBOARD_X, 450, 'Next Round');
    this.nextRoundButton.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.nextRoundButton.destroy();
      this.startCombat();
    });
    this.add.existing(this.nextRoundButton);
  }

  update() {
    if (!this.canAddPokemonToSideboard()) {
      this.addButton.destroy();
    }
  }

  startCombat() {
    // hide all the prep-only stuff
    this.mainboard.forEach(col =>
      col.forEach(pokemon => pokemon && pokemon.setVisible(false))
    );
    this.prepGrid.setVisible(false);

    const sceneData: CombatSceneData = {
      playerBoard: this.mainboard,
      enemyBoard: this.enemyBoard,
      callback: (winner: 'player' | 'enemy') => {
        this.startDowntime();
      },
    };
    this.scene.launch(CombatScene.KEY, sceneData);
  }

  startDowntime() {
    // show all the prep-only stuff
    this.mainboard.forEach(col =>
      col.forEach(pokemon => pokemon && pokemon.setVisible(true))
    );
    this.prepGrid.setVisible(true);

    this.nextRoundButton = new Button(this, SIDEBOARD_X, 450, 'Next Round');
    this.nextRoundButton.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.nextRoundButton.destroy();
      this.startCombat();
    });
    this.add.existing(this.nextRoundButton);
  }

  canAddPokemonToMainboard() {
    return (
      flatten(this.mainboard).filter(v => !!v).length < MAX_MAINBOARD_POKEMON
    );
  }

  addPokemonToMainboard({ x, y }: Coords, name: PokemonName) {
    if (!this.canAddPokemonToMainboard()) {
      return;
    }
    const coords = getCoordinatesForMainboard({ x, y });
    const pokemon = new PokemonObject({
      scene: this,
      id: `${name}${x}${y}`,
      name,
      side: 'player',
      ...coords,
    });
    this.add.existing(pokemon);
    this.mainboard[x][y] = pokemon;
  }

  canAddPokemonToSideboard() {
    return this.sideboard.some(v => !v);
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
      id: Math.random().toFixed(10),
      side: 'player',
    });
    this.add.existing(newPokemon);
    this.sideboard[empty] = newPokemon;
  }
}
