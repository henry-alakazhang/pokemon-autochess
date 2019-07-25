import { Scene } from 'phaser';
import { PokemonName } from '../core/pokemon.data';
import { Pokemon } from '../objects/pokemon.object';

export class BootScene extends Scene {
  static readonly KEY = 'BootScene';

  constructor() {
    super({
      key: BootScene.KEY,
    });
  }

  preload(): void {
    this.load.image('logo', 'assets/logo.png');
    this.load.pack('sprites', 'assets/pack.json');
  }

  create(): void {
    this.add.image(400, 100, 'logo');

    Object.values(PokemonName).forEach(name => {
      console.log(`creating animations for ${name}`);
      this.anims.create({
        key: `${name}--down`,
        frames: this.anims.generateFrameNumbers(name, {
          start: 0,
          end: 3,
        }),
        frameRate: 8,
        repeat: -1,
      });
      this.anims.create({
        key: `${name}--left`,
        frames: this.anims.generateFrameNumbers(name, {
          start: 4,
          end: 7,
        }),
        frameRate: 8,
        repeat: -1,
      });
      this.anims.create({
        key: `${name}--right`,
        frames: this.anims.generateFrameNumbers(name, {
          start: 8,
          end: 11,
        }),
        frameRate: 8,
        repeat: -1,
      });
      this.anims.create({
        key: `${name}--up`,
        frames: this.anims.generateFrameNumbers(name, {
          start: 12,
          end: 15,
        }),
        frameRate: 8,
        repeat: -1,
      });
    });

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
