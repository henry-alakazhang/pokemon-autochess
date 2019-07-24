import * as Phaser from "phaser";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "canvas",
  width: 960,
  height: 540,
  scene: []
};

const game = new Phaser.Game(config);
