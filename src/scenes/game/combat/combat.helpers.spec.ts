import * as expect from 'expect';
import { PokemonObject } from '../../../objects/pokemon.object';
import {
  Coords,
  getFacing,
  getNearestTarget,
  optimiseAOE,
  pathfind,
} from './combat.helpers';

const playerMock = { side: 'player' } as PokemonObject;
const enemyMock = { side: 'enemy' } as PokemonObject;

describe('getNearestTarget', () => {
  it(`should find an enemy if they're right next to the player
      ...
      .AB
      ...`, () => {
    expect(
      getNearestTarget(
        [
          [undefined, undefined, undefined],
          [undefined, playerMock, undefined],
          [undefined, enemyMock, undefined],
        ],
        { x: 1, y: 1 }
      )
    ).toEqual({ x: 2, y: 1 });
  });

  it(`should find an enemy if they're right above the player
      .B.
      .A.
      ...`, () => {
    expect(
      getNearestTarget(
        [
          [undefined, undefined, undefined],
          [enemyMock, playerMock, undefined],
          [undefined, undefined, undefined],
        ],
        { x: 1, y: 1 }
      )
    ).toEqual({ x: 1, y: 0 });
  });

  it(`should not break if it can't find anything
      ...
      .A.
      ...`, () => {
    expect(
      getNearestTarget(
        [
          [undefined, undefined, undefined],
          [undefined, playerMock, undefined],
          [undefined, undefined, undefined],
        ],
        { x: 1, y: 1 }
      )
    ).toEqual(undefined);
  });

  it(`should not break if it isn't given a valid player can't find anything
      ...
      ...
      ...`, () => {
    expect(
      getNearestTarget(
        [
          [undefined, undefined, undefined],
          [undefined, undefined, undefined],
          [undefined, undefined, undefined],
        ],
        { x: 1, y: 1 }
      )
    ).toEqual(undefined);
  });

  it(`should prioritise enemies in a clockwise order
      .b.
      .AB
      ...`, () => {
    expect(
      getNearestTarget(
        [
          [undefined, undefined, undefined],
          [undefined, playerMock, enemyMock],
          [undefined, enemyMock, undefined],
        ],
        { x: 1, y: 1 }
      )
    ).toEqual({ x: 2, y: 1 });
  });

  it(`should ignore allies
      ...
      .Aa
      .B.`, () => {
    expect(
      getNearestTarget(
        [
          [undefined, undefined, undefined],
          [undefined, playerMock, enemyMock],
          [undefined, playerMock, undefined],
        ],
        { x: 1, y: 1 }
      )
    ).toEqual({ x: 1, y: 2 });
  });

  it(`should work at longer distances
      ...
      A.B
      ...`, () => {
    expect(
      getNearestTarget(
        [
          [undefined, playerMock, undefined],
          [undefined, undefined, undefined],
          [undefined, enemyMock, undefined],
        ],
        { x: 0, y: 1 }
      )
    ).toEqual({ x: 2, y: 1 });
  });

  it(`should prioritise closer units
      ...
      A.b
      B..`, () => {
    expect(
      getNearestTarget(
        [
          [undefined, playerMock, enemyMock],
          [undefined, undefined, undefined],
          [undefined, enemyMock, undefined],
        ],
        { x: 0, y: 1 }
      )
    ).toEqual({ x: 0, y: 2 });
  });

  it(`should work in the top-right quadrant
      ..B
      ...
      A..`, () => {
    expect(
      getNearestTarget(
        [
          [undefined, undefined, playerMock],
          [undefined, undefined, undefined],
          [enemyMock, undefined, undefined],
        ],
        { x: 0, y: 2 }
      )
    ).toEqual({ x: 2, y: 0 });
  });

  it(`should work in the bottom-right quadrant
      A..
      ...
      ..B`, () => {
    expect(
      getNearestTarget(
        [
          [playerMock, undefined, undefined],
          [undefined, undefined, undefined],
          [undefined, undefined, enemyMock],
        ],
        { x: 0, y: 0 }
      )
    ).toEqual({ x: 2, y: 2 });
  });

  it(`should work in the bottom-left quadrant
      ..A
      ...
      B..`, () => {
    expect(
      getNearestTarget(
        [
          [undefined, undefined, enemyMock],
          [undefined, undefined, undefined],
          [playerMock, undefined, undefined],
        ],
        { x: 2, y: 0 }
      )
    ).toEqual({ x: 0, y: 2 });
  });

  it(`should work in the top-left quadrant
      B..
      ...
      ..A`, () => {
    expect(
      getNearestTarget(
        [
          [enemyMock, undefined, undefined],
          [undefined, undefined, undefined],
          [undefined, undefined, playerMock],
        ],
        { x: 2, y: 2 }
      )
    ).toEqual({ x: 0, y: 0 });
  });

  it(`should prioritise distant enemies in a clockwise order
      .b.
      A..
      .B.`, () => {
    expect(
      getNearestTarget(
        [
          [undefined, playerMock, undefined],
          [enemyMock, undefined, enemyMock],
          [undefined, undefined, undefined],
        ],
        { x: 0, y: 1 }
      )
    ).toEqual({ x: 1, y: 2 });
  });

  it(`should work for bigger boards
      ......
      ......
      ......
      ...A..
      ......
      .....B`, () => {
    expect(
      getNearestTarget(
        [
          [undefined, undefined, undefined, undefined, undefined, undefined],
          [undefined, undefined, undefined, undefined, undefined, undefined],
          [undefined, undefined, undefined, undefined, undefined, undefined],
          [undefined, undefined, undefined, playerMock, undefined, undefined],
          [undefined, undefined, undefined, undefined, undefined, undefined],
          [undefined, undefined, undefined, undefined, undefined, enemyMock],
        ],
        { x: 3, y: 3 }
      )
    ).toEqual({ x: 5, y: 5 });
  });
});

