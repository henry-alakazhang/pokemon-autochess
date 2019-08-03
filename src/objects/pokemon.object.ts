import * as Phaser from "phaser";
import { Pokemon, pokemonData, PokemonName } from "../core/pokemon.model";
import { FloatingText } from "./floating-text.object";

interface SpriteParams {
  readonly scene: Phaser.Scene;
  readonly x: number;
  readonly y: number;
  readonly id: string;
  readonly name: PokemonName;
  readonly frame?: string | number;
  readonly side: "player" | "enemy";
}

export type PokemonAnimationType = "left" | "right" | "up" | "down";

export class PokemonObject extends Phaser.GameObjects.Sprite {
  private sprite: Phaser.GameObjects.Sprite;

  private hpBar: Phaser.GameObjects.Graphics;

  private currentHP: number;

  private maxHP: number;

  public id: string;

  public name: PokemonName;

  public side: "player" | "enemy";

  public basePokemon: Pokemon;

  // TODO: clean up messiness in model
  constructor(params: SpriteParams) {
    super(params.scene, params.x, params.y, params.name, params.frame);

    this.id = params.id;
    this.name = params.name;

    // load data from Pokemon data
    this.maxHP = pokemonData[this.name].maxHP;
    this.currentHP = this.maxHP;
    this.basePokemon = pokemonData[this.name];
    this.side = params.side;

    this.sprite = this.scene.add.sprite(this.x, this.y, this.name);
    // default state is facing the player
    this.playAnimation("down");

    this.hpBar = this.scene.add.graphics();
    this.redrawHPBar();
  }

  destroy() {
    this.sprite.destroy();
    this.hpBar.destroy();
    super.destroy();
  }

  redrawHPBar() {
    this.hpBar.x = this.x;
    this.hpBar.y = this.y;
    this.hpBar.clear();

    const hpBarColor = this.getHPBarColor();
    this.hpBar.fillStyle(hpBarColor, 1);
    this.hpBar.fillRect(
      -this.width / 2,
      -this.height / 2,
      this.width * (this.currentHP / this.maxHP),
      8
    );
    this.hpBar.lineStyle(1, 0x000000);
    this.hpBar.strokeRect(-this.width / 2, -this.height / 2, this.width, 8);
    this.hpBar.setDepth(1);
  }

  getHPBarColor() {
    const fiftyPercentHP = this.maxHP / 2;
    const twentyPercentHP = this.maxHP / 5;

    // 50% or Higher
    if (this.currentHP >= fiftyPercentHP) {
      // High HP: Green
      return 0x32cd32;
    }

    // Between 20% and 50%
    if (this.currentHP >= twentyPercentHP) {
      // Low HP: Orange
      return 0xffa500;
    }

    // Between 0% and 20%
    // Critical: Red
    return 0xdc143c;
  }

  playAnimation(type: PokemonAnimationType) {
    this.sprite.play(`${this.name}--${type}`);
  }

  public dealDamage(amount: number) {
    if (amount < 0 || this.currentHP <= 0) {
      return;
    }
    const actualDamage = Math.min(this.currentHP, amount);
    this.currentHP -= actualDamage;
    this.redrawHPBar();

    // display damage text
    const floatingText = new FloatingText(
      this.scene,
      this.x,
      this.y,
      `${actualDamage}`
    );

    // TODO: move this somewhere more appropriate?
    if (this.currentHP === 0) {
      floatingText.on(
        Phaser.GameObjects.Events.DESTROY,
        () => {
          this.destroy();
        },
        this
      );
    }
  }
}
