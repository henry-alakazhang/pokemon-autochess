export interface ProjectileConfig {
  /** Sprite key */
  key: string;
  /** Speed in pixels per second */
  speed: number;
  /** Optional: name of animation to play if sprite is animated */
  animation?: string;
  /**
   * How the projectile travels.
   *
   * * `straight` flies directly towards the target
   * * `bounceArc` bounces outwards in a random direction, then flies to the target
   */
  trajectory?: 'straight' | 'bounceArc';
}

/**
 * Projectiles fired as part of an attack.
 * Flies towards a target and destroys itself on hit
 */
export class Projectile extends Phaser.Physics.Arcade.Sprite {
  static Events = {
    HIT: 'projectileHit',
  };

  body: Phaser.Physics.Arcade.Body;
  trajectory: 'straight' | 'bounceArc';

  /** How long the projectile has been alive */
  lifetime: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private target: Phaser.GameObjects.Sprite,
    config: ProjectileConfig
  ) {
    super(scene, x, y, config.key);

    scene.physics.add.existing(this);

    this.trajectory = config.trajectory ?? 'straight';

    this.body.setMaxSpeed(config.speed);

    // set initial direction
    // note that `update()` always pushes the projectile towards the target
    // so regardless of which direction it's fired, it will work
    switch (this.trajectory) {
      case 'bounceArc':
        // shoot in a random direction
        this.scene.physics.moveTo(
          this,
          x + (Math.random() - 0.5) * 100,
          y + (Math.random() - 0.5) * 100,
          config.speed
        );
        console.log(this.body.velocity);
        break;
      case 'straight':
      default:
        // move directly to body
        this.scene.physics.moveTo(this, target.x, target.y, config.speed);
        break;
    }

    if (config.animation) {
      this.play(config.animation);
    }

    this.lifetime = 0;
  }

  update(time: number, delta: number) {
    this.lifetime += delta;

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

    // redirect if needed
    if (this.trajectory === 'straight') {
      // just set speed directly towards the target
      this.scene.physics.moveTo(
        this,
        this.target.x,
        this.target.y,
        this.body.maxSpeed
      );
    } else {
      // accelerate towards (to create an arc effect)
      this.scene.physics.accelerateTo(
        this,
        this.target.x,
        this.target.y,
        // acceleration needs to increase over time
        // or we risk going into orbit around something LMAO
        this.lifetime * 15
      );
    }

    // turn to face target
    this.setRotation(Math.atan2(this.body.velocity.y, this.body.velocity.x));
  }
}
