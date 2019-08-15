import { Scene } from 'phaser';
import { allPokemonNames } from '../core/pokemon.model';
import { MenuScene } from './menu.scene';

/**
 * The loading scene
 *
 * Pulls in all the assets and displays a loading bar to show the download progress.
 */
export class LoadingScene extends Scene {
  static readonly KEY = 'LoadingScene';

  /** Background bar for loading bar */
  private loadingBar: Phaser.GameObjects.Graphics;
  /** Coloured overlay representing loading progress */
  private progressBar: Phaser.GameObjects.Graphics;

  constructor() {
    super({
      key: LoadingScene.KEY,
    });
  }

  preload(): void {
    this.add.image(400, 100, 'logo');
    this.loadingBar = this.add
      .graphics()
      .fillStyle(0xffffff, 1)
      .fillRect(
        this.cameras.main.width / 4 - 2,
        this.cameras.main.height / 2 - 18,
        this.cameras.main.width / 2 + 4,
        20
      );
    this.progressBar = this.add.graphics();

    // pass value to change the loading bar fill
    this.load.on(
      'progress',
      (progress: number) => {
        this.progressBar
          .clear()
          .fillStyle(0x88e453, 1)
          .fillRect(
            this.cameras.main.width / 4,
            this.cameras.main.height / 2 - 16,
            (this.cameras.main.width / 2) * progress,
            16
          );
      },
      this
    );

    // delete bar graphics, when loading complete
    this.load.on(
      'complete',
      () => {
        this.setupAnimations();
        this.progressBar.destroy();
        this.loadingBar.destroy();
      },
      this
    );

    this.load.pack('sprites', 'assets/sprite-pack.json');
  }

  update(): void {
    this.scene.start(MenuScene.KEY);
  }

  setupAnimations() {
    allPokemonNames.forEach(name => {
      console.log(`creating animations for ${name}`);
      this.anims.create({
        key: `${name}--down`,
        frames: this.anims.generateFrameNumbers(name, {
          start: 0,
          end: 3,
        }),
        frameRate: 6,
        repeat: -1,
      });
      this.anims.create({
        key: `${name}--left`,
        frames: this.anims.generateFrameNumbers(name, {
          start: 4,
          end: 7,
        }),
        frameRate: 6,
        repeat: -1,
      });
      this.anims.create({
        key: `${name}--right`,
        frames: this.anims.generateFrameNumbers(name, {
          start: 8,
          end: 11,
        }),
        frameRate: 6,
        repeat: -1,
      });
      this.anims.create({
        key: `${name}--up`,
        frames: this.anims.generateFrameNumbers(name, {
          start: 12,
          end: 15,
        }),
        frameRate: 6,
        repeat: -1,
      });
    });
  }
}
