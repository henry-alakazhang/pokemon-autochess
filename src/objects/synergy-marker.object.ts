import { Category, getSynergyTier, synergyData } from '../core/game.model';
import { pokemonPerSynergy } from '../core/pokemon.model';
import { defaultStyle, titleStyle } from './text.helpers';

export class SynergyMarker extends Phaser.GameObjects.Sprite {
  static height = 30;

  /**
   * colors for each tier of synergy
   * TODO: show colors based on max
   * eg. if a synergy only has 2 tiers, it should be gold at tier 2
   */
  readonly colors = [
    // no synergy - gray
    0xbbbbbb,
    // tier 1 - bronze
    0xb08d57,
    // tier 2 - silver
    0xddddee,
    // tier 3 - gold
    0xffd700,
  ];

  private thresholdText: Phaser.GameObjects.Text;
  private background: Phaser.GameObjects.Rectangle;
  private tooltip: Phaser.GameObjects.Container;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    public category: Category,
    count: number
  ) {
    super(scene, x, y, category);
    this.setDisplaySize(100, 22);
    this.setOrigin(0);

    this.thresholdText = scene.add
      .text(x + this.displayWidth + 4, y + 4, ``, {
        ...titleStyle,
        color: '#000',
      })
      .setOrigin(0);
    // background covers the type + text and grows in size based on tier
    // styles are applied in `setCount()`
    this.background = scene.add
      .rectangle()
      .setOrigin(0)
      .setDepth(-1);
    this.setCount(count);

    // hover text showing the description
    const tooltipText = new Phaser.GameObjects.Text(
      scene,
      0,
      0,
      synergyData[category].description,
      {
        ...defaultStyle,
        color: '#FFF',
        backgroundColor: '#5F7D99',
        padding: { left: 4, top: 4, right: 4, bottom: 48 },
      }
    );
    // the tooltip itself is a container with the tooltip and icons containing all the Pokemon.
    this.tooltip = scene.add
      .container(0, 0, [
        tooltipText,
        ...pokemonPerSynergy[category].map((name, index) =>
          this.scene.add
            .image(index * 40 - 10, tooltipText.height - 44, `${name}-mini`)
            .setOrigin(0)
            // the icons sit about the text background
            .setDepth(1)
        ),
      ])
      .setVisible(false)
      // tooltip sits above all content
      .setDepth(100);

    // set the background as interactive as it covers more area
    this.background.setInteractive();
    this.background
      .on(Phaser.Input.Events.POINTER_OVER, (pointer: Phaser.Input.Pointer) => {
        this.tooltip.setX(Math.round(pointer.worldX + 10));
        this.tooltip.setY(Math.round(pointer.worldY + 10));
        this.tooltip.setVisible(true);
      })
      .on(Phaser.Input.Events.POINTER_OUT, () => {
        this.tooltip.setVisible(false);
      });
  }

  destroy() {
    // Only destroy if not part of the scene being destroyed.
    // Otherwise Phaser can throw errors trying to destroy the same thing twice.
    // https://github.com/photonstorm/phaser/issues/5520
    if (
      this.scene &&
      this.scene.scene.settings.status !== Phaser.Scenes.SHUTDOWN
    ) {
      this.thresholdText.destroy();
      this.tooltip.destroy();
      this.background.destroy();
    }
    super.destroy();
  }

  setVisible(visible: boolean): this {
    super.setVisible(visible);
    this.thresholdText.setVisible(visible);
    this.background.setVisible(visible);
    return this;
  }

  setActive(active: boolean): this {
    super.setActive(active);
    this.thresholdText.setActive(active);
    this.background.setActive(active);
    return this;
  }

  setCount(count: number) {
    const { thresholds } = synergyData[this.category];
    const tier = getSynergyTier(thresholds, count);
    // tier starts at 1, so next threshold is just the entry after
    // tier can be `thresholds.length`, in which case it would be undefined and should default to max
    const nextThreshold = thresholds[tier] ?? thresholds[thresholds.length - 1];

    this.thresholdText
      .setPosition(this.x + this.displayWidth + 4, this.y + 4)
      .setText(`${count}/${nextThreshold}`);
    this.background
      .setPosition(this.x - tier, this.y - tier)
      .setSize(
        this.displayWidth + this.thresholdText.displayWidth + 6 + tier * 2,
        this.displayHeight + tier * 2
      )
      .setFillStyle(this.colors[tier]);
  }
}
