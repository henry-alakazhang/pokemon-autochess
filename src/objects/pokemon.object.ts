import { Scene } from 'phaser';
import { PokemonData, PokemonName } from '../core/pokemon.data';
import { FloatingText } from './floating-text.object';

interface SpriteParams {
  readonly scene: Scene;
  readonly x: number;
  readonly y: number;
  readonly key: string;
  readonly frame?: string | number;
}

export type PokemonAnimationType = 'left' | 'right' | 'up' | 'down';

export class Pokemon extends Phaser.GameObjects.Sprite {
  private sprite: Phaser.GameObjects.Sprite;
  private hpBar: Phaser.GameObjects.Graphics;

  private currentHP: number;
  private maxHP: number;

  constructor(params: SpriteParams, private key: PokemonName) {
    super(params.scene, params.x, params.y, params.key, params.frame);

    // load data from Pokemon data
    this.currentHP = this.maxHP = PokemonData[key].maxHP;

    this.sprite = this.scene.add.sprite(this.x, this.y, key);
    // default state is facing the player
    this.playAnimation('down');

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

    const hpBarColor =
      this.currentHP >= this.maxHP / 2
        ? // high HP: green
          0x32cd32
        : this.currentHP >= this.maxHP / 5
        ? // low HP: orange
          0xffa500
        : // critical: red
          0xdc143c;
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

  playAnimation(type: PokemonAnimationType) {
    this.sprite.play(`${this.key}--${type}`);
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
