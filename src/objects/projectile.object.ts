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
   * * `wobble` flies mostly directly to target with some wobbles.
   * * `randomArc` bounces outwards in a random direction, and arcs towards the target
   */
  trajectory?: 'straight' | 'wobble' | 'randomArc';
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
  trajectory: 'straight' | 'wobble' | 'randomArc';

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

    this.lifetime = 0;
    this.trajectory = config.trajectory ?? 'straight';
    this.body.setMaxSpeed(config.speed);

    // set initial direction
    // note that `update()` always pushes the projectile towards the target
    // so regardless of where it's fired, it will end up in the right place
    switch (this.trajectory) {
      case 'randomArc':
        // shoot in a random direction
        this.scene.physics.moveTo(
          this,
          x + (Math.random() - 0.5),
          y + (Math.random() - 0.5),
          config.speed
        );
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
    } else if (this.trajectory === 'wobble') {
      // set speed towards target with some variation
      this.scene.physics.moveTo(
        this,
        this.target.x + (Math.random() - 0.5) * 120,
        this.target.y + (Math.random() - 0.5) * 120,
        this.body.maxSpeed
      );
    } else {
      // accelerate towards target (to create an arc effect)
      this.scene.physics.accelerateTo(
        this,
        this.target.x,
        this.target.y,
        // acceleration needs to increase over time
        // or we risk going into orbit around something LMAO
        this.lifetime * 15
      );
    }

    // rotate to face current direction
    this.setRotation(Math.atan2(this.body.velocity.y, this.body.velocity.x));
  }
}
