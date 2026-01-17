import { CombatScene } from '../scenes/game/combat/combat.scene';
import { GameScene } from '../scenes/game/game.scene';

export const PhaserMock = {
  GameObjects: {
    GameObject: class {},
    Text: class {},
    Sprite: class {},
    Container: class {},
    Rectangle: class {},
    Image: class {},
    DOMElement: class {},
  },
  Scene: class {},
  Math: {
    Easing: {
      Quadratic: {
        In: () => {},
      },
    },
  },
  Animations: {
    Events: {
      ANIMATION_COMPLETE: 'animationcomplete',
    },
  },
  Display: {
    Color: {
      GetColor: () => 0,
    },
  },
  Input: {
    Events: {
      POINTER_OVER: 'pointerover',
      POINTER_OUT: 'pointerout',
    },
    Pointer: class {},
  },
  Tweens: {
    Events: {},
  },
  Scenes: {
    SHUTDOWN: 'shutdown',
  },
  Physics: {
    Arcade: {
      Sprite: class {},
    },
  },
};

export const GameSceneMock = {} as GameScene;

export const CombatSceneMock = {} as CombatScene;
