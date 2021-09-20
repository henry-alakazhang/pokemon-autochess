import { pokemonData, PokemonName } from '../core/pokemon.model';
import { Coords } from '../scenes/game/combat/combat.helpers';
import { titleStyle } from './text.helpers';

/**
 * The pokemon object in the shop, including gold cost and any other elements
 */
export class PokemonForSaleObject extends Phaser.GameObjects.GameObject {
  public pokemonName: PokemonName;
  public cost: number;

  public centre: Coords;

  private pokemonSprite: Phaser.GameObjects.Sprite;
  private goldCostText: Phaser.GameObjects.Text;
  private typeSprites: Phaser.GameObjects.Sprite[];

  constructor(
    public scene: Phaser.Scene,
    coordinates: Coords,
    name: PokemonName
  ) {
    super(scene, 'PokemonForSale');

    if (pokemonData[name].stage === 1) {
      this.cost = pokemonData[name].tier;
    } else {
      console.error('Tried to add evolved Pokemon to shop!');
      // let's not break
      this.cost = 99;
    }

    this.pokemonName = name;

    this.centre = coordinates;

    this.drawPokemon();
    this.drawGoldCostText();
  }

  drawPokemon(): void {
    this.pokemonSprite = this.scene.add.sprite(
      this.centre.x + 40,
      this.centre.y,
      this.pokemonName
    );
    this.pokemonSprite.play(`${this.pokemonName}--down`);

    this.typeSprites = pokemonData[
      this.pokemonName
    ].categories.map((category, index) =>
      this.scene.add
        .sprite(
          this.centre.x - 30,
          this.centre.y + (index * 2 - 3) * 8,
          category
        )
        .setDisplaySize(75, 16)
    );
  }

  drawGoldCostText(): void {
    this.goldCostText = this.scene.add
      .text(
        this.centre.x - 25,
        this.centre.y + 25,
        this.cost.toString(),
        titleStyle
      )
      .setFontSize(20)
      .setOrigin(0.5);
  }

  destroy(): void {
    // Only destroy if not part of the scene being destroyed.
    // Otherwise Phaser can throw errors trying to destroy the same thing twice.
    // https://github.com/photonstorm/phaser/issues/5520
    if (
      this.scene &&
      this.scene.scene.settings.status !== Phaser.Scenes.SHUTDOWN
    ) {
      this.pokemonSprite.destroy();
      this.goldCostText.destroy();
      this.typeSprites.forEach(sprite => sprite.destroy());
    }
  }
}
