import { Scene } from 'phaser';
import { PokemonName } from '../core/pokemon.data';
import { Pokemon } from '../objects/pokemon.object';

export class MenuScene extends Scene {
  static readonly KEY = 'MenuScene';

  constructor() {
    super({
      key: MenuScene.KEY,
    });
  }

  create() {
    this.add.image(400, 100, 'logo');

    new Pokemon(
      {
        scene: this,
        x: 350,
        y: 300,
        key: 'talonflame',
      },
      PokemonName.TALONFLAME
    ).playAnimation('left');
    new Pokemon(
      {
        scene: this,
        x: 400,
        y: 250,
        key: 'talonflame',
      },
      PokemonName.TALONFLAME
    ).playAnimation('up');
    new Pokemon(
      {
        scene: this,
        x: 450,
        y: 300,
        key: 'talonflame',
      },
      PokemonName.TALONFLAME
    ).playAnimation('right');
    new Pokemon(
      {
        scene: this,
        x: 400,
        y: 350,
        key: 'talonflame',
      },
      PokemonName.TALONFLAME
    ).playAnimation('down');
  }
}
