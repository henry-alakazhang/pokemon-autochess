import { Status } from '../core/game.model';
import { Pokemon, pokemonData, PokemonName } from '../core/pokemon.model';
import { generateId, getBaseTexture } from '../helpers';
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
    Damage: 'damage',
  } as const;

  /**
   * A hacky little way of adding an outline to a Pokemon.
   * Draws a second, slightly larger sprite which serves as the outline.
   */
  outlineSprite: Phaser.GameObjects.Sprite;
  isOutlined = false;

  name: PokemonName;
  basePokemon: Pokemon;

  /** HP and PP bars above the Pokemon */
  bars: Phaser.GameObjects.Graphics;
  blindIcon: Phaser.GameObjects.Image;
  sleepIcon: Phaser.GameObjects.Sprite;
  currentHP: number;
  maxHP: number;
  currentPP: number;
  maxPP?: number;
  evasion = 0;
  critRate = 0;
  critDamage = 1;

  /* some combat specific stuff */
  id: string;
  side: 'player' | 'enemy';
  consecutiveAttacks = 0;
  currentTarget?: PokemonObject;

  status: {
    [k in Status]?: {
      value?: number;
      duration: number;
    };
  } = {};

  attachments: Phaser.GameObjects.GameObject[] = [];

  // TODO: clean up messiness in model
  constructor(params: SpriteParams) {
    super(
      params.scene,
      params.x,
      params.y,
      getBaseTexture(params.name),
      params.frame
    );

    // generate a random ID
    this.id = generateId();
    this.name = params.name;
    this.basePokemon = pokemonData[params.name];

    // load data from Pokemon data
    this.maxHP = this.basePokemon.maxHP;
    this.currentHP = this.maxHP;
    this.maxPP = this.basePokemon.maxPP;
    this.currentPP = 0;
    this.side = params.side;

    this.outlineSprite = this.scene.add
      .sprite(this.x, this.y, this.texture.key, params.frame)
      .setOrigin(0.5, 0.5)
      .setDisplaySize(this.width + 8, this.height + 8)
      .setTintFill(0xffffff)
      .setVisible(false);
    this.blindIcon = this.scene.add
      .image(this.x, this.y - 20, 'blind')
      .setDepth(2)
      .setVisible(false);
    this.attach(this.blindIcon);
    this.sleepIcon = this.scene.add
      .sprite(this.x + 10, this.y - 20, 'sleep')
      .setScale(0.5, 0.5)
      .setDepth(2)
      .play('sleep')
      .setVisible(false);
    this.attach(this.sleepIcon);

    // default state is facing the player
    this.playAnimation('down');

    this.bars = this.scene.add
      .graphics({
        x: this.x,
        y: this.y,
      })
      .setDepth(1);
    this.redrawBars();
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
    if (this.bars) {
      this.bars.setPosition(x, y);
    }
    return this;
  }

  setVisible(visible: boolean) {
    this.bars.setVisible(visible);
    this.outlineSprite.setVisible(visible && this.isOutlined);
    return super.setVisible(visible);
  }

  /** Attaches a GameObject so it moves with the PokemonObject */
  attach(object: Phaser.GameObjects.GameObject) {
    this.attachments.push(object);
  }

  /** Detaches an attached GameObject */
  detach(object: Phaser.GameObjects.GameObject) {
    this.attachments = this.attachments.filter(item => item === object);
  }

  destroy() {
    this.outlineSprite.destroy();
    this.bars.destroy();
    super.destroy();
  }

  redrawBars() {
    this.bars.clear();

    // The stat bars section is 10px tall
    // 1px of top border
    // 5px of hp bar
    // 1px of inner border
    // 2px of pp bar
    // 1 px of bottom border

    // bar background
    const backgroundColor = this.status.paralyse ? 0x666600 : 0x000000;
    this.bars.fillStyle(backgroundColor, 1);
    this.bars.fillRect(-this.width / 2, -this.height / 2, this.width, 10);

    // hp bar
    const hpBarColor =
      this.side === 'player'
        ? 0x32cd32 // player: green
        : 0xdc143c; // enemy: red
    this.bars.fillStyle(hpBarColor, 1);
    this.bars.fillRect(
      -this.width / 2 + 1,
      -this.height / 2 + 1,
      this.width * (this.currentHP / this.maxHP) - 2,
      5
    );
    // add little pips in the HP bar every 333 HP
    this.bars.lineStyle(1, 0x000000, 1);
    const width = Math.round((333 / this.maxHP) * (this.width - 2));
    for (let x = width; x < this.width - 2; x += width) {
      // full height bars for 1000 increments
      const y = (x / width) % 3 === 0 ? 6 : 4;
      this.bars.strokeLineShape(
        new Phaser.Geom.Line(
          -this.width / 2 + x,
          -this.height / 2,
          -this.width / 2 + x,
          -this.height / 2 + y
        )
      );
    }

    // pp bar
    this.bars.fillStyle(0x67aacb, 1); // sky blue
    this.bars.fillRect(
      -this.width / 2 + 1,
      -this.height / 2 + 7, // offset by 6 to put below the HP bar
      this.maxPP
        ? Math.max(0, this.width * (this.currentPP / this.maxPP) - 2) // use current PP if available
        : 0, // empty if no PP
      2
    );

    this.blindIcon.setVisible(!!this.status.blind);
    this.sleepIcon.setVisible(!!this.status.sleep);
  }

  public playAnimation(type: PokemonAnimationType) {
    this.play(`${this.texture.key}--${type}`);
    this.outlineSprite.play(`${this.texture.key}--${type}`);
  }

  public move({ x, y }: Coords, onComplete?: Function) {
    this.scene.add.tween({
      targets: [this, this.bars, ...this.attachments],
      duration: getTurnDelay(this.basePokemon) * 0.75,
      // add delta so the bars / attachments / etc move properly too
      x: `+=${x - this.x}`,
      y: `+=${y - this.y}`,
      ease: 'Quad',
      onComplete: () => {
        this.setPosition(x, y);
        if (onComplete) {
          onComplete();
        }
      },
    });
  }

  /**
   * Cause this pokemon to heal health
   */
  public heal(amount: number) {
    if (amount < 0 || this.currentHP <= 0) {
      return;
    }

    this.currentHP = Math.min(this.maxHP, this.currentHP + amount);
    this.redrawBars();
  }

  /**
   * Cause this pokemon to deal damage
   * Triggers effects that happen on attack, such as mana generation
   */
  public dealDamage(amount: number) {
    // damage / 10, capped at 2
    this.addPP(Math.min(2, Math.round(amount / 10)));
    this.redrawBars();
  }

  /**
   * Cause this pokemon to take damage
   */
  public takeDamage(
    amount: number,
    {
      triggerEvents = true,
      crit = false,
    }: { triggerEvents?: boolean; crit?: boolean } = {}
  ) {
    if (amount < 0 || this.currentHP <= 0) {
      return;
    }

    // trigger on-hit events like mana
    if (triggerEvents) {
      this.emit(PokemonObject.Events.Damage);
      this.addPP(Math.min(2, Math.round(amount / 10)));
    }

    const actualDamage = Math.min(this.currentHP, amount);
    this.currentHP -= actualDamage;
    this.redrawBars();

    // display damage text
    this.scene.add.existing(
      new FloatingText(
        this.scene,
        this.x,
        this.y,
        `${amount}${crit ? '!' : ''}`,
        crit ? 'large' : 'small'
      )
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
      // destroy UI elements first
      this.bars.destroy();
      this.blindIcon.destroy();
      this.sleepIcon.destroy();
      // TODO: destroy attachments?
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

  public addPP(amount: number): this {
    // move is active - can't gain PP
    if (this.status.moveIsActive) {
      return this;
    }

    if (this.maxPP && this.currentPP < this.maxPP) {
      this.currentPP = Math.min(this.maxPP, this.currentPP + amount);
    }
    return this;
  }

  public toggleOutline(): this {
    this.isOutlined = !this.isOutlined;
    this.outlineSprite.setVisible(this.isOutlined);
    return this;
  }

  /**
   * Adjust any of a Pokemon's stats by a provided %
   */
  public changeStats({
    attack = 1,
    defense = 1,
    specAttack = 1,
    specDefense = 1,
    speed = 1,
  }: {
    attack?: number;
    defense?: number;
    specAttack?: number;
    specDefense?: number;
    speed?: number;
  }) {
    // this is a bit hacky, but we just override the base Pokemon with a new object.
    // TODO (if needed?) implement some proper stat-stage tracking thing
    this.basePokemon = {
      ...this.basePokemon,
      attack: this.basePokemon.attack * attack,
      defense: this.basePokemon.defense * defense,
      specAttack: this.basePokemon.specAttack * specAttack,
      specDefense: this.basePokemon.specDefense * specDefense,
      speed: this.basePokemon.speed * speed,
    };
  }

  public addStatus(status: Status, duration: number, value?: number): this {
    if (this.status.statusImmunity) {
      return this;
    }
    this.status[status] = {
      value,
      duration,
    };
    this.redrawBars();
    return this;
  }

  public updateStatuses(timeElapsed: number) {
    // reduce the duration of each status
    (Object.keys(this.status) as Status[]).forEach((s: Status) => {
      const statusValue = this.status[s];
      if (statusValue) {
        statusValue.duration -= timeElapsed;
        if (statusValue.duration <= 0) {
          this.status[s] = undefined;
        }
      }
    });
    this.redrawBars();
  }
}
