import { getBaseTexture } from '../helpers';
import { GameScene } from '../scenes/game/game.scene';
import { NeutralRound } from '../scenes/game/game.helpers';
import { defaultStyle, titleStyle } from './text.helpers';

/**
 * Sidebar component that displays the next combat information in Adventure Mode.
 * Shows opponent name and a preview of opponent's Pokemon team.
 */
export class NextCombatSidebar extends Phaser.GameObjects.Container {
  private title: Phaser.GameObjects.Text;
  private opponentName: Phaser.GameObjects.Text;
  private teamPreview: Phaser.GameObjects.Container;

  constructor(scene: GameScene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);

    // Title
    this.title = scene.add
      .text(0, 0, 'Next Combat', {
        ...titleStyle,
        fontSize: '18px',
      })
      .setOrigin(0, 0);
    this.add(this.title);

    // Opponent name
    this.opponentName = scene.add
      .text(0, 25, 'Unknown', {
        ...defaultStyle,
        fontSize: '16px',
      })
      .setOrigin(0, 0);
    this.add(this.opponentName);

    // Team preview container
    this.teamPreview = scene.add.container(0, 70);
    this.add(this.teamPreview);
  }

  /**
   * Update the combat indicator with a new round
   */
  setNextRound(neutralRound: NeutralRound | undefined): void {
    // Update opponent name
    this.opponentName.setText(neutralRound?.name ?? 'Unknown');

    // Clear existing team sprites
    this.teamPreview.removeAll(true);

    // Add Pokemon preview sprites
    if (neutralRound?.board) {
      neutralRound.board.forEach((pokemon, index) => {
        const sprite = this.scene.add
          .image(
            (index % 4) * 50, // 4 per row
            Math.floor(index / 4) * 50, // rows
            `${getBaseTexture(pokemon.name)}-mini`
          )
          .setOrigin(0, 0)
          .setScale(0.75);
        this.teamPreview.add(sprite);
      });
    }
  }
}
