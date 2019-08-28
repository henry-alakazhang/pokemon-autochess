/**
 * Projectiles fired as part of an attack.
 * Flies towards a target and destroys itself on hit
 */
export class Projectile extends Phaser.Physics.Arcade.Sprite {
  body: Phaser.Physics.Arcade.Body;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    private target: Phaser.GameObjects.Sprite,
    private speed: number
  ) {
    super(scene, x, y, texture);
  }

  update() {
    // destroy if target goes away or if we reach it
    if (!this.target || this.scene.physics.overlap(this, this.target)) {
      this.destroy();
      return;
    }
    // call `moveToObject` again to change direction if needed
    this.scene.physics.moveToObject(this, this.target, this.speed);
    // turn to face target
    this.setRotation(Math.atan2(this.body.velocity.y, this.body.velocity.x));
  }
}
