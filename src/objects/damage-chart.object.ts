import { defaultStyle } from './text.helpers';

export class DamageChart extends Phaser.GameObjects.Container {
  private entries: { [k: string]: Phaser.GameObjects.Container } = {};

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private damageGraph: { [k: string]: number }
  ) {
    super(scene, x, y);

    this.render();
  }

  render() {
    const damageDealers = Object.entries(this.damageGraph)
      // ignore anything that hasn't dealt damage
      .filter(([, a]) => a > 0)
      // order by amount, descending
      .sort(([, a], [, b]) => b - a);

    const maxDamage = damageDealers.reduce((a, [, b]) => (a > b ? a : b), 0);
    damageDealers.forEach(([pokemon, amount], index) => {
      // ignore anything that hasn't dealt damage
      if (amount <= 0) {
        return;
      }

      // add to the list of managed entities
      if (!this.entries[pokemon]) {
        this.entries[pokemon] = new Phaser.GameObjects.Container(
          this.scene,
          0,
          0,
          [
            new Phaser.GameObjects.Image(
              this.scene,
              0,
              -10,
              `${pokemon.split('-')[0]}-mini`
            ).setOrigin(0, 0.5),
            new Phaser.GameObjects.Rectangle(
              this.scene,
              50,
              0,
              0,
              10,
              0xdddddd
            ).setOrigin(0, 0.5),
            new Phaser.GameObjects.Text(
              this.scene,
              120,
              0,
              '0',
              defaultStyle
            ).setOrigin(0, 0.5),
          ]
        );
        this.add(this.entries[pokemon]);
      }

      // put into correct vertical alignment
      this.entries[pokemon].setY(index * 38);

      // update size
      const rect = this.entries[pokemon]
        .list[1] as Phaser.GameObjects.Rectangle;
      rect.setSize(Math.floor((amount / maxDamage) * 60), 10);

      // update text
      const text = this.entries[pokemon].list[2] as Phaser.GameObjects.Text;
      text.setText(`${amount}`);
    });
  }
}
