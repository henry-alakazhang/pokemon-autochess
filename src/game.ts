import { Game } from 'phaser';
import { CombatScene } from './scenes/game/combat/combat.scene';
import { GameScene } from './scenes/game/game.scene';
import { ShopScene } from './scenes/game/shop.scene';
import { LoadingScene } from './scenes/loading.scene';
import { MenuScene } from './scenes/menu.scene';
import { PreloadScene } from './scenes/preload.scene';

export class PokemonAutochessGame extends Game {}

window.onload = () => {
  new PokemonAutochessGame({
    type: Phaser.AUTO,
    parent: 'canvas',
    width: 900,
    height: 700,
    backgroundColor: '#3A4DB5',
    scene: [
      PreloadScene,
      LoadingScene,
      MenuScene,
      CombatScene,
      GameScene,
      ShopScene,
    ],
    physics: {
      default: 'arcade',
    },
    dom: {
      createContainer: true,
    },
  });
};
