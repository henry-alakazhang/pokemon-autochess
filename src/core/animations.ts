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
  'cotton-guard-start': {
    texture: 'cotton-guard',
    frames: 10,
    duration: 500,
  },
  'cotton-guard-spin': {
    texture: 'cotton-guard',
    start: 10,
    frames: 12,
    duration: 600,
    repeat: -1,
  },
  'cotton-guard-end': {
    texture: 'cotton-guard',
    start: 22,
    frames: 11,
    duration: 550,
  },
  'quiver-dance': {
    texture: 'quiver-dance',
    frames: 31,
    duration: 1000,
  },
  'dragon-rush': {
    texture: 'dragon-rush',
    frames: 24,
    duration: 800,
  },
  'shell-trap': {
    texture: 'shell-trap',
    frames: 10,
    duration: 320,
  },
  'meteor-mash': {
    texture: 'meteor-mash',
    frames: 5,
    duration: 1000 / 6, // 30 fps
  },
  'leech-life': {
    texture: 'leech-life',
    frames: 36,
    duration: 900,
  },
  'stone-edge-gather': {
    texture: 'stone-edge',
    frames: 40,
    duration: 1300,
  },
  'stone-edge-shoot': {
    texture: 'stone-edge',
    frames: 21,
    start: 40,
    duration: 100,
  },
  'shadow-ball-start': {
    texture: 'shadow-ball',
    frames: 4,
    start: 0,
    duration: 60,
  },
  'shadow-ball-float': {
    texture: 'shadow-ball',
    frames: 12,
    start: 4,
    duration: 180,
    repeat: -1,
  },
  sleep: {
    texture: 'sleep',
    frames: 2,
    start: 0,
    // 6 fps to maintain parity with pokemon movement
    duration: 1000 / 3,
    repeat: -1,
  },
  explosion: {
    texture: 'explosion',
    frames: 4,
    start: 0,
    duration: 133,
  },
  'water-hit': {
    texture: 'water-hit',
    frames: 14,
    start: 0,
    duration: (1000 / 30) * 14,
  },
  cog: {
    texture: 'cog',
    frames: 15,
    duration: 500,
  },
  'mud-bomb': {
    texture: 'mud-bomb',
    frames: 6,
    duration: 200,
  },
  'magma-storm': {
    texture: 'magma-storm',
    frames: 50,
    duration: (1000 * 5) / 6,
  },
  'rock-hit': {
    texture: 'rock-hit',
    frames: 11,
    duration: (1000 * 11) / 30,
  },
  'poison-hit': {
    texture: 'poison-hit',
    frames: 6,
    duration: 400,
  },
  'blue-buff': {
    texture: 'blue-buff',
    frames: 17,
    duration: 600,
  },
  'crush-grip': {
    texture: 'crush-grip',
    frames: 21,
    duration: 700,
  },
};
