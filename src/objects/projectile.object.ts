/**
 * Projectiles fired as part of an attack.
 * Flies towards a target and destroys itself on hit
 */
export class Projectile extends Phaser.Physics.Arcade.Sprite {
  static Events = {
    HIT: 'projectileHit',
  };

  body: Phaser.Physics.Arcade.Body;

  target: Phaser.GameObjects.Sprite;
  speed: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    target: Phaser.GameObjects.Sprite,
    speed: number
  ) {
    super(scene, x, y, texture);

    this.target = target;
    this.speed = speed;
  }

  update() {
    // destroy if target goes away
    if (!this.target || !this.target.active) {
      this.destroy();
      return;
    }

    // mark as hit if the target is hit
    if (this.scene.physics.overlap(this, this.target)) {
      this.emit(Projectile.Events.HIT);
      this.destroy();
      return;
    }

    // call `moveToObject` again to change direction if needed
    this.scene.physics.moveToObject(this, this.target, this.speed);
    // turn to face target
    this.setRotation(Math.atan2(this.body.velocity.y, this.body.velocity.x));
  }
}
