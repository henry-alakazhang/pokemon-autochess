Moves should be structured like so:

```
const move = {
  // all the move data
};

export const <moveName>: Move = move;
```

This is a bit weird, but it lets us type-check the fields of the Move and export a straight Move object so TS doesn't have to worry about complex unions when we start using the move.

We can't just do `export const <moveName> = { ... }` though, because TS (mostly correctly) treats `this` as of type `Move`. This causes many fields to be optional when they aren't, which is a pain in the ass. Not setting a type on the `const move = {... }` makes the type `typeof this` which doesn't require extra validation.