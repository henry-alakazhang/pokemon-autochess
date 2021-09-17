export interface Stage {
  readonly rounds: number;
  // TODO: calculate damage based on remaining Pokemon
  readonly damage: () => number;
  // TODO: add only when shop is there
  // readonly pokemarts: number[];
}

export function getHyperRollStages(): Stage[] {
  return [
    { rounds: 2, damage: () => 5 },
    { rounds: 2, damage: () => 7 },
    { rounds: 3, damage: () => 9 },
    { rounds: 3, damage: () => 11 },
    { rounds: 3, damage: () => 13 },
    { rounds: 9, damage: () => 15 },
    { rounds: 4, damage: () => 99 },
  ];
}

/**
 * Returns `amount` random names from a name list, with no repeats.
 */
export function getRandomNames(amount: number): string[] {
  const names = [
    'Red',
    'Leaf',
    'Blue',
    'Ethan',
    'Kris',
    'Lyra',
    'Silver',
    'May',
    'Brendan',
    'Wally',
    'Lucas',
    'Dawn',
    'Barry',
    'Hilbert',
    'Hilda',
    'Cheren',
    'Bianca',
    'Nate',
    'Rosa',
    'Hugh',
    'Calem',
    'Serena',
    'Elio',
    'Selene',
    'Hau',
    'Gladion',
    'Victor',
    'Gloria',
    'Hop',
    'Bede',
    'Marnie',
  ];

  // shuffle the list with a bastardised Fisher-Yates:
  // for each item (up to the limit we care about)
  for (let i = 0; i < amount; i++) {
    // pick a random other element (that we haven't already swapped)
    const swapIndex = Math.floor(Math.random() * (names.length - i)) + i;
    // and swap the two (fancy ES6 syntax)
    [names[i], names[swapIndex]] = [names[swapIndex], names[i]];
  }
  return names.slice(0, amount);
}
