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

  update(delta: number) {
    // destroy if target goes away
    if (!this.target) {
      this.destroy();
      return;
    }
    const remainingX = this.target.x - this.x;
    const remainingY = this.target.y - this.y;

    // reached destination: selfdestruct
    if (Math.abs(remainingX) < 15 && Math.abs(remainingY) < 15) {
      this.destroy();
      return;
    }

    const total = Math.abs(remainingX) + Math.abs(remainingY);
    // scale the velocity based on the speed
    this.setVelocity(
      (this.speed * remainingX) / total,
      (this.speed * remainingY) / total
    );
    // point angle
    this.setRotation(Math.atan2(this.body.velocity.y, this.body.velocity.x));
  }
}