describe('pathfind', () => {
  it(`should find a path between two points
    A>B
    ...
    ...`, () => {
    expect(
      pathfind(
        [
          [enemyMock, undefined, undefined],
          [undefined, undefined, undefined],
          [playerMock, undefined, undefined],
        ],
        { x: 0, y: 0 },
        [{ x: 2, y: 0 }],
        1
      )?.path
    ).toEqual([{ x: 1, y: 0 }]);
  });

  it(`should find a path between distant points
    A>v
    ..v
    ..B`, () => {
    expect(
      pathfind(
        [
          [enemyMock, undefined, undefined],
          [undefined, undefined, undefined],
          [undefined, undefined, playerMock],
        ],
        { x: 0, y: 0 },
        [{ x: 2, y: 2 }],
        1
      )?.path
    ).toEqual(
      [
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 2, y: 1 },
      ].reverse()
    );
  });

  it(`should go around obstacles
    AX.
    >>v
    ..B`, () => {
    expect(
      pathfind(
        [
          [enemyMock, undefined, undefined],
          [playerMock, undefined, undefined],
          [undefined, undefined, playerMock],
        ],
        { x: 0, y: 0 },
        [{ x: 2, y: 2 }],
        1
      )?.path
    ).toEqual(
      [
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
      ].reverse()
    );
  });

  it(`should return cleanly if there's no path
    A.X
    .X.
    X.B`, () => {
    expect(
      pathfind(
        [
          [enemyMock, playerMock, undefined],
          [playerMock, undefined, undefined],
          [playerMock, undefined, playerMock],
        ],
        { x: 0, y: 0 },
        [{ x: 2, y: 2 }],
        1
      )
    ).toEqual(undefined);
  });

  it(`should pick a closer target between multiple
    A>B
    ...
    ..C`, () => {
    const pathFound = pathfind(
      [
        [enemyMock, undefined, undefined],
        [undefined, undefined, undefined],
        [playerMock, undefined, playerMock],
      ],
      { x: 0, y: 0 },
      [
        { x: 2, y: 2 },
        { x: 2, y: 0 },
      ],
      1
    );
    expect(pathFound?.target).toEqual({ x: 2, y: 0 });
    expect(pathFound?.path).toEqual([{ x: 1, y: 0 }]);
  });

  it(`should pick a closer target through obstacles
    AXB
    >v.
    .C.`, () => {
    const pathFound = pathfind(
      [
        [enemyMock, undefined, undefined],
        [enemyMock, undefined, playerMock],
        [playerMock, undefined, undefined],
      ],
      { x: 0, y: 0 },
      [
        { x: 1, y: 2 },
        { x: 2, y: 0 },
      ],
      1
    );
    expect(pathFound?.target).toEqual({ x: 1, y: 2 });
    expect(pathFound?.path).toEqual(
      [
        { x: 0, y: 1 },
        { x: 1, y: 1 },
      ].reverse()
    );
  });

  it(`should only path up to within range
    A>O
    ...
    ..B`, () => {
    expect(
      pathfind(
        [
          [enemyMock, undefined, undefined],
          [undefined, undefined, undefined],
          [undefined, undefined, playerMock],
        ],
        { x: 0, y: 0 },
        [{ x: 2, y: 2 }],
        2
      )?.path
    ).toEqual(
      [
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ].reverse()
    );
  });

  it(`should allow range to ignore blockers
    A>O
    XXX
    ..B`, () => {
    expect(
      pathfind(
        [
          [enemyMock, enemyMock, undefined],
          [undefined, enemyMock, undefined],
          [undefined, enemyMock, playerMock],
        ],
        { x: 0, y: 0 },
        [{ x: 2, y: 2 }],
        2
      )?.path
    ).toEqual(
      [
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ].reverse()
    );
  });

  it(`should pick closest target even if that target is through blockers
    Av.
    XX.
    .BC`, () => {
    const pathFound = pathfind(
      [
        [enemyMock, enemyMock, undefined],
        [undefined, enemyMock, playerMock],
        [undefined, undefined, playerMock],
      ],
      { x: 0, y: 0 },
      [
        { x: 1, y: 2 },
        { x: 2, y: 2 },
      ],
      2
    );
    expect(pathFound?.target).toEqual({ x: 1, y: 2 });
    expect(pathFound?.path).toEqual([{ x: 1, y: 0 }]);
  });

  it(`should work for larger boards (7x7)`, () => {
    expect(
      pathfind(
        [
          [
            enemyMock,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          ],
          [
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          ],
          [
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          ],
          [
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          ],
          [
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          ],
          [
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          ],
          [
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            playerMock,
          ],
        ],
        { x: 0, y: 0 },
        [{ x: 6, y: 6 }],
        1
      )?.path
    ).toEqual(
      [
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 3, y: 0 },
        { x: 4, y: 0 },
        { x: 5, y: 0 },
        { x: 6, y: 0 },
        { x: 6, y: 1 },
        { x: 6, y: 2 },
        { x: 6, y: 3 },
        { x: 6, y: 4 },
        { x: 6, y: 5 },
      ].reverse()
    );
  });

  it(`should work in the edges of larger boards (7x7)`, () => {
    expect(
      pathfind(
        [
          [
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          ],
          [
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          ],
          [
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          ],
          [
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          ],
          [
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
          ],
          [
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            enemyMock,
            undefined,
          ],
          [
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            playerMock,
          ],
        ],
        { x: 5, y: 5 },
        [{ x: 6, y: 6 }],
        1
      )?.path
    ).toEqual([{ x: 6, y: 5 }]);
  });
});

