import { Button } from '../../objects/button.object';
import { Player } from '../../objects/player.object';
import { PokemonForSaleObject } from '../../objects/pokemon-for-sale.object';
import { Coords } from './combat/combat.helpers';
import { ShopPool } from './shop.helpers';

const CELL_WIDTH = 140;
const CELL_HEIGHT = 90;
const CELL_COUNT = 5;
const POKEMON_OFFSET = 20;
const REROLL_COST = 2;
const BORDER_SIZE = 50;

export interface ShopSceneData {
  readonly player: Player;
  readonly pool: ShopPool;
}

export class ShopScene extends Phaser.Scene {
  static readonly KEY = 'ShopScene';
  private centre: Coords = { x: 0, y: 0 };
  private pokemonForSale: PokemonForSaleObject[] = Array(CELL_COUNT);

  private player: Player; // hacky temporary solution
  private pool: ShopPool;

  constructor() {
    super({
      key: ShopScene.KEY,
    });
  }

  create(data: ShopSceneData): void {
    this.player = data.player;
    this.pool = data.pool;

    this.drawBase();
    this.reroll();

    const rerollButton = this.add.existing(
      new Button(this, this.centre.x, this.centre.y + 60, 'Reroll')
    );

    rerollButton.on(Button.Events.CLICK, () => {
      // maybe not best to be handled by the shop
      if (this.player.gold >= REROLL_COST) {
        this.player.gold -= REROLL_COST;
        this.reroll();
      } else {
        console.log('Not enough gold to reroll');
      }
    });

    this.input.on(
      Phaser.Input.Events.POINTER_DOWN,
      (event: Phaser.Input.Pointer) => {
        if (event.leftButtonDown()) {
          const i = this.getShopIndexForCoordinates({
            x: event.downX,
            y: event.downY,
          });
          if (i !== undefined) {
            if (this.pokemonForSale[i] === undefined) {
              console.log('No pokemon here');
              return;
            }

            if (!this.buyPokemon(i)) {
              console.log('Not enough gold to buy this pokemon');
            }
          }
        }
      }
    );
  }

  setCentre(centre: Coords): void {
    this.centre = centre;
  }

  /**
   * Draws the shop without the pokemon
   */
  drawBase(): void {
    const width = CELL_WIDTH * CELL_COUNT;
    const height = CELL_HEIGHT + BORDER_SIZE * 2;
    this.add.rectangle(this.centre.x, this.centre.y, width, height, 0x2f4858);

    this.add.grid(
      this.centre.x, // center x
      this.centre.y - POKEMON_OFFSET, // center y
      CELL_WIDTH * CELL_COUNT, // total width
      CELL_HEIGHT, // total height
      CELL_WIDTH, // cell width
      CELL_HEIGHT, // cell height
      0, // fill: none
      0, // fill alpha: transparent
      0xffaa00, // lines: yellow
      1 // line alpha: solid
    );
  }

  /**
   * Refreshes the shop with new pokemon.
   */
  reroll(): void {
    // Remove the old pokemon
    this.pokemonForSale.forEach(pokemon => {
      pokemon.destroy();
    });

    const newShop = this.pool.reroll(
      this.pokemonForSale.map(pokemon => pokemon.pokemonName)
    );

    this.pokemonForSale = newShop.map((pokemon, i) => {
      const currCoords = this.getCoordinatesForShopIndex(i);
      return new PokemonForSaleObject(this, currCoords, pokemon);
    });
  }

  buyPokemon(index: number): boolean {
    const bought = this.player.buyPokemon(
      this.pokemonForSale[index].pokemonName
    );
    if (bought) {
      this.pokemonForSale[index].destroy();
      delete this.pokemonForSale[index];
    }
    return bought;
  }

  /**
   * Returns the graphical x and y coordinates for a spot in the sideboard.
   */
  getCoordinatesForShopIndex(i: number): Coords {
    return {
      x: this.centre.x + CELL_WIDTH * (i - (CELL_COUNT - 1) / 2),
      y: this.centre.y - POKEMON_OFFSET,
    };
  }

  /**
   * Returns the sideboard index for a graphical coordinate,
   * or `undefined` if the point isn't within the sideboard
   */
  getShopIndexForCoordinates({ x, y }: Coords): number | undefined {
    // 35 = CELL_WIDTH / 2
    // ie. the distance to the top of the sideboard
    if (
      y < this.centre.y - POKEMON_OFFSET - 35 ||
      y > this.centre.y - POKEMON_OFFSET + 35
    ) {
      return undefined;
    }

    // (this.centre.x - CELL_WIDTH * CELL_COUNT / 2)
    // is the distance from start of grid to the left edge of the sideboard
    const index =
      (x - (this.centre.x - (CELL_WIDTH * CELL_COUNT) / 2)) / CELL_WIDTH;
    if (index < 0 || index >= CELL_COUNT) {
      return undefined;
    }
    return Math.floor(index);
  }
}
