import { allPokemonNames, PokemonName } from '../../core/pokemon.model';
import { Button } from '../../objects/button.object';
import { PokemonObject } from '../../objects/pokemon.object';
import { Coords } from './combat/combat.helpers';
import { CombatScene } from './combat/combat.scene';

const GRID_X = 400;
const GRID_Y = 500;
const CELL_WIDTH = 70;
const CELL_COUNT = 8;

/**
 * Returns the graphical x and y coordinates for a spot in the sideboard.
 */
function getCoordinatesForSideboardIndex(i: number): Coords {
  return {
    x: GRID_X + CELL_WIDTH * (i - (CELL_COUNT - 1) / 2),
    y: GRID_Y,
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

  /* TEMPORARY JUNK */
  nextRoundButton: Button;
  addButton: Phaser.GameObjects.GameObject;
  /* END TEMPORARY JUNK */

  sideboard: (PokemonObject | undefined)[] = Array(8).fill(undefined);

  constructor() {
    super({
      key: GameScene.KEY,
    });
  }

  create() {
    this.add.grid(
      GRID_X, // center x
      GRID_Y, // center y
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
      this.addPokemon(
        allPokemonNames[Math.floor(Math.random() * allPokemonNames.length)]
      )
    );

    this.startCombat();
  }

  update() {
    if (!this.canAddPokemon()) {
      this.addButton.destroy();
    }
  }

  startCombat() {
    this.scene.launch(CombatScene.KEY, {
      callback: (winner: 'player' | 'enemy') => {
        this.startDowntime();
      },
    });
  }

  startDowntime() {
    this.nextRoundButton = new Button(this, GRID_X, 300, 'Next Round');
    this.nextRoundButton.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.nextRoundButton.destroy();
      this.startCombat();
    });
    this.add.existing(this.nextRoundButton);
  }

  canAddPokemon() {
    return this.sideboard.some(v => !v);
  }

  addPokemon(pokemon: PokemonName) {
    if (!this.canAddPokemon()) {
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
