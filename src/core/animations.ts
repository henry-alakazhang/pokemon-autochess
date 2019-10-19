interface AnimationData {
  /** Phaser texture key for the spritesheet */
  readonly texture: string;
  /** Number of frames in the animation spritesheet */
  readonly frames: number;
  /** Duration in milliseconds of the animation */
  readonly duration: number;
  /** Number of repeats, if applicable */
  readonly repeat?: number;
}

export const animations: { [key: string]: AnimationData } = {
  'volt-tackle': {
    texture: 'volt-tackle',
    frames: 13,
    duration: 500,
  },
};
