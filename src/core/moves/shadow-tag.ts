import { Move } from '../move.model';

/**
 * Shadow Tag - Chandelure line's passive move
 *
 * Makes attacks undodgable.
 */
export const shadowTag: Move = {
  displayName: 'Shadow Tag',
  type: 'passive',
  description:
    "Attacks a Pokemon's shadow, making it impossible to dodge attacks.",
  flags: {
    undodgable: true,
  },
};
