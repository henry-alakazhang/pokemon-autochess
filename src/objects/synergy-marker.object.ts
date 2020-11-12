import { Category, synergyData } from '../core/game.model';

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
    category: Category,
    count: number
  ) {
    super(scene, x, y, category);
    this.setDisplaySize(100, 22);
    this.setOrigin(0);

    const { description, thresholds } = synergyData[category];

    // current tier is 1-indexed, so it's the index of the next threshold
    let tier = thresholds.findIndex(threshold => count < threshold);
    let nextThreshold = thresholds[tier];
    // if tier is -1, it means there's no bigger threshold
    // so we set tier to the max and just use the max threshold as the next one
    if (tier === -1) {
      tier = thresholds.length;
      nextThreshold = thresholds[thresholds.length - 1];
    }

    this.thresholdText = scene.add
      .text(x + this.displayWidth + 4, y + 4, `${count}/${nextThreshold}`, {
        color: '#000',
      })
      .setOrigin(0);
    // background covers the type + text and grows in size based on tier
    this.background = scene.add
      .rectangle(
        this.x - tier,
        this.y - tier,
        this.displayWidth + this.thresholdText.displayWidth + 6 + tier * 2,
        this.displayHeight + tier * 2,
        this.colors[tier]
      )
      .setOrigin(0)
      .setDepth(-1);

    // hover text showing the description
    this.descriptionText = scene.add
      .text(0, 0, description, {
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
        this.descriptionText.setX(pointer.worldX + 10);
        this.descriptionText.setY(pointer.worldY + 10);
        this.descriptionText.setVisible(true);
      })
      .on(Phaser.Input.Events.POINTER_OUT, () => {
        this.descriptionText.setVisible(false);
      });
  }

  destroy() {
    this.thresholdText.destroy();
    this.descriptionText.destroy();
    this.background.destroy();
    super.destroy();
  }
}
