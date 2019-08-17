import { allPokemonNames, PokemonName } from '../../core/pokemon.model';
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

  addButton: Phaser.GameObjects.Text;
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
    // TODO: abstract button into its own Object class
    this.addButton = this.add
      .text(400, 580, 'Add Pokemon', { fill: '#FFAA00', fontSize: '22px' })
      // center the button so it's inline with the logo
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true });
    this.addButton
      .on(
        Phaser.Input.Events.POINTER_OVER,
        () => this.addButton.setStyle({ fontStyle: 'bold' }),
        this
      )
      .on(
        Phaser.Input.Events.POINTER_OUT,
        () => this.addButton.setStyle({ fontStyle: 'normal' }),
        this
      )
      .on(
        Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN,
        () =>
          this.addPokemon(
            allPokemonNames[Math.floor(Math.random() * allPokemonNames.length)]
          ),
        this
      );

    this.scene.launch(CombatScene.KEY);
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
    this.sideboard[empty] = new PokemonObject({
      scene: this,
      ...getCoordinatesForSideboardIndex(empty),
      name: pokemon,
      id: Math.random().toFixed(10),
      side: 'player',
    });
  }

  update() {
    if (!this.canAddPokemon()) {
      this.addButton.destroy();
    }
  }
}
