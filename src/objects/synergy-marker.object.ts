import { Category, getSynergyTier, synergyData } from '../core/game.model';
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
  private descriptionText: Phaser.GameObjects.Text;

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
    this.descriptionText = scene.add
      .text(0, 0, synergyData[category].description, {
        ...defaultStyle,
        color: '#FFF',
        backgroundColor: '#5F7D99',
        padding: { x: 2, y: 2 },
      })
      .setDepth(100)
      .setVisible(false);
    // set the background as interactive as it covers more area
    this.background.setInteractive();
    this.background
      .on(Phaser.Input.Events.POINTER_OVER, (pointer: Phaser.Input.Pointer) => {
        this.descriptionText.setX(Math.round(pointer.worldX + 10));
        this.descriptionText.setY(Math.round(pointer.worldY + 10));
        this.descriptionText.setVisible(true);
      })
      .on(Phaser.Input.Events.POINTER_OUT, () => {
        this.descriptionText.setVisible(false);
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
      this.descriptionText.destroy();
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
