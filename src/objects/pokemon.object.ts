import { Effect } from '../core/game.model';
import { Pokemon, pokemonData, PokemonName } from '../core/pokemon.model';
import { NEGATIVE_STATUS, Status, StatusEffect } from '../core/status.model';
import { generateId, getBaseTexture } from '../helpers';
import { boundRange } from '../math.helpers';
import { Coords, getTurnDelay } from '../scenes/game/combat/combat.helpers';
import { FloatingText } from './floating-text.object';
import { PokemonCard } from './pokemon-card.object';

interface SpriteParams {
  readonly scene: Phaser.Scene;
  readonly x: number;
  readonly y: number;
  readonly name: PokemonName;
  readonly frame?: string | number;
  readonly side: 'player' | 'enemy';
}

/**
 * Stat changes, calculated as stages like Pokemon
 * Each stage is worth 25% more/less
 *
 * ```
 * 8 = 12/4 (300%)
 * 4 = 8/4 (200%)
 * 2 = 6/4 (150%)
 * 0 = 4/4 (100%)
 * -2 = 4/6 (66%)
 * -4 = 4/8 (50%)
 * -8 = 4/12 (33%)
 * ```
 */
type StatChange =
  | -8
  | -7
  | -6
  | -5
  | -4
  | -3
  | -2
  | -1
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8;
type ModifiableStat =
  | 'attack'
  | 'defense'
  | 'specAttack'
  | 'specDefense'
  | 'speed';

export type PokemonAnimationType = 'left' | 'right' | 'up' | 'down';

/**
 * Effects that can be applied to individual Pokemon.
 * Requires extra fields for referencing self.
 */
export type PokemonEffect = Effect<{ self: PokemonObject; selfCoords: Coords }>;
/**
 * Effects with required params to trigger effects on Pokemon
 */
type EffectParams = Effect<{ selfCoords: Coords }>;

export class PokemonObject extends Phaser.Physics.Arcade.Sprite {
  public static readonly Events = {
    Dead: 'dead',
  } as const;

  /**
   * A hacky little way of adding an outline to a Pokemon.
   * Draws a second, slightly larger sprite which serves as the outline.
   */
  outlineSprite: Phaser.GameObjects.Sprite;
  isOutlined = false;

  name: PokemonName;
  /**
   * The Pokemon that "owns" this one.
   * Used for referencing a Pokemon that summoned another
   */
  owner?: PokemonObject;
  /**
   * The "base" Pokemon for an object.
   * Used for external access to combat stats, move, and other things.
   */
  basePokemon: Pokemon;
  /**
   * The original basePokemon object, reffed straight from the Pokemon data.
   * Used alongside stat changes to calculate the actual basePokemon stats.
   */
  private rawBasePokemon: Pokemon;

  /** HP and PP bars above the Pokemon */
  bars: Phaser.GameObjects.Graphics;
  colorMatrix: Phaser.Display.ColorMatrix;
  blindIcon: Phaser.GameObjects.Image;
  sleepIcon: Phaser.GameObjects.Sprite;
  pokemonTooltip: Phaser.GameObjects.DOMElement;
  longPress: boolean;

  currentHP: number;
  maxHP: number;
  currentPP: number;
  private baseMaxPP: number;
  get maxPP(): number {
    return this.status.ppReduction
      ? Math.floor(this.baseMaxPP * 1.4)
      : this.baseMaxPP;
  }
  shieldHP: number = 0;

  evasion = 0;
  critRate = 0;
  critDamage = 1.5;

  /* some combat specific stuff */
  id: string;
  side: 'player' | 'enemy';
  // todo: remove and just use moveState for everything
  // alternative todo: use DataManager to store this
  // tradeoff for that is less type safety.
  consecutiveAttacks = 0;
  moveState: string | number;
  currentTarget?: PokemonObject;

  /** Basic (negative) status effects */
  status: {
    [k in Status]?: {
      value?: number;
      duration: number;
    };
  } = {};

