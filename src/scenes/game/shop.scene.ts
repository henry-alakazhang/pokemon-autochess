import * as Phaser from 'phaser';
import { Coords } from './combat/combat.helpers';
import { PokemonObject } from '../../objects/pokemon.object';
import { allPokemonNames, PokemonName } from '../../core/pokemon.model';
import { Button } from '../../objects/button.object';
import { Player } from '../../objects/player.object';
import { GameScene } from './game.scene';

const CELL_WIDTH = 70;
const CELL_COUNT = 6;
const POKEMON_OFFSET = 20;
const REROLL_COST = 2;


export class ShopScene extends Phaser.Scene {
  static readonly KEY = 'ShopScene';
  private centre: Coords = { x: 0, y: 0 };
  private pokemonForSale: PokemonObject[] = new Array(CELL_COUNT);
  private goldTexts: Phaser.GameObjects.Text[] = new Array(CELL_COUNT);

  public player: Player;   // hacky temporary solution

  constructor() {
    super({
      key: ShopScene.KEY,
    });
  }

  preload(): void {  }

  create(): void {
    this.drawBase();
    this.reroll();

    let rerollButton = this.add.existing(
      new Button(this, this.centre.x, this.centre.y + 60, 'Reroll')
    );

    rerollButton.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      // maybe not best to be handled by the shop
      if (this.player.gold >= REROLL_COST) {
        this.player.gold -= REROLL_COST;
        this.reroll();
      } else {
        console.log("Not enough gold to reroll");
      }
    });

    this.input.on(
      Phaser.Input.Events.POINTER_DOWN,
      (event: Phaser.Input.Pointer) => {
        let i = this.getShopIndexForCoordinates({ x: event.downX, y: event.downY} );
        if (i != undefined) {
          if (this.pokemonForSale[i] == undefined) { console.log("No pokemon here"); return; }

          if (!this.buyPokemon(i)) { console.log("Not enough gold to buy this pokemon"); }
        }
      }
    );
  }

  update(): void {  }

  setCentre(centre: Coords): void {
    this.centre = centre;
  }

  /**
   * Draws the shop without the pokemon
   */
  drawBase(): void {
    let width = (CELL_WIDTH * CELL_COUNT) + 100;
    let height = CELL_WIDTH + 100;
    this.add.rectangle(this.centre.x, this.centre.y, width, height, 0x2F4858);

    this.add.grid(
      this.centre.x,           // center x
      this.centre.y - POKEMON_OFFSET,      // center y
      CELL_WIDTH * CELL_COUNT, // total width
      CELL_WIDTH,              // total height
      CELL_WIDTH,              // cell width
      CELL_WIDTH,              // cell height
      0,                       // fill: none
      0,                       // fill alpha: transparent
      0xffaa00,                // lines: yellow
      1                        // line alpha: solid
    );
  }

  /**
   * Refreshes the shop with new pokemon.
   */
  reroll(): void {
    // Remove the old pokemon
    for (let i in this.pokemonForSale) {
      this.pokemonForSale[i].destroy();
      this.goldTexts[i].destroy();
      delete this.pokemonForSale[i];
      delete this.goldTexts[i];
    }

    // For now, just populate with random pokemon
    for (let i = 0; i < CELL_COUNT; ++i) {
      let currCoords = this.getCoordinatesForShopIndex(i);
      this.pokemonForSale[i] = new PokemonObject({
        scene: this,
        x: currCoords.x,
        y: currCoords.y,
        name: allPokemonNames[Math.floor(Math.random() * allPokemonNames.length)],
        side: 'player',
      });
      this.pokemonForSale[i].setHPBarVisible(false);

      this.add.existing(this.pokemonForSale[i]);
      this.goldTexts[i] = this.add.text(currCoords.x, currCoords.y + 50, this.pokemonForSale[i].basePokemon.tier.toString()).setOrigin(0.5);
    }
  }

  buyPokemon(index: number): boolean {
    let price = this.pokemonForSale[index].basePokemon.tier
    if (this.player.gold < price) {
      return false;
    }

    let gameScene = this.scene.get(GameScene.KEY) as GameScene;
    if (!gameScene.canAddPokemonToSideboard()) {
      return false;
    }

    gameScene.addPokemonToSideboard(this.pokemonForSale[index].name);
    this.pokemonForSale[index].destroy();
    delete this.pokemonForSale[index];
    this.player.gold -= price;
    this.goldTexts[index].destroy();
    delete this.goldTexts[index];
    
    return true;
  }

  /**
   * Returns the graphical x and y coordinates for a spot in the sideboard.
   */
  getCoordinatesForShopIndex(i: number): Coords {
    return {
      x: this.centre.x + CELL_WIDTH * (i - (CELL_COUNT - 1) / 2),
      y: this.centre.y - POKEMON_OFFSET
    }
  }

  /**
   * Returns the sideboard index for a graphical coordinate,
   * or `undefined` if the point isn't within the sideboard
   */
  getShopIndexForCoordinates({
    x,
    y,
  }: Coords): number | undefined {
    // 35 = CELL_WIDTH / 2
    // ie. the distance to the top of the sideboard
    if (y < this.centre.y - POKEMON_OFFSET - 35 || y > this.centre.y - POKEMON_OFFSET + 35) {
      return undefined;
    }

    // (this.centre.x - CELL_WIDTH * CELL_COUNT / 2)
    // is the distance from start of grid to the left edge of the sideboard
    const index = (x - (this.centre.x - CELL_WIDTH * CELL_COUNT / 2)) / CELL_WIDTH;
    if (index < 0 || index >= CELL_COUNT) {
      return undefined;
    }
    return Math.floor(index);
  }
}