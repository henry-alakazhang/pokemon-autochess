export type Status =
  | 'paralyse'
  | 'percentDamageReduction'
  | 'statusImmunity'
  /** the user can't gain PP because their move is active right now */
  | 'moveIsActive';
