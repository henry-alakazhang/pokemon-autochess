import * as expect from 'expect';
import { interpolateLineAOE } from './math.helpers';

describe('math helpers', () => {
  describe('line interpolation', () => {
    it(`should interpolate a point as a point`, () => {
      expect(interpolateLineAOE({ x: 0, y: 0 }, { x: 0, y: 0 })).toEqual([
        { x: 0, y: 0 },
      ]);
    });

    it(`should interpolate a short horizontal line`, () => {
      expect(interpolateLineAOE({ x: 0, y: 0 }, { x: 1, y: 0 })).toEqual([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ]);
    });

    it(`should interpolate a short vertical line`, () => {
      expect(interpolateLineAOE({ x: 0, y: 0 }, { x: 0, y: 1 })).toEqual([
        { x: 0, y: 0 },
        { x: 0, y: 1 },
      ]);
    });

    it(`should interpolate a horizontal line correctly
        ...
        ...
        A*B`, () => {
      expect(interpolateLineAOE({ x: 0, y: 0 }, { x: 2, y: 0 })).toEqual([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 0 },
      ]);
    });

    it(`should interpolate a vertical line correctly
        B..
        *..
        A..`, () => {
      expect(interpolateLineAOE({ x: 0, y: 0 }, { x: 0, y: 2 })).toEqual([
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: 2 },
      ]);
    });

    it(`should interpolate a diagonal line correctly
        ..B
        .*.
        A..`, () => {
      expect(interpolateLineAOE({ x: 0, y: 0 }, { x: 2, y: 2 })).toEqual([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 2 },
      ]);
    });

    it(`should interpolate a non-steep line
        ....
        ..*B
        A*..`, () => {
      expect(interpolateLineAOE({ x: 0, y: 0 }, { x: 3, y: 1 })).toEqual([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
      ]);
    });

    it(`should interpolate a steep line
        .B.
        .*.
        *..
        A..`, () => {
      expect(interpolateLineAOE({ x: 0, y: 0 }, { x: 3, y: 1 })).toEqual([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
      ]);
    });

    it(`should interpolate an inverted horizontal line
        ....
        ..*A
        B*..`, () => {
      expect(interpolateLineAOE({ x: 3, y: 1 }, { x: 0, y: 0 })).toEqual([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
      ]);
    });

    it(`should interpolate an inverted vertical line
        .B.
        .*.
        *..
        A..`, () => {
      expect(interpolateLineAOE({ x: 3, y: 1 }, { x: 0, y: 0 })).toEqual([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
      ]);
    });

    it(`should interpolate a horizontal line away from the origin
        .....
        .A*..
        ...*B
        .....`, () => {
      expect(interpolateLineAOE({ x: 1, y: 2 }, { x: 4, y: 1 })).toEqual([
        { x: 1, y: 2 },
        { x: 2, y: 2 },
        { x: 3, y: 1 },
        { x: 4, y: 1 },
      ]);
    });

    it(`should interpolate a vertical line away from the origin
        ...B.
        ..*..
        ..*..
        .A...
        .....`, () => {
      expect(interpolateLineAOE({ x: 1, y: 1 }, { x: 3, y: 4 })).toEqual([
        { x: 1, y: 1 },
        { x: 2, y: 2 },
        { x: 2, y: 3 },
        { x: 3, y: 4 },
      ]);
    });

    it(`should interpolate a wide straight line
        .....
        .****
        .A**B
        .****`, () => {
      expect(
        interpolateLineAOE({ x: 1, y: 1 }, { x: 4, y: 1 }, { width: 3 })
      ).toEqual([
        { x: 1, y: 1 },
        { x: 1, y: 2 },
        { x: 1, y: 0 },
        { x: 2, y: 1 },
        { x: 2, y: 2 },
        { x: 2, y: 0 },
        { x: 3, y: 1 },
        { x: 3, y: 2 },
        { x: 3, y: 0 },
        { x: 4, y: 1 },
        { x: 4, y: 2 },
        { x: 4, y: 0 },
      ]);
    });

    it(`should interpolate a wide horizontal-angled line
        ...**
        .***B
        .A***
        .**.`, () => {
      expect(
        interpolateLineAOE({ x: 1, y: 1 }, { x: 4, y: 2 }, { width: 3 })
      ).toEqual([
        { x: 1, y: 1 },
        { x: 1, y: 2 },
        { x: 1, y: 0 },
        { x: 2, y: 1 },
        { x: 2, y: 2 },
        { x: 2, y: 0 },
        { x: 3, y: 2 },
        { x: 3, y: 3 },
        { x: 3, y: 1 },
        { x: 4, y: 2 },
        { x: 4, y: 3 },
        { x: 4, y: 1 },
      ]);
    });

    it(`should interpolate a wide vertical-angled line
        .*B*.
        .***.
        *A*..
        .....`, () => {
      expect(
        interpolateLineAOE({ x: 1, y: 1 }, { x: 2, y: 3 }, { width: 3 })
      ).toEqual([
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 0, y: 1 },
        { x: 2, y: 2 },
        { x: 3, y: 2 },
        { x: 1, y: 2 },
        { x: 2, y: 3 },
        { x: 3, y: 3 },
        { x: 1, y: 3 },
      ]);
    });
  });
});
