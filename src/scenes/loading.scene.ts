import { Scene } from 'phaser';
import { animations } from '../core/animations';
import { allPokemonNames } from '../core/pokemon.model';
import { getBaseTexture } from '../helpers';
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
    this.add.image(this.game.canvas.width / 2, 200, 'logo');
    this.loadingBar = this.add
      .graphics({ y: 150 })
      .fillStyle(0xffffff, 1)
      .fillRect(
        this.cameras.main.width / 4 - 2,
        this.cameras.main.height / 2 - 18,
        this.cameras.main.width / 2 + 4,
        20
      );
    this.progressBar = this.add.graphics({ y: 150 });

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
    this.load.pack('fx', 'assets/fx-pack.json');
    this.load.pack('animations', 'assets/animation-pack.json');
  }

  update(): void {
    this.scene.start(MenuScene.KEY);
  }

  setupAnimations() {
    allPokemonNames.forEach((name) => {
      const key = getBaseTexture(name);
      if (!this.textures.exists(key)) {
        throw new Error(`Missing textures for ${key}!`);
      }
      this.anims.create({
        key: `${key}--down`,
        frames: this.anims.generateFrameNumbers(key, {
          start: 0,
          end: 3,
        }),
        frameRate: 6,
        repeat: -1,
      });
      this.anims.create({
        key: `${key}--left`,
        frames: this.anims.generateFrameNumbers(key, {
          start: 4,
          end: 7,
        }),
        frameRate: 6,
        repeat: -1,
      });
      this.anims.create({
        key: `${key}--right`,
        frames: this.anims.generateFrameNumbers(key, {
          start: 8,
          end: 11,
        }),
        frameRate: 6,
        repeat: -1,
      });
      this.anims.create({
        key: `${key}--up`,
        frames: this.anims.generateFrameNumbers(key, {
          start: 12,
          end: 15,
        }),
        frameRate: 6,
        repeat: -1,
      });
    });

    Object.entries(animations).forEach(([key, animation]) => {
      if (!this.textures.exists(animation.texture)) {
        throw new Error(`Missing textures for ${key}!`);
      }
      const start = animation.start || 0;
      this.anims.create({
        defaultTextureKey: animation.texture,
        key,
        frames: this.anims.generateFrameNumbers(animation.texture, {
          start,
          end: start + animation.frames - 1,
        }),
        frameRate: (animation.frames * 1000) / animation.duration,
        repeat: animation.repeat || 0,
      });
    });
  }
}
