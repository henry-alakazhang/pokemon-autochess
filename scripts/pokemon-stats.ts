import { pokemonData } from '../src/core/pokemon.model';

const uniquePokemon = Object.values(pokemonData).filter(
  pokemon => pokemon.stage === 3
);

const categories: { [k: string]: number } = {};

const tiers = {
  1: 0,
  2: 0,
  3: 0,
  4: 0,
  5: 0,
};

uniquePokemon.forEach(pokemon => {
  // sum up the types/categories
  pokemon.categories.forEach(category => {
    if (category in categories) {
      categories[category]++;
    } else {
      categories[category] = 1;
    }
  });

  // sum up the stages
  tiers[pokemon.tier]++;
});

console.log('Category summary:', JSON.stringify(categories, undefined, 2));
console.log('Stage summary:', JSON.stringify(tiers, undefined, 2));
