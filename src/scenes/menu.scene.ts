import { Input, Scene } from 'phaser';
import { allPokemonNames } from '../core/pokemon.model';
import { Button } from '../objects/button.object';
import { PokemonObject } from '../objects/pokemon.object';
import { getDebugGameMode, getHyperRollGameMode } from './game/game.helpers';
import { GameScene } from './game/game.scene';

/**
 * The main menu scene
 *
 * Displays the logo and allows players to start the game
 * Also has a little minigame with a clickable Pokemon
 */
export class MenuScene extends Scene {
  static readonly KEY = 'MenuScene';

  private titlePokemon: PokemonObject;

  constructor() {
    super({
      key: MenuScene.KEY,
    });
  }

  create() {
    const center = this.game.canvas.width / 2;

    this.add.image(center, 200, 'logo');
    this.addTitlePokemon();

    this.add
      .existing(new Button(this, center, 475, 'Play Hyper Roll (1P)'))
      .on(Button.Events.CLICK, () =>
        this.scene.start(GameScene.KEY, getHyperRollGameMode())
      );

    this.add
      .existing(new Button(this, center, 525, 'Debug Mode'))
      .on(Button.Events.CLICK, () =>
        this.scene.start(GameScene.KEY, getDebugGameMode())
      );
  }

  addTitlePokemon() {
    const randomPokemon =
      allPokemonNames[Math.floor(Math.random() * allPokemonNames.length)];
    this.titlePokemon = new PokemonObject({
      scene: this,
      x: this.game.canvas.width / 2,
      y: 400,
      name: randomPokemon,
      side: 'player',
    }).setInteractive();
    this.add.existing(this.titlePokemon);

    this.titlePokemon
      .on(
        Input.Events.GAMEOBJECT_POINTER_DOWN,
        () => {
          this.titlePokemon.takeDamage(Math.ceil(Math.random() * 3));
        },
        this
      )
      .on(
        Phaser.GameObjects.Events.DESTROY,
        () => {
          this.time.addEvent({
            callback: () => {
              this.addTitlePokemon();
            },
            delay: 1000,
          });
        },
        this
      );
  }
}
