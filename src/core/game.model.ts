export type Status =
  | 'paralyse'
  | 'blind'
  | 'percentDamageReduction'
  | 'statusImmunity'
  /** the user can't gain PP because their move is active right now */
  | 'moveIsActive';
