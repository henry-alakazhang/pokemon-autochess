interface AnimationData {
  /** Phaser texture key for the spritesheet */
  readonly texture: string;
  /** Number of frames in the animation spritesheet */
  readonly frames: number;
  /** Duration in milliseconds of the animation */
  readonly duration: number;
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
};
