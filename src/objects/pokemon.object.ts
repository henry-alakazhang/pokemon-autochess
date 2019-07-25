import { Scene } from 'phaser';
import { PokemonName } from '../core/pokemon.data';

interface SpriteParams {
  readonly scene: Scene;
  readonly x: number;
  readonly y: number;
  readonly key: string;
  readonly frame?: string | number;
}

export type PokemonAnimationType = 'left' | 'right' | 'up' | 'down';

export class Pokemon extends Phaser.GameObjects.Sprite {
  private sprite: Phaser.GameObjects.Sprite;

  constructor(params: SpriteParams, private key: PokemonName) {
    super(params.scene, params.x, params.y, params.key, params.frame);

    this.sprite = this.scene.add.sprite(this.x, this.y, name);
  }

  playAnimation(type: PokemonAnimationType) {
    this.sprite.play(`${this.key}--${type}`);
  }
}
