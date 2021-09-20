import { Input, Scene } from 'phaser';
import { allPokemonNames } from '../core/pokemon.model';
import { Button } from '../objects/button.object';
import { PokemonObject } from '../objects/pokemon.object';
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
  private startButton: Phaser.GameObjects.GameObject;

  constructor() {
    super({
      key: MenuScene.KEY,
    });
  }

  create() {
    this.add.image(400, 200, 'logo');
    this.addTitlePokemon();

    this.startButton = this.add.existing(
      new Button(this, 400, 500, 'Single Player')
    );
    this.startButton.on(Button.Events.CLICK, () =>
      this.scene.start(GameScene.KEY)
    );
  }

  addTitlePokemon() {
    const randomPokemon =
      allPokemonNames[Math.floor(Math.random() * allPokemonNames.length)];
    this.titlePokemon = new PokemonObject({
      scene: this,
      x: 400,
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
