import { Move } from '../move.model';

/**
 * Shadow Tag - Chandelure line's passive move
 *
 * Makes attacks undodgable.
 */
export const shadowTag = {
  displayName: 'Shadow Tag',
  type: 'passive',
  description:
    "{{user}} attacks a Pokemon's shadow, so its attacks cannot be dodged.",
  // Actually does nothing
} as const satisfies Move;
