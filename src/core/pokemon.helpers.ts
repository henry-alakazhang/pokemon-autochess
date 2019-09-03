import { assertNever } from '../helpers';
import { Pokemon } from './pokemon.model';

export function getLevel(pokemon: Pokemon) {
  switch (pokemon.stage) {
    case 1:
      return 30;
    case 2:
      return 60;
    case 3:
      return 100;
    default:
      return assertNever(pokemon.stage);
  }
}
