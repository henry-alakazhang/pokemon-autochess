import { Input, Scene } from 'phaser';
import { allPokemonNames } from '../core/pokemon.model';
import { PokemonObject } from '../objects/pokemon.object';
import { GameScene } from './game/game.scene';

export class MenuScene extends Scene {
  static readonly KEY = 'MenuScene';

  private titlePokemon: PokemonObject;
  private startButton: Phaser.GameObjects.Text;

  constructor() {
    super({
      key: MenuScene.KEY,
    });
  }

  create() {
    this.add.image(400, 100, 'logo');
    this.addTitlePokemon();

    this.startButton = this.add
      .text(400, 400, 'Single Player', { fill: '#FFAA00', fontSize: '22px' })
      // center the button so it's inline with the logo
      .setOrigin(0.5, 0.5)
      .setInteractive({ useHandCursor: true });
    this.startButton
      .on(
        Phaser.Input.Events.POINTER_OVER,
        () => this.startButton.setStyle({ fontStyle: 'bold' }),
        this
      )
      .on(
        Phaser.Input.Events.POINTER_OUT,
        () => this.startButton.setStyle({ fontStyle: 'normal' }),
        this
      )
      .on(
        Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN,
        () => this.scene.start(GameScene.KEY),
        this
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
