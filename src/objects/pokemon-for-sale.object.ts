import * as Phaser from 'phaser';
import { pokemonData, PokemonName } from '../core/pokemon.model';
import { Coords } from '../scenes/game/combat/combat.helpers';

/**
 * The pokemon object in the shop, including gold cost and any other elements
 */
export class PokemonForSaleObject {
  public pokemonName: PokemonName;
  public cost: number;

  public scene: Phaser.Scene;
  public centre: Coords;

  private pokemonSprite: Phaser.GameObjects.Sprite;
  private goldCostText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, coordinates: Coords, name: PokemonName) {
    if (pokemonData[name].stage === 1) {
      this.cost = pokemonData[name].tier;
    } else {
      console.error('Tried to add evolved Pokemon to shop!');
      // let's not break
      this.cost = 99;
    }

    this.pokemonName = name;

    this.scene = scene;
    this.centre = coordinates;

    this.drawPokemon();
    this.drawGoldCostText();
  }

  drawPokemon(): void {
    this.pokemonSprite = this.scene.add.sprite(
      this.centre.x,
      this.centre.y,
      this.pokemonName
    );
    this.pokemonSprite.play(`${this.pokemonName}--down`);
  }

  drawGoldCostText(): void {
    this.goldCostText = this.scene.add
      .text(this.centre.x, this.centre.y + 50, this.cost.toString())
      .setOrigin(0.5);
  }

  destroy(): void {
    this.pokemonSprite.destroy();
    this.goldCostText.destroy();
  }
}
