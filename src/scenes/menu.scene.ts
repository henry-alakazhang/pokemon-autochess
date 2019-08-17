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
    this.add.image(400, 100, 'logo');
    this.addTitlePokemon();

    this.startButton = this.add.existing(
      new Button(this, 400, 400, 'Single Player')
    );
    this.startButton.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () =>
      this.scene.start(GameScene.KEY)
    );
  }

  addTitlePokemon() {
    const randomPokemon =
      allPokemonNames[Math.floor(Math.random() * allPokemonNames.length)];
    this.titlePokemon = new PokemonObject({
      scene: this,
      x: 400,
      y: 300,
      id: randomPokemon,
      name: randomPokemon,
      side: 'player',
    }).setInteractive();
    this.add.existing(this.titlePokemon);

    this.titlePokemon
      .on(
        Input.Events.GAMEOBJECT_POINTER_DOWN,
        () => {
          console.log('clicky');
          this.titlePokemon.dealDamage(Math.ceil(Math.random() * 3));
        },
        this
      )
      .on(
        Phaser.GameObjects.Events.DESTROY,
        () => {
          window.setTimeout(() => {
            this.addTitlePokemon();
          }, 1000);
        },
        this
      );
  }
}
