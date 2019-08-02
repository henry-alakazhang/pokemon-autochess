import { Game } from 'phaser';
import { BootScene } from './scenes/boot.scene';
import { GameScene } from './scenes/game/game.scene';
import { MenuScene } from './scenes/menu.scene';
import { PreloadScene } from './scenes/preload.scene';

export class PokemonAutochessGame extends Game {
  constructor(config: Phaser.Types.Core.GameConfig) {
    super(config);
  }
}

window.onload = () => {
  const game = new PokemonAutochessGame({
    type: Phaser.AUTO,
    parent: 'canvas',
    width: 800,
    height: 600,
    backgroundColor: '#3A4DB5',
    scene: [PreloadScene, BootScene, MenuScene, GameScene],
  });
};