  /**
   * More complex effects applied similarly to statuses
   *
   * TODO: Migrate non-special statuses to this form.
   */
  effects: {
    [k: string]: {
      effect: StatusEffect;
      duration: number;
      stacks: number;
    };
  } = {};

  /**
   * Stat changes, calculated as stages like Pokemon (see: StatChanges type def)
   * Note: these are stored as numbers because they can go above/below the cap
   * but they are bounded when used to calculate stats.
   */
  statChanges: { [k in ModifiableStat]: number } = {
    attack: 0,
    defense: 0,
    specAttack: 0,
    specDefense: 0,
    speed: 0,
  };
  /**
   * Stat changes, calcualted as flat additions before stage multiplication
   */
  flatStatChanges: { [k in ModifiableStat]: number } = {
    attack: 0,
    defense: 0,
    specAttack: 0,
    specDefense: 0,
    speed: 0,
  };

  /**
   * State stored for synergies. Each synergy stores whatever it needs to track.
   * TODO: use DataManager for this? Tradeoff is less type safety and less documentation
   */
  synergyState: {
    /** Number of Speed stacks */
    sweeper: number;
    /** Number of Attack stacks */
    revengeKiller: number;
    /** Total stage value of Mech */
    pivot: number;
    /** Number of buffed attacks */
    fighting: number;
  } = { sweeper: 0, revengeKiller: 0, pivot: 0, fighting: 0 };

  attachments: Phaser.GameObjects.Components.Visible[] = [];

  /** Active things the Pokemon is doing that can be cancelled by CC or death */
  cancellableEvents: {
    timer: Phaser.Time.TimerEvent;
    onCancel?: () => void;
  }[] = [];

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
    this.rawBasePokemon = pokemonData[params.name];
    this.basePokemon = this.rawBasePokemon;

    // load data from Pokemon data
    this.maxHP = this.basePokemon.maxHP;
    this.currentHP = this.maxHP;
    if (this.basePokemon.move?.type === 'active') {
      this.baseMaxPP = this.basePokemon.move.cost;
      this.currentPP = this.basePokemon.move.startingPP;
    } else {
      this.baseMaxPP = 0;
      this.currentPP = 0;
    }

    this.side = params.side;

    this.outlineSprite = this.scene.add
      .sprite(this.x, this.y, this.texture.key, params.frame)
      .setOrigin(0.5, 0.5)
      .setDisplaySize(this.width + 8, this.height + 8)
      .setTintFill(0xffffff)
      .setVisible(false);
    this.attach(this.outlineSprite);
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
    this.colorMatrix = this.postFX.addColorMatrix();
    // FIXME: Should probably just create one and reuse it between Pokemon
    this.pokemonTooltip = this.scene.add
      .existing(new PokemonCard(this.scene, this.x, this.y, this.basePokemon))
      .setVisible(false);
    this.attach(this.pokemonTooltip);

    // default state is facing the player
    this.playAnimation('down');

    this.bars = this.scene.add
      .graphics({
        x: this.x,
        y: this.y,
      })
      .setDepth(1);
    this.redrawBars();
    // larger sprites need to be shifted slightly
    if (this.displayHeight === 128) {
      this.setOrigin(0.5, 0.75);
    }

