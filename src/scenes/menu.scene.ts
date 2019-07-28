import { Input, Scene } from 'phaser';
import { PokemonName } from '../core/pokemon.data';
import { Pokemon } from '../objects/pokemon.object';

export class MenuScene extends Scene {
  static readonly KEY = 'MenuScene';
  private titlePokemon: Pokemon;

  constructor() {
    super({
      key: MenuScene.KEY,
    });
  }

  create() {
    this.add.image(400, 100, 'logo');
    this.addTitlePokemon();
  }

  addTitlePokemon() {
    const randomPokemon = Object.values(PokemonName)[
      Math.floor(Math.random() * Object.values(PokemonName).length)
    ];
    this.titlePokemon = new Pokemon(
      {
        scene: this,
        x: 400,
        y: 300,
        key: randomPokemon,
      },
      randomPokemon
    );
    this.titlePokemon.playAnimation('down');

    this.titlePokemon.setInteractive();
    this.titlePokemon.on(
      Input.Events.GAMEOBJECT_POINTER_DOWN,
      () => {
        console.log('clicky');
        this.titlePokemon.dealDamage(Math.ceil(Math.random() * 3));
      },
      this
    );
    this.titlePokemon.on(
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
