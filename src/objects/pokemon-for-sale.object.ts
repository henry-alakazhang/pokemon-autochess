import { pokemonData, PokemonName } from '../core/pokemon.model';
import { flatten } from '../helpers';
import { Coords } from '../scenes/game/combat/combat.helpers';
import { Player } from './player.object';
import { titleStyle } from './text.helpers';

/**
 * The pokemon object in the shop, including gold cost and any other elements
 */
export class PokemonForSaleObject extends Phaser.GameObjects.GameObject {
  public cost: number;

  private pokemonSprite: Phaser.GameObjects.Sprite;
  private costText: Phaser.GameObjects.Text;
  private costIcon: Phaser.GameObjects.Image;
  private typeSprites: Phaser.GameObjects.Sprite[];
  private sheen: Phaser.GameObjects.Graphics;

  constructor(
    public scene: Phaser.Scene,
    public centre: Coords,
    public pokemonName: PokemonName,
    private player: Player
  ) {
    super(scene, 'PokemonForSale');

    if (pokemonData[pokemonName].stage === 1) {
      this.cost = pokemonData[pokemonName].tier;
    } else {
      console.error('Tried to add evolved Pokemon to shop!');
      // let's not break
      this.cost = 99;
    }

    this.drawPokemon();
    this.drawCost();

    // if player has any of a given pokemon, add a highlight to the shop item
    if (
      [...flatten(player.mainboard), ...player.sideboard].some(
        (p) => p?.basePokemon.base === pokemonName
      )
    ) {
      this.sheen = scene.add.graphics({ x: this.centre.x, y: this.centre.y });
      this.sheen.fillGradientStyle(
        0xffffff,
        0xffffff,
        0xffffff,
        0xffffff,
        255,
        230,
        255,
        230
      );
      this.sheen.fillRect(-70, -45, 140, 90);
    }
  }

  drawPokemon(): void {
    this.pokemonSprite = this.scene.add.sprite(
      this.centre.x + 40,
      this.centre.y,
      this.pokemonName
    );
    this.pokemonSprite.play(`${this.pokemonName}--down`);

    this.typeSprites = pokemonData[this.pokemonName].categories.map(
      (category, index) =>
        this.scene.add
          .sprite(
            this.centre.x - 30,
            this.centre.y + (index * 2 - 3) * 8,
            category
          )
          .setDisplaySize(75, 16)
    );
  }

  drawCost(): void {
    this.costText = this.scene.add
      .text(
        this.centre.x - 38,
        this.centre.y + 28,
        this.cost.toString(),
        titleStyle
      )
      .setFontSize(20)
      .setOrigin(0);
    this.costIcon = this.scene.add
      .image(this.centre.x - 22, this.centre.y + 30, `pokeball-${this.cost}`)
      .setOrigin(0);
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
      this.costText.destroy();
      this.costIcon.destroy();
      this.sheen?.destroy();
      this.typeSprites.forEach((sprite) => sprite.destroy());
    }
  }
}