const singleTargetAOEMock = (coords: Coords) => [coords];
const lineAOEMock = (coords: Coords) => [
  { x: coords.x, y: coords.y + 1 },
  coords,
];
const crossAOEMock = (coords: Coords) => [
  { x: coords.x - 1, y: coords.y - 1 },
  { x: coords.x - 1, y: coords.y + 1 },
  coords,
  { x: coords.x + 1, y: coords.y - 1 },
  { x: coords.x + 1, y: coords.y + 1 },
];
// 2 square line in the direction of the target
const directionLineAOEMock = (coords: Coords, myCoords: Coords) => {
  const dx = coords.x - myCoords.x;
  const dy = coords.y - myCoords.y;
  return [
    { x: myCoords.x + dx, y: myCoords.y + dy },
    { x: myCoords.x + 2 * dx, y: myCoords.y + 2 * dy },
  ];
};

describe('optimiseAOE', () => {
  it('should return nothing if there is nobody attacking', () => {
    expect(
      optimiseAOE({
        board: [[]],
        user: { x: 0, y: 0 },
        range: 1,
        getAOE: singleTargetAOEMock,
      })
    ).toBeUndefined();
  });

  it('should return nothing if there are no targets', () => {
    expect(
      optimiseAOE({
        board: [[playerMock]],
        user: { x: 0, y: 0 },
        range: 1,
        getAOE: singleTargetAOEMock,
      })
    ).toBeUndefined();
  });

  it(`should return a target if there is one in range
      A.. 
     >B.. | range = 1
      ...`, () => {
    expect(
      optimiseAOE({
        board: [
          [playerMock, enemyMock, undefined],
          [undefined, undefined, undefined],
          [undefined, undefined, undefined],
        ],
        user: { x: 0, y: 0 },
        range: 1,
        getAOE: singleTargetAOEMock,
      })
    ).toEqual({ x: 0, y: 1 });
  });

  it(`should not return a target if they are out of range
      A.. 
      ... | range = 1
      B..`, () => {
    expect(
      optimiseAOE({
        board: [
          [playerMock, undefined, enemyMock],
          [undefined, undefined, undefined],
          [undefined, undefined, undefined],
        ],
        user: { x: 0, y: 0 },
        range: 1,
        getAOE: singleTargetAOEMock,
      })
    ).toBeUndefined();
  });

  it(`should pick targets for a multi-target aoe
     A..
    >B.. | range = 2
     B.. `, () => {
    expect(
      optimiseAOE({
        board: [
          [playerMock, enemyMock, enemyMock],
          [undefined, undefined, undefined],
          [undefined, undefined, undefined],
        ],
        user: { x: 0, y: 0 },
        range: 2,
        getAOE: lineAOEMock,
      })
    ).toEqual({ x: 0, y: 1 });
  });

  it(`should maximise targets when able to
      AB.
     >B..
      B..`, () => {
    expect(
      optimiseAOE({
        board: [
          [playerMock, enemyMock, enemyMock],
          [enemyMock, undefined, undefined],
          [undefined, undefined, undefined],
        ],
        user: { x: 0, y: 0 },
        range: 2,
        getAOE: lineAOEMock,
      })
    ).toEqual({ x: 0, y: 1 });
  });

  it(`should still pick a target if unable to maximise targets
         v
        ABB
        ... | range = 2
        ... `, () => {
    expect(
      optimiseAOE({
        board: [
          [playerMock, undefined, undefined],
          [enemyMock, undefined, undefined],
          [enemyMock, undefined, undefined],
        ],
        user: { x: 0, y: 0 },
        range: 2,
        getAOE: lineAOEMock,
      })
    ).toEqual({ x: 1, y: 0 });
  });

  it(`should be able to utilise the AOE if targets are out of direct range
      A..
     >... | range = 1
      B..`, () => {
    expect(
      optimiseAOE({
        board: [
          [playerMock, undefined, enemyMock],
          [undefined, undefined, undefined],
          [undefined, undefined, undefined],
        ],
        user: { x: 0, y: 0 },
        range: 1,
        getAOE: lineAOEMock,
      })
    ).toEqual({ x: 0, y: 1 });
  });

  it(`should work with an odd AOE
      A.B
      .X.
      B.B`, () => {
    expect(
      optimiseAOE({
        board: [
          [playerMock, undefined, enemyMock],
          [undefined, undefined, undefined],
          [enemyMock, undefined, enemyMock],
        ],
        user: { x: 0, y: 0 },
        range: 100,
        getAOE: crossAOEMock,
      })
    ).toEqual({ x: 1, y: 1 });
  });

  it(`should work if the AOE goes off the board
      AB.
      ..B<
      .B.`, () => {
    expect(
      optimiseAOE({
        board: [
          [playerMock, undefined, undefined],
          [enemyMock, undefined, enemyMock],
          [undefined, enemyMock, undefined],
        ],
        user: { x: 0, y: 0 },
        range: 100,
        getAOE: crossAOEMock,
      })
    ).toEqual({ x: 2, y: 1 });
  });

  it(`should always pick a unit for a unit-targetted AOE
       v
      ABB
      ..B
      B.B`, () => {
    // ie. it shouldn't be the center tile with 3 targets
    expect(
      optimiseAOE({
        board: [
          [playerMock, undefined, enemyMock],
          [enemyMock, undefined, undefined],
          [enemyMock, enemyMock, enemyMock],
        ],
        user: { x: 0, y: 0 },
        range: 100,
        getAOE: crossAOEMock,
        targetting: 'unit',
      })
    ).toEqual({ x: 1, y: 0 });
  });

  it(`should pick a unit of the right side for a unit-targetted AOE
      AAA
      .BA<
      AAA`, () => {
    // ie. it shouldn't be the center tile which is not an ally
    expect(
      optimiseAOE({
        board: [
          [playerMock, undefined, playerMock],
          [playerMock, enemyMock, playerMock],
          [playerMock, playerMock, playerMock],
        ],
        user: { x: 0, y: 0 },
        range: 100,
        getAOE: crossAOEMock,
        targetting: 'unit',
        targetAllies: true,
      })
    ).toEqual({ x: 2, y: 1 });
  });

  it(`should work with moves that change AOE depending on user position
       v
      ABB
      BBB
      .BB`, () => {
    expect(
      optimiseAOE({
        board: [
          [playerMock, undefined, enemyMock],
          [enemyMock, enemyMock, undefined],
          [enemyMock, undefined, undefined],
        ],
        user: { x: 0, y: 0 },
        range: 1,
        getAOE: directionLineAOEMock,
      })
    ).toEqual({ x: 1, y: 0 });
  });

  it(`should pick from the provided pool even if not optimal
      A B 
       B  
     >B B 
      if it only allows vertical movement
  `, () => {
    expect(
      optimiseAOE({
        board: [
          [playerMock, undefined, enemyMock],
          [undefined, enemyMock, undefined],
          [enemyMock, undefined, enemyMock],
        ],
        user: { x: 0, y: 0 },
        range: 99,
        getAOE: crossAOEMock,
        pool: [
          { x: 0, y: 0 },
          { x: 0, y: 1 },
          { x: 0, y: 2 },
        ],
      })
    ).toEqual({ x: 0, y: 2 });
  });

  it(`should still range when picking from a provided pool
      A B 
     > B  
      B B 
      if it only allows vertical movement
  `, () => {
    expect(
      optimiseAOE({
        board: [
          [playerMock, undefined, enemyMock],
          [undefined, enemyMock, undefined],
          [enemyMock, undefined, enemyMock],
        ],
        user: { x: 0, y: 0 },
        range: 1,
        getAOE: crossAOEMock,
        pool: [
          { x: 0, y: 0 },
          { x: 0, y: 1 },
          { x: 0, y: 2 },
        ],
      })
    ).toEqual({ x: 0, y: 0 });
  });
});

describe('getFacing', () => {
  it('should return facing properly in cardinal directions', () => {
    expect(getFacing({ x: 0, y: 0 }, { x: 0, y: -3 })).toEqual('up');
    expect(getFacing({ x: 0, y: 0 }, { x: 0, y: 3 })).toEqual('down');
    expect(getFacing({ x: 0, y: 0 }, { x: -3, y: 0 })).toEqual('left');
    expect(getFacing({ x: 0, y: 0 }, { x: 3, y: 0 })).toEqual('right');
  });

  it('should return facing at a semi-horizontal angle', () => {
    expect(getFacing({ x: 0, y: 0 }, { x: 2, y: 1 })).toEqual('right');
  });

  it('should return facing at a semi-vertical angle', () => {
    expect(getFacing({ x: 0, y: 0 }, { x: 1, y: 2 })).toEqual('down');
  });

  it('should return something valid at a full diagonal', () => {
    expect(['up', 'down', 'left', 'right']).toContain(
      getFacing({ x: 0, y: 0 }, { x: 1, y: 1 })
    );
  });
});