    this.setInteractive()
      .on(Phaser.Input.Events.POINTER_DOWN, (event: Phaser.Input.Pointer) => {
        if (event.rightButtonDown()) {
          this.pokemonTooltip.setPosition(event.x, event.y);
          this.pokemonTooltip.setVisible(true);
        } else {
          // Hacky mobile support to make handle right-click via longpress instead.
          this.longPress = true;
          this.scene.time.addEvent({
            delay: 500,
            callback: () => {
              if (this.longPress) {
                this.longPress = false;
                this.pokemonTooltip.setPosition(event.x, event.y);
                this.pokemonTooltip.setVisible(true);
              }
            },
          });
        }
      })
      .on(Phaser.Input.Events.POINTER_UP, () => {
        this.longPress = false;
      })
      .on(Phaser.Input.Events.DRAG_START, () => {
        this.longPress = false;
      });
    this.scene.input.on(
      Phaser.Input.Events.POINTER_DOWN,
      (event: Phaser.Input.Pointer) => {
        // hide if clicked outside...
        // bruh there has to be a better way of handling this
        if (
          event.leftButtonDown() ||
          Math.abs(event.x - this.x) > 35 ||
          Math.abs(event.y - this.y) > 35
        ) {
          this.pokemonTooltip.setVisible(false);
        }
      }
    );
  }

  initPhysics() {
    // set collision to be a small block in the center
    this.body?.setSize(this.width / 4, this.height / 4, true);
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

  /** Attaches a visible GameObject so it moves with the PokemonObject */
  attach(object: Phaser.GameObjects.Components.Visible) {
    this.attachments.push(object);
  }

  /** Detaches an attached GameObject */
  detach(object: Phaser.GameObjects.Components.Visible) {
    this.attachments = this.attachments.filter((item) => item === object);
  }

  addCancellableEvent(event: {
    timer: Phaser.Time.TimerEvent;
    onCancel?: () => void;
  }) {
    this.cancellableEvents.push(event);
  }

  destroy() {
    // Only destroy if not part of the scene being destroyed.
    // Otherwise Phaser can throw errors trying to destroy the same thing twice.
    // https://github.com/photonstorm/phaser/issues/5520
    if (
      this.scene &&
      this.scene.scene.settings.status !== Phaser.Scenes.SHUTDOWN
    ) {
      this.outlineSprite.destroy();
      this.pokemonTooltip.destroy();
      this.bars.destroy();
    }
    super.destroy();
  }

  redrawBars() {
    this.bars.clear();

    const left = -this.width / 2;
    const top = -this.height / 2;

    // The stat bars section is 10px tall
    // 1px of top border
    // 5px of hp bar
    // 1px of inner border
    // 2px of pp bar
    // 1 px of bottom border

    // Bar background: black
    this.bars.fillStyle(0x000000, 1);
    this.bars.fillRect(left, top, this.width, 10);

    // hp bar, inset by 1 pixel
    const hpBarColor =
      this.side === 'player'
        ? 0x32cd32 // player: green
        : 0xdc143c; // enemy: red
    this.bars.fillStyle(hpBarColor, 1);
    this.bars.fillRect(
      left + 1,
      top + 1,
      (this.width - 2) * (this.currentHP / this.maxHP),
      5
    );
    // and on top, a slightly transparent shield bar
    if (this.shieldHP > 0) {
      const shieldBarWidth = (this.width - 2) * (this.shieldHP / this.maxHP);
      this.bars.fillStyle(0xffffff, 0.75);
      this.bars.fillRect(left + 1, top + 1, shieldBarWidth, 5);
    }

    // add little pips in the HP bar every 250 HP
    this.bars.lineStyle(1, 0x000000, 1);
    const width = Math.round((250 / this.maxHP) * (this.width - 2));
    if (width <= 0) {
      // if we accidentally end up with a negative HP or a 0 width for each bar,
      // the for loop below is going to go infinite. throw instead
      throw new Error(
        `Cannot draw HP bars for Pokemon ${this.name}, expected width of bars is ${width}`
      );
    }
    for (let x = width; x < this.width - 2; x += width) {
      // full height bars for 1000 increments
      const y = (x / width) % 4 === 0 ? 6 : 4;
      this.bars.strokeLineShape(
        new Phaser.Geom.Line(left + x, top, left + x, top + y)
      );
    }

    // pp bar
    const ppBarColor = this.status.ppReduction
      ? 0x666666 // pp reduced: gray
      : 0x67aacb; // normal: sky blue
    this.bars.fillStyle(ppBarColor, 1);
    this.bars.fillRect(
      left + 1,
      top + 7, // offset by 6 to put below the HP bar
      this.maxPP
        ? Math.max(0, this.width * (this.currentPP / this.maxPP) - 2) // use current PP if available
        : 0, // empty if no PP
      2
    );

    this.blindIcon.setVisible(!!this.status.blind);
    this.sleepIcon.setVisible(!!this.status.sleep);

    // Display stun via grayscaling the unit.
    if (this.status.paralyse) {
      this.colorMatrix.grayscale(1);
    } else {
      this.colorMatrix.grayscale(0);
    }
  }

  /**
   * Rerenders the Pokemon info card.
   * Don't use this too much; it's probably not very performant.
   */
  redrawCard() {
    this.pokemonTooltip.destroy();
    this.pokemonTooltip = this.scene.add
      .existing(new PokemonCard(this.scene, this.x, this.y, this.basePokemon))
      .setVisible(false);
  }

  public playAnimation(type: PokemonAnimationType) {
    this.play(`${this.texture.key}--${type}`);
    this.outlineSprite.play(`${this.texture.key}--${type}`);
  }

  public move(
    { x, y }: Coords,
    {
      onComplete,
      duration,
      ease = 'Quad',
    }: { onComplete?: () => void; duration?: number; ease?: string } = {}
  ) {
    this.scene.add.tween({
      targets: [this, this.bars, ...this.attachments],
      duration: duration ?? getTurnDelay(this.basePokemon) * 0.75,
      // add delta so the bars / attachments / etc move properly too
      x: `+=${x - this.x}`,
      y: `+=${y - this.y}`,
      ease,
      onComplete: () => {
        this.setPosition(x, y);
        if (onComplete) {
          onComplete();
        }
      },
    });
  }

  /**
   * Applies a temp HP shield to this Pokemon.
   * Shields do not have an expiry or duration,
   * but they do not stack (refreshes if higher),
   * and cannot exceed Pokemon max HP.
   */
  public applyShield(amount: number) {
    this.shieldHP = boundRange(amount, this.shieldHP, this.maxHP);
    this.redrawBars();
  }

  /**
   * Cause this pokemon to heal health.
   * Returns actual healing done.
   */
  public heal(amount: number): number {
    if (amount < 0 || this.currentHP <= 0) {
      return 0;
    }

    const mult = 1 - (this.status.healReduction?.value ?? 0);

    const prevHP = this.currentHP;
    this.currentHP = Math.min(
      this.maxHP,
      Math.round(this.currentHP + amount * mult)
    );
    this.redrawBars();

    return this.currentHP - prevHP;
  }

  /**
   * Cause this pokemon to deal damage
   * Triggers effects that happen on attack, such as mana generation
   */
  public dealDamage(
    amount: number,
    { isAttack = false }: { isAttack?: boolean } = {}
  ) {
    if (isAttack) {
      // 5% of damage, capped at 2
      this.addPP(Math.min(2, amount * 0.05));
      this.redrawBars();
    }
  }

  /**
   * Cause this pokemon to take damage. Adjusts health and displays visual markers.
   */
  public takeDamage(
    amount: number,
    {
      crit = false,
      tint = 0xdddddd, // slight darken
    }: {
      crit?: boolean;
      /** Color change on hit. Defaults to slightly dark */ tint?: number;
    } = {}
  ) {
    if (amount < 0 || this.currentHP <= 0) {
      return;
    }

    // Deal damage to shield first (regardless of whether it exists)
    this.shieldHP = this.shieldHP - amount;
    if (this.shieldHP <= 0) {
      // Excess damage is dealt to HP
      this.currentHP = Math.max(0, this.currentHP + this.shieldHP);
      this.shieldHP = 0;
    }
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
      onStart: () => this.setTint(tint),
      onComplete: () => this.clearTint(),
    });

    // TODO: move this somewhere more appropriate?
    if (this.currentHP === 0) {
      // destroy UI elements first
      this.bars.destroy();
      this.blindIcon.destroy();
      this.sleepIcon.destroy();
      this.emit(PokemonObject.Events.Dead);
      // add fade-out animation
      this.scene.add.tween({
        targets: [this, this.attachments],
        duration: 600,
        ease: 'Exponential.Out',
        alpha: 0,
        onComplete: () => {
          // disable and hide
          // don't destroy because if any leftover events
          // try to manipulate the Pokemon or object,
          // they might crash the game
          this.setActive(false);
          this.setVisible(false);

          // hide all attachments
          this.attachments.forEach((object) => object.setVisible(false));
          // and all active timers
          this.cancellableEvents.forEach((event) => event.timer.remove());
          // and any tweens that are running on this
          this.scene.tweens.getTweensOf(this).forEach((tween) => tween.stop());
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

    if (this.currentPP < this.maxPP) {
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
  public changeStats(
    changes: {
      [k in ModifiableStat]?: StatChange;
    },
    duration?: number
  ) {
    // apply any changes that are provided
    (Object.entries(changes) as [ModifiableStat, StatChange][]).forEach(
      ([stat, change]) => {
        this.statChanges[stat] += change;
      }
    );

    this.recalculateStats();

    // if doesn't last forever, set the inverse after some time
    if (duration) {
      this.scene.time.addEvent({
        delay: duration,
        callback: () => {
          this.changeStats({
            attack: (changes.attack ? -changes.attack : 0) as StatChange,
            defense: (changes.defense ? -changes.defense : 0) as StatChange,
            specAttack: (changes.specAttack
              ? -changes.specAttack
              : 0) as StatChange,
            specDefense: (changes.specDefense
              ? -changes.specDefense
              : 0) as StatChange,
            speed: (changes.speed ? -changes.speed : 0) as StatChange,
          });
        },
      });
    }
  }

  /**
   * Adjust any of a Pokemon's stats by a provided flat amount
   */
  public addStats({
    maxHP = 0,
    attack = 0,
    defense = 0,
    specAttack = 0,
    specDefense = 0,
    speed = 0,
  }: {
    maxHP?: number;
    attack?: number;
    defense?: number;
    specAttack?: number;
    specDefense?: number;
    speed?: number;
  }) {
    this.flatStatChanges.attack += attack;
    this.flatStatChanges.defense += defense;
    this.flatStatChanges.specAttack += specAttack;
    this.flatStatChanges.specDefense += specDefense;
    this.flatStatChanges.speed += speed;

    // update max and current HP immediately
    this.maxHP += maxHP;
    this.currentHP += maxHP;

    this.recalculateStats();
  }

  /**
   * Recalculates the Pokemon's base stats based on their raw base stats,
   * flat stat adjustments and stat multiplier stages
   */
  private recalculateStats() {
    /**
     * Returns % change for a given stat stage
     *
     * stage + 4 / 4 for positive (ie. each boost gives a flat 25% increase)
     * 4 / stage - 4 for negative (ie. each drop gives a 1/1.25 decrease)
     *
     * Capped at +8 and -8 on either side.
     */
    const getChange = (stage: number) => {
      // unaffected by stat reductions if immune to negative statuses
      if (this.status.statusImmunity && stage < 0) {
        return 1;
      }

      const boundedStage = boundRange(stage, -8, 8);
      return boundedStage > 0
        ? (boundedStage + 4) / 4
        : 4 / Math.abs(boundedStage - 4);
    };

    this.basePokemon = {
      ...this.basePokemon,
      maxHP: this.maxHP,
      attack:
        (this.rawBasePokemon.attack + this.flatStatChanges.attack) *
        getChange(this.statChanges.attack),
      defense:
        (this.rawBasePokemon.defense + this.flatStatChanges.defense) *
        getChange(this.statChanges.defense),
      specAttack:
        (this.rawBasePokemon.specAttack + this.flatStatChanges.specAttack) *
        getChange(this.statChanges.specAttack),
      specDefense:
        (this.rawBasePokemon.specDefense + this.flatStatChanges.specDefense) *
        getChange(this.statChanges.specDefense),
      speed:
        (this.rawBasePokemon.speed + this.flatStatChanges.speed) *
        getChange(this.statChanges.speed),
    };
  }

  /**
   * Add a temporary passive effect to a Pokemon.
   *
   * By default, the same status will always overwrite its previous state,
   * increase stacks, and reset the duration.
   *
   * If you want stacks to fall off independently, set unique names.
   */
  public addEffect(effect: StatusEffect, duration: number): this {
    if (effect.isNegative && this.status.statusImmunity) {
      return this;
    }

    // Merge and override existing effect, and update its duration
    const key = effect.name;
    this.effects[key] = {
      ...(this.effects[key]?.effect ?? {}),
      effect,
      duration,
      stacks: (this.effects[key]?.stacks ?? 0) + 1,
    };
    this.redrawBars();
    return this;
  }

  /**
   * Add a status effect
   */
  public addStatus(
    status: Status,
    duration: number,
    value?: number | ((prev?: number) => number)
  ): this {
    if (NEGATIVE_STATUS.includes(status) && this.status.statusImmunity) {
      return this;
    }

    // disabling statuses can interrupt stuff
    if (status === 'paralyse' || status === 'sleep') {
      this.cancellableEvents.forEach((event) => {
        event.timer.remove();
        event.onCancel?.();
      });
    }

    this.status[status] = {
      value:
        typeof value === 'number' ? value : value?.(this.status[status]?.value),
      duration,
    };
    this.redrawBars();
    return this;
  }

  public updateStatuses(timeElapsed: number) {
    if (this.status.poison) {
      this.takeDamage(
        Math.floor((this.maxHP * (this.status.poison?.value ?? 0)) / 100),
        {
          // purple flash for poison damage
          tint: 0xc060c0,
        }
      );
    }

    // reduce the duration of each status and effect
    (Object.keys(this.status) as Status[]).forEach((s: Status) => {
      const statusValue = this.status[s];
      if (statusValue) {
        statusValue.duration -= timeElapsed;
        if (statusValue.duration <= 0) {
          delete this.status[s];
        }
      }
    });

    Object.keys(this.effects).forEach((e: string) => {
      const effect = this.effects[e];
      if (effect) {
        effect.duration -= timeElapsed;
        if (effect.duration <= 0) {
          delete this.effects[e];
        }
      }
    });

    this.redrawBars();
  }

  public canUseMove(): boolean {
    if (this.basePokemon.move?.type !== 'active') {
      return false;
    }

    return this.currentPP >= this.maxPP;
  }

  // Effect methods
  // These are written as arrow functions to make it easier to type them.
  // These trigger all effects that may be attached to the Pokemon
  // via move, status effects and (possibly other stuff?)

  onMoveUse: NonNullable<EffectParams['onMoveUse']> = ({}) => {
    // Cancel out PP reductions after using a move.
    if (this.status.ppReduction) {
      this.status.ppReduction = undefined;
    }
  };

  onHit: NonNullable<EffectParams['onHit']> = ({
    scene,
    board,
    attacker,
    defender,
    flags,
    damage,
    selfCoords,
  }) => {
    this.basePokemon.move?.onHit?.({
      scene,
      board,
      attacker,
      defender,
      flags,
      damage,
      self: this,
      selfCoords,
    });
    Object.values(this.effects).forEach(({ effect }) => {
      effect.onHit?.({
        scene,
        board,
        attacker,
        defender,
        flags,
        damage,
        self: this,
        selfCoords,
        stacks: this.effects[effect.name]?.stacks ?? 0,
      });
    });
  };

  onBeingHit: NonNullable<EffectParams['onBeingHit']> = ({
    scene,
    board,
    attacker,
    defender,
    flags,
    damage,
    selfCoords,
  }) => {
    this.addPP(Math.min(5, damage * 0.015));

    this.basePokemon.move?.onBeingHit?.({
      scene,
      board,
      attacker,
      defender,
      flags,
      damage,
      self: this,
      selfCoords,
    });
    Object.values(this.effects).forEach(({ effect }) => {
      effect.onBeingHit?.({
        scene,
        board,
        attacker,
        defender,
        flags,
        damage,
        self: this,
        selfCoords,
        stacks: this.effects[effect.name]?.stacks ?? 0,
      });
    });
  };

  onDeath: NonNullable<EffectParams['onDeath']> = ({
    scene,
    board,
    pokemon,
    side,
    selfCoords,
  }) => {
    this.basePokemon.move?.onDeath?.({
      scene,
      board,
      pokemon,
      side,
      self: this,
      selfCoords,
    });
    Object.values(this.effects).forEach(({ effect }) => {
      effect.onDeath?.({
        scene,
        board,
        pokemon,
        side,
        self: this,
        selfCoords,
        stacks: this.effects[effect.name]?.stacks ?? 0,
      });
    });
  };
  onTurnStart: NonNullable<EffectParams['onTurnStart']> = ({
    scene,
    board,
    pokemon,
    selfCoords,
  }) => {
    this.basePokemon.move?.onTurnStart?.({
      scene,
      board,
      pokemon,
      self: this,
      selfCoords,
    });
    Object.values(this.effects).forEach(({ effect }) => {
      effect.onTurnStart?.({
        scene,
        board,
        pokemon,
        self: this,
        selfCoords,
        stacks: this.effects[effect.name]?.stacks ?? 0,
      });
    });
  };

  onTimer: NonNullable<EffectParams['onTimer']> = ({
    scene,
    board,
    side,
    selfCoords,
    time,
  }) => {
    this.basePokemon.move?.onTimer?.({
      scene,
      board,
      side,
      time,
      self: this,
      selfCoords,
    });
    Object.values(this.effects).forEach(({ effect }) => {
      effect.onTimer?.({
        scene,
        board,
        side,
        time,
        self: this,
        selfCoords,
        stacks: this.effects[effect.name]?.stacks ?? 0,
      });
    });
  };

  onRoundStart: NonNullable<EffectParams['onRoundStart']> = ({
    scene,
    board,
    side,
    selfCoords,
  }) => {
    this.basePokemon.move?.onRoundStart?.({
      scene,
      board,
      side,
      self: this,
      selfCoords,
    });
    Object.values(this.effects).forEach(({ effect }) => {
      effect.onRoundStart?.({
        scene,
        board,
        side,
        self: this,
        selfCoords,
        stacks: this.effects[effect.name]?.stacks ?? 0,
      });
    });
  };

  // Doesn't exist
  // onRoundEnd: NonNullable<EffectParams['onRoundEnd']>

  /**
   * Apply damage modifiers from Pokemon and statuses
   * TODO: If this causes perf issues or scaling issues (with multiplicative damage),
   * change to a simple system with flat bonuses and multipliers that scale additively.
   */
  calculateDamage: NonNullable<EffectParams['calculateDamage']> = ({
    attacker,
    defender,
    baseAmount,
    flags,
    side,
    selfCoords,
  }) => {
    let newTotal = baseAmount;
    this.basePokemon.move?.calculateDamage?.({
      attacker,
      defender,
      baseAmount: newTotal,
      flags,
      side,
      self: this,
      selfCoords,
    });
    Object.values(this.effects).forEach(({ effect }) => {
      newTotal =
        effect.calculateDamage?.({
          attacker,
          defender,
          baseAmount: newTotal,
          flags,
          side,
          self: this,
          selfCoords,
          stacks: this.effects[effect.name]?.stacks ?? 0,
        }) ?? newTotal;
    });
    return newTotal;
  };
}
