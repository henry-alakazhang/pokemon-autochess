interface AnimationData {
  /** Phaser texture key for the spritesheet */
  readonly key: string;
  /** Number of frames in the animation spritesheet */
  readonly frames: number;
  /** Duration in milliseconds of the animation */
  readonly duration: number;
  /** Number of repeats, if applicable */
  readonly repeat?: number;
}

export const animations: AnimationData[] = [
  {
    key: 'volt-tackle',
    frames: 13,
    duration: 500,
  },
];
