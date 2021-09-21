import { Move } from '../move.model';

/**
 * Shadow Tag - Chandelure line's passive move
 *
 * Makes attacks undodgable.
 */
const move = {
  displayName: 'Shadow Tag',
  type: 'passive',
  description:
    "{{user}} attacks a Pokemon's shadow, so its attacks cannot be dodged.",
  flags: {
    undodgable: true,
  },
} as const;

export const shadowTag: Move = move;
