interface AnimationData {
  /** Phaser texture key for the spritesheet */
  readonly texture: string;
  /** Number of frames in the animation spritesheet */
  readonly frames: number;
  /** Duration in milliseconds of the animation */
  readonly duration: number;
  /** Starting frame of the animation (defaults to 0) */
  readonly start?: number;
  /** Number of repeats, if applicable (-1 for indefinite loop) */
  readonly repeat?: number;
}

export const animations: { [key: string]: AnimationData } = {
  'volt-tackle': {
    texture: 'volt-tackle',
    frames: 13,
    duration: 500,
  },
  'razor-wind-base': {
    texture: 'razor-wind-base',
    frames: 8,
    duration: 300,
    repeat: -1,
  },
  'razor-wind-wind': {
    texture: 'razor-wind-wind',
    frames: 8,
    duration: 300,
    repeat: -1,
  },
  softboiled: {
    texture: 'softboiled',
    frames: 17,
    duration: 1300,
  },
  'fury-cutter': {
    texture: 'fury-cutter',
    frames: 12,
    duration: 300,
  },
  'dragon-dance': {
    texture: 'dragon-dance',
    frames: 14,
    duration: 910,
  },
  'tri-attack-fire': {
    texture: 'tri-attack',
    frames: 6,
    duration: 1000,
  },
  'tri-attack-electric': {
    texture: 'tri-attack',
    start: 6,
    frames: 3,
    duration: 1000,
  },
  'tri-attack-ice': {
    texture: 'tri-attack',
    start: 10,
    frames: 7,
    duration: 1000,
  },
  thunder: {
    texture: 'thunder',
    frames: 9,
    duration: 300,
  },
};
