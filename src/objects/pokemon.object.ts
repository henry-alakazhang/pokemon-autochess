import * as Phaser from 'phaser';
import { Pokemon, pokemonData, PokemonName } from '../core/pokemon.model';
import { id } from '../helpers';
import { Coords, getTurnDelay } from '../scenes/game/combat/combat.helpers';
import { FloatingText } from './floating-text.object';

interface SpriteParams {
  readonly scene: Phaser.Scene;
  readonly x: number;
  readonly y: number;
  readonly name: PokemonName;
  readonly frame?: string | number;
  readonly side: 'player' | 'enemy';
}

export type PokemonAnimationType = 'left' | 'right' | 'up' | 'down';

export class PokemonObject extends Phaser.Physics.Arcade.Sprite {
  public static readonly Events = {
    Dead: 'dead',
  } as const;

  /**
   * A hacky little way of adding an outline to a Pokemon.
   * Draws a second, slightly larger sprite which serves as the outline.
   */
  private outlineSprite: Phaser.GameObjects.Sprite;
  private isOutlined = false;

  private hpBar: Phaser.GameObjects.Graphics;
  private currentHP: number;
  private maxHP: number;

  public id: string;
  public name: PokemonName;
  public side: 'player' | 'enemy';
  public basePokemon: Pokemon;

  // TODO: clean up messiness in model
  constructor(params: SpriteParams) {
    super(params.scene, params.x, params.y, params.name, params.frame);

    // generate a random ID
    this.id = id();
    this.name = params.name;

    // load data from Pokemon data
    this.maxHP = pokemonData[this.name].maxHP;
    this.currentHP = this.maxHP;
    this.basePokemon = pokemonData[this.name];
    this.side = params.side;

    this.outlineSprite = this.scene.add
      .sprite(this.x, this.y, this.name, params.frame)
      .setOrigin(0.5, 0.5)
      .setDisplaySize(this.width + 8, this.height + 8)
      .setTintFill(0xffffff)
      .setVisible(false);

    // default state is facing the player
    this.playAnimation('down');

    this.hpBar = this.scene.add.graphics({
      x: this.x,
      y: this.y,
    });
    this.redrawHPBar();
  }

  initPhysics() {
    // set circle to be small % of the body
    this.body.setCircle(this.height / 4);
  }

  setPosition(x: number, y: number) {
    super.setPosition(x, y);
    if (this.outlineSprite) {
      this.outlineSprite.setPosition(x, y);
    }
    if (this.hpBar) {
      this.hpBar.setPosition(x, y);
    }
    return this;
  }

  setVisible(visible: boolean) {
    this.hpBar.setVisible(visible);
    this.outlineSprite.setVisible(visible && this.isOutlined);
    return super.setVisible(visible);
  }

  setHPBarVisible(visible: boolean) {
    this.hpBar.setVisible(visible);
  }

  destroy() {
    this.hpBar.destroy();
    super.destroy();
  }

  redrawHPBar() {
    this.hpBar.clear();

    const hpBarColor =
      this.side === 'player' // player: green
        ? 0x32cd32 // enemy: red
        : 0xdc143c;
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

  public playAnimation(type: PokemonAnimationType) {
    this.play(`${this.name}--${type}`);
    this.outlineSprite.play(`${this.name}--${type}`);
  }

  public move({ x, y }: Coords) {
    this.scene.add.tween({
      targets: [this, this.hpBar],
      duration: getTurnDelay(this.basePokemon) * 0.75,
      x,
      y,
      ease: 'Quad',
      onComplete: () => {
        this.setPosition(x, y);
      },
    });
  }

  public dealDamage(amount: number) {
    if (amount < 0 || this.currentHP <= 0) {
      return;
    }
    const actualDamage = Math.min(this.currentHP, amount);
    this.currentHP -= actualDamage;
    this.redrawHPBar();

    // display damage text
    this.scene.add.existing(
      new FloatingText(this.scene, this.x, this.y, `${amount}`)
    );
    // play flash effect
    this.scene.add.tween({
      targets: this,
      duration: 66,
      alpha: 0.9,
      onStart: () => this.setTint(0xdddddd), // slight darken
      onComplete: () => this.clearTint(),
    });

    // TODO: move this somewhere more appropriate?
    if (this.currentHP === 0) {
      this.emit(PokemonObject.Events.Dead);
      // add fade-out animation
      this.scene.add.tween({
        targets: this,
        duration: 600,
        ease: 'Exponential.Out',
        alpha: 0,
        onComplete: () => {
          this.destroy();
        },
        callbackScope: this,
      });
    }
  }

  public toggleOutline(): this {
    this.isOutlined = !this.isOutlined;
    this.outlineSprite.setVisible(this.isOutlined);
    return this;
  }
}
