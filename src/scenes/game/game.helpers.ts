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

/**
 * Returns `amount` random names from the name list, with no repeats.
 *
 * note: this irreversibly modifies the original array,
 * but it shouldn't matter because we don't use that directly.
 */
export function getRandomNames(amount: number): string[] {
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
