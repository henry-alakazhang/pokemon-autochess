import { synergyData } from '../../core/game.model';
import { buyablePokemon, pokemonData } from '../../core/pokemon.model';
import { flatten, isDefined } from '../../helpers';
import { Button } from '../../objects/button.object';
import { Player } from '../../objects/player.object';
import { PokemonObject } from '../../objects/pokemon.object';
import { defaultStyle, titleStyle } from '../../objects/text.helpers';
import { MenuScene } from '../menu.scene';
import { Coords } from './combat/combat.helpers';
import {
  CombatEndEvent,
  CombatScene,
  CombatSceneData,
} from './combat/combat.scene';
import {
  BOARD_WIDTH,
  calculateBoardStrength,
  CELL_WIDTH,
  GameMode,
  getRandomNames,
  GRID_X,
  GRID_Y,
  NeutralRound,
  shuffle,
} from './game.helpers';
import { ShopPool } from './shop.helpers';
import { ShopScene, ShopSceneData } from './shop.scene';

// FIXME: scale this off the canvas width
/** X-coordinate of the center of the sideboard */
const SIDEBOARD_X = 450;
/** Y-coordinate of the center of the sideboard */
const SIDEBOARD_Y = 600;
const CELL_COUNT = 8;

// FIXME: scale this off the canvas width
/** X-coordinate of the center of the shop */
const SHOP_X = 450;
/** Y-coordinate of the center of the shop */
const SHOP_Y = 175;

export type PokemonLocation =
  | { location: 'mainboard'; coords: Coords }
  | { location: 'sideboard'; index: number };

/**
 * Returns the graphical x and y coordinates for a spot in the sideboard.
 */
export function getCoordinatesForSideboardIndex(i: number): Coords {
  return {
    x: SIDEBOARD_X + CELL_WIDTH * (i - (CELL_COUNT - 1) / 2),
    y: SIDEBOARD_Y,
  };
}

/**
 * Returns the mainboard x and y coordinates for a graphical coordinate,
 * or `undefined` if the point isn't on the grid
 */
export function getMainboardLocationForCoordinates({
  x,
  y,
}: Coords): PokemonLocation | undefined {
  // the distance to the top of the grid
  const gridStartX = GRID_X - (CELL_WIDTH * BOARD_WIDTH) / 2;
  // the distance to the left edge of the grid
  const gridStartY = GRID_Y - (CELL_WIDTH * BOARD_WIDTH) / 2;
  const gridx = (x - gridStartX) / CELL_WIDTH;
  const gridy = (y - gridStartY) / CELL_WIDTH;

  if (
    gridx < 0 ||
    gridx >= BOARD_WIDTH ||
    gridy < Math.ceil(BOARD_WIDTH / 2) || // you can only put Pokemon in the bottom half of the grid
    gridy >= BOARD_WIDTH
  ) {
    return undefined;
  }

  return {
    location: 'mainboard' as const,
    coords: {
      x: Math.floor(gridx),
      y: Math.floor(gridy),
    },
  };
}

/**
 * Returns the sideboard index for a graphical coordinate,
 * or `undefined` if the point isn't within the sideboard
 */
export function getSideboardLocationForCoordinates({
  x,
  y,
}: Coords): PokemonLocation | undefined {
  // the distance to the top of the sideboard
  if (y < SIDEBOARD_Y - CELL_WIDTH / 2 || y > SIDEBOARD_Y + CELL_WIDTH / 2) {
    return undefined;
  }

  // the distance to the left edge of the sideboard
  const sideboardStartX = SIDEBOARD_X - (CELL_WIDTH * CELL_COUNT) / 2;
  const index = (x - sideboardStartX) / CELL_WIDTH;
  if (index < 0 || index >= CELL_COUNT) {
    return undefined;
  }
  return {
    location: 'sideboard' as const,
    index: Math.floor(index),
  };
}

/**
 * The main game scene.
 *
 * Keeps track of player state that persists through a whole game session,
 * including board layout, sideboard contents and shop contents.
 */
export class GameScene extends Phaser.Scene {
  static readonly KEY = 'GameScene';

  /**
   * The pool of available Pokemon to buy in the shop
   *
   * EVERY POOL IN THE GAME is a reference to this object.
   */
  private pool: ShopPool;

  private gameMode: GameMode;
  /** Current stage, zero-indexed */
  private currentStage: number;
  /** Current round within a stage. This is just a number (ie. 1-indexed) */
  private currentRound: number;

  players: Player[];

  nextRoundButton: Button;
  shopButton: Button;
  humanPlayer: Player;
  currentVisiblePlayer: Player;
  playerInfoText: Phaser.GameObjects.Text;
  sellArea: Phaser.GameObjects.Shape;
  sellText: Phaser.GameObjects.Text;
  currentRoundText: Phaser.GameObjects.Text;
  boardLimitText: Phaser.GameObjects.Text;
  movePokemonListener: Function;

  /** A reference to the currently selected Pokemon */
  selectedPokemon?: PokemonObject;

  /** The grid used to display team composition during the downtime phase */
  prepGrid: Phaser.GameObjects.Grid;
  /** A background for highlighting the valid regions to put Pokemon in */
  prepGridHighlight: Phaser.GameObjects.Shape;

  shop: ShopScene;

  constructor() {
    super({
      key: GameScene.KEY,
    });
  }

  create(mode: GameMode) {
    this.prepGrid = this.add.grid(
      GRID_X, // center x
      GRID_Y, // center y
      CELL_WIDTH * BOARD_WIDTH, // total width
      CELL_WIDTH * BOARD_WIDTH, // total height
      CELL_WIDTH, // cell width
      CELL_WIDTH, // cell height
      0, // fill: none
      0, // fill alpha: transparent
      0xffaa00, // lines: yellow
      1 // line alpha: solid
    );

    this.add.grid(
      SIDEBOARD_X, // center x
      SIDEBOARD_Y, // center y
      CELL_WIDTH * CELL_COUNT, // total width
      CELL_WIDTH, // total height
      CELL_WIDTH, // cell width
      CELL_WIDTH, // cell height
      0, // fill: none
      0, // fill alpha: transparent
      0xffaa00, // lines: yellow
      1 // line alpha: solid
    );

    this.prepGridHighlight = this.add
      .rectangle(
        GRID_X,
        GRID_Y,
        // width: stretches across all columns
        CELL_WIDTH * BOARD_WIDTH,
        // height: half the grid rows
        (CELL_WIDTH * BOARD_WIDTH) / 2,
        // color: ligher colour highlight
        0xffffff,
        // alpha: mostly transparent
        0.2
      )
      // set y-origin to be 0
      // this lets us use the grid x/y as the origin point,
      // and have it cover the bottom of the grid.
      // needs less math.
      .setOrigin(0.5, 0)
      .setZ(-1)
      .setVisible(false);

    this.gameMode = mode;
    this.pool = new ShopPool(mode.shopRates, buyablePokemon, pokemonData);
    this.currentStage = 0;
    this.currentRound = 1;
    this.currentRoundText = this.add
      .text(
        this.game.canvas.width / 2,
        30,
        `Stage ${this.currentStage + 1}: ${this.currentRound} / ${
          this.gameMode.stages[this.currentStage].rounds
        }`,
        defaultStyle
      )
      .setFontSize(20)
      .setOrigin(0.5, 0);

    this.players = ['You', ...getRandomNames(7)].map((name, index) =>
      this.add.existing(
        new Player(this, name, 720, 100 + 30 * index, {
          pool: this.pool,
          isHumanPlayer: index === 0,
          initialLevel: this.gameMode.stages[this.currentStage].autolevel,
          startingGold: this.gameMode.startingGold,
        })
      )
    );
    this.players.forEach(player => {
      player.on(Player.Events.SELECT, () => {
        this.watchPlayer(player);
      });
    });
    // players[0] is always the human player
    [this.humanPlayer] = this.players;
    this.currentVisiblePlayer = this.humanPlayer;

    this.playerInfoText = this.add.text(
      50,
      100,
      `Level: ${this.currentVisiblePlayer.level}\nGold: ${this.currentVisiblePlayer.gold}`,
      defaultStyle
    );
    this.boardLimitText = this.add
      .text(GRID_X, GRID_Y + 70, '', {
        ...titleStyle,
        fontSize: '72px',
        // dark dark grey
        color: '#222',
      })
      // cenetered on the board
      .setOrigin(0.5, 0.5)
      .setDepth(-1);
    this.updateBoardLimit();

    this.scene.launch(ShopScene.KEY, {
      gameMode: this.gameMode,
      player: this.humanPlayer,
      pool: this.pool,
    } as ShopSceneData);
    this.shop = this.scene.get(ShopScene.KEY) as ShopScene;
    this.shop.setCentre({ x: SHOP_X, y: SHOP_Y });

    this.movePokemonListener = (event: Phaser.Input.Pointer) => {
      if (event.leftButtonDown()) {
        if (!this.selectedPokemon) {
          this.selectPokemon({ x: event.downX, y: event.downY });
        } else {
          this.movePokemon({ x: event.downX, y: event.downY });
        }
      }
    };
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.movePokemonListener);

    this.input.keyboard.on('keydown-SPACE', () => {
      this.toggleShop();
    });

    this.shopButton = this.add.existing(
      new Button(this, this.game.canvas.width / 2, 660, 'Shop')
    );
    this.shopButton.on(Button.Events.CLICK, () => this.toggleShop());

    this.sellArea = this.add
      .rectangle(
        760, // centre x
        450, // centre y
        150, // width
        250, // height
        0xff0000, // color: red
        0.2 // alpha: mostly transparent
      )
      .setVisible(false);

    this.sellArea
      .setInteractive()
      .on(Phaser.Input.Events.POINTER_DOWN, (event: Phaser.Input.Pointer) => {
        if (event.leftButtonDown()) {
          this.humanPlayer.sellPokemon(this.selectedPokemon as PokemonObject);
          this.updateBoardLimit();
        }
      });

    this.nextRoundButton = new Button(this, SIDEBOARD_X, 530, 'Next Round');
    this.nextRoundButton.on(Button.Events.CLICK, () => {
      this.nextRoundButton.setVisible(false).setActive(false);
      this.startCombat();
    });
    this.add.existing(this.nextRoundButton);
  }

  update() {
    this.currentRoundText.setText(
      `Stage ${this.currentStage + 1}: [${this.currentRound}] / ${
        this.gameMode.stages[this.currentStage].rounds
      }`
    );
    this.playerInfoText.setText(
      `Level: ${this.currentVisiblePlayer.level}\nGold: ${this.currentVisiblePlayer.gold}`
    );

    // Display players in order without reordering array.
    [...this.players]
      .sort((a, b) => b.hp - a.hp)
      .forEach((playerObj, index) => {
        playerObj.update();
        playerObj.updatePosition(720, 100 + 30 * index);
      });

    // show the "valid range" highlight if a Pokemon is selected
    this.prepGridHighlight.setVisible(!!this.selectedPokemon);
    this.sellArea.setVisible(!!this.selectedPokemon);
  }

  destroy() {
    this.scene.stop(ShopScene.KEY);
  }

  startCombat() {
    // switch view back to own board
    this.watchPlayer(this.humanPlayer);
    // take AI player turns
    this.players.forEach(player => {
      if (player !== this.humanPlayer) {
        player.takeEnemyTurn();
      }
    });

    // slightly hacky: trigger a click event far away
    // this deselects Pokemon, closes any info cards and so on.
    this.events.emit(Phaser.Input.Events.POINTER_DOWN, { x: 0, y: 0 });
    // hide all the prep-only stuff
    this.currentVisiblePlayer.mainboard.forEach(col =>
      col.forEach(pokemon => pokemon?.setVisible(false))
    );
    this.boardLimitText.setVisible(false);
    this.prepGrid.setVisible(false);
    // TODO: allow interacting with sideboard/shop during combat
    this.input.enabled = false;
    // hide the shop
    if (!this.scene.isPaused(ShopScene.KEY)) {
      this.scene.setVisible(false, ShopScene.KEY);
      this.scene.pause(ShopScene.KEY);
    }

    const neutralRound = this.gameMode.stages[this.currentStage]
      .neutralRounds?.[this.currentRound];
    if (neutralRound) {
      // if there's a neutral round, create the neutral round.
      const opponent = this.generateNeutralPlayer(neutralRound);
      this.scene.launch(CombatScene.KEY, {
        player: this.humanPlayer,
        enemy: opponent,
      });
      this.scene
        .get(CombatScene.KEY)
        .events.once(
          CombatScene.Events.COMBAT_END,
          ({ winner }: CombatEndEvent) => {
            this.handleCombatResult(this.humanPlayer, winner === 'player');
            this.players.forEach(
              // all the AIs win 100%
              player =>
                player !== this.humanPlayer &&
                this.handleCombatResult(player, true)
            );
          }
        );
      this.scene
        .get(CombatScene.KEY)
        .events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
          // clean up fake neutral opponent
          flatten(opponent.mainboard).forEach(pokemon => pokemon?.destroy());
          opponent.destroy();
          this.startDowntime();
        });
      return;
    }

    const pairings = this.matchmakePairings();
    console.log('PAIRINGS', pairings);
    pairings.forEach(pairing => {
      let [player1, player2] = [pairing[0], pairing[1]];
      // neither is a real player: skip
      if (!isDefined(player1) && !isDefined(player2)) {
        return;
      }

      // force human player to be player 1
      if (player2 === this.humanPlayer) {
        [player1, player2] = [player2, player1];
      }

      // if either are undefined, set them to random ghost players
      // Ghost players use another player's board and name,
      // but don't cause that player to take damage if they lose.
      const pair1 = {
        isReal: isDefined(player1),
        player: isDefined(player1)
          ? player1
          : this.players[Math.floor(Math.random() * this.players.length)],
      };
      const pair2 = {
        isReal: isDefined(player2),
        player: isDefined(player2)
          ? player2
          : this.players[Math.floor(Math.random() * this.players.length)],
      };

      if (pair1.player === this.humanPlayer) {
        // human player: show combat
        this.scene.launch(CombatScene.KEY, {
          player: pair1.player,
          enemy: pair2.player,
        } as CombatSceneData);
        this.scene
          .get(CombatScene.KEY)
          .events.once(
            CombatScene.Events.COMBAT_END,
            ({ winner }: CombatEndEvent) => {
              this.handleCombatResult(pair1.player, winner === 'player');
              // apply state to player 2 if they're a real player
              if (pair2.isReal) {
                this.handleCombatResult(pair2.player, winner === 'enemy');
              }
            }
          );
        this.scene
          .get(CombatScene.KEY)
          .events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.startDowntime();
          });
      } else {
        // AI players: after combat ends, determine a winner based on how good their board
        this.scene
          .get(CombatScene.KEY)
          .events.once(CombatScene.Events.COMBAT_END, () => {
            const won =
              calculateBoardStrength(pair1.player) >
              calculateBoardStrength(pair2.player);
            // apply to whichever players are real
            if (pair1.isReal) {
              this.handleCombatResult(pair1.player, won);
            }
            if (pair2.isReal) {
              this.handleCombatResult(pair2.player, !won);
            }
          });
      }
    });
  }

  // TODO: should this all just live inside Player?
  handleCombatResult(player: Player, won: boolean) {
    player.synergies.forEach(synergy => {
      synergyData[synergy.category].onRoundEnd?.({
        scene: this,
        board: player.mainboard,
        player,
        won,
        count: synergy.count,
      });
    });
    player.battleResult(won, this.gameMode.stages[this.currentStage]);
  }

  startDowntime() {
    // remove any dead players
    // note: disabling the player is handled by the player object
    this.players = this.players.filter(player => player.hp > 0);

    this.currentRound += 1;
    if (this.currentRound > this.gameMode.stages[this.currentStage].rounds) {
      this.currentRound = 1;
      this.currentStage++;

      // if game mode includes autolevelling, autolevel them
      const newLevel = this.gameMode.stages[this.currentStage].autolevel;
      if (newLevel) {
        this.players.forEach(player => {
          player.level = newLevel;
        });
      }
    }

    this.shop.reroll();
    // show all the prep-only stuff
    this.currentVisiblePlayer.mainboard.forEach(col =>
      col.forEach(pokemon => pokemon?.setVisible(true))
    );
    this.prepGrid.setVisible(true);
    this.updateBoardLimit();
    this.input.enabled = true;

    this.nextRoundButton.setActive(true).setVisible(true);

    if (this.humanPlayer.hp <= 0) {
      this.add
        .text(GRID_X, GRID_Y, `YOU PLACED #${this.players.length}`, {
          ...defaultStyle,
          backgroundColor: '#000',
          fontSize: '40px',
        })
        .setDepth(200)
        .setOrigin(0.5, 0.5);
      this.endGame();
      return;
    }
    if (this.players.length <= 1) {
      this.add
        .text(GRID_X, GRID_Y, `YOU WIN!!`, {
          ...defaultStyle,
          backgroundColor: '#242',
          fontSize: '40px',
        })
        .setDepth(200)
        .setOrigin(0.5, 0.5);
      this.endGame();
    }
  }

  endGame() {
    // disable next round button and turn it into an EXIT button
    this.nextRoundButton
      .setText('Exit game')
      .off(Button.Events.CLICK)
      .once(Button.Events.CLICK, () => {
        this.scene.start(MenuScene.KEY);
      });
    // disable moving Pokemon on/off the board
    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.movePokemonListener);
    // disable the shop
    this.shopButton.setVisible(false);
    this.scene.stop(this.shop);
    // can still examine board, look at enemy boards, take screenshots etc.
  }

  watchPlayer(player: Player) {
    this.currentVisiblePlayer.setVisible(false);
    player.setVisible(true);
    this.currentVisiblePlayer = player;

    this.updateBoardLimit();
  }

  /**
   * Picks the Pokemon at a given location (if it exists) and sets it as the selected Pokemon
   */
  selectPokemon(clickCoords: Coords) {
    const select =
      getMainboardLocationForCoordinates(clickCoords) ||
      getSideboardLocationForCoordinates(clickCoords);

    const pokemon = this.humanPlayer.getPokemonAtLocation(select);
    if (!pokemon) {
      return;
    }

    this.selectedPokemon = pokemon.toggleOutline();
  }

  /**
   * Moves the currently selected Pokemon to the location determined by the `Pointer` event.
   * If no valid location is specified, the Pokemon is deselected.
   */
  movePokemon(clickCoords: Coords) {
    const { selectedPokemon } = this;
    if (!selectedPokemon) {
      return;
    }

    // deselect Pokemon even if we don't move it
    selectedPokemon.toggleOutline();
    this.selectedPokemon = undefined;

    const newLocation =
      getMainboardLocationForCoordinates(clickCoords) ||
      getSideboardLocationForCoordinates(clickCoords);
    if (!newLocation) {
      return;
    }

    this.humanPlayer.movePokemon(selectedPokemon, newLocation);
    this.updateBoardLimit();
  }

  // Update the big background text on the board saying how many units can still be placed
  // Only show it for players when their board can still fit more units on it
  updateBoardLimit() {
    // looking at someone else's board, hide
    if (this.currentVisiblePlayer !== this.humanPlayer) {
      this.boardLimitText.setVisible(false);
      return;
    }

    if (!this.humanPlayer.canAddPokemonToMainboard()) {
      // can't add more Pokemon: show faintly
      this.boardLimitText.setAlpha(0.2);
    } else {
      // can add more Pokemon: show more prominently
      this.boardLimitText.setAlpha(0.4);
    }

    this.boardLimitText
      .setVisible(true)
      .setText(
        `${
          flatten(this.currentVisiblePlayer.mainboard).filter(v => isDefined(v))
            .length
        }/${this.currentVisiblePlayer.level}`
      );
  }

  /**
   * Opens or closes the shop
   */
  toggleShop() {
    if (!this.scene.isPaused(ShopScene.KEY)) {
      this.scene.pause(ShopScene.KEY);
      this.scene.setVisible(false, ShopScene.KEY);
    } else {
      this.scene.resume(ShopScene.KEY);
      this.scene.setVisible(true, ShopScene.KEY);
    }
  }

  /**
   * Randomise pairings and return a list of pairs [index, index]
   *
   * If there aren't enough players, some of them will be undefined
   */
  matchmakePairings(): [Player | undefined, Player | undefined][] {
    // literally just shuffle it and return pairs
    // TODO: prevent the same players playing too often.
    const order = shuffle(this.players.map((_, index) => index)).map(
      index => this.players[index]
    );

    return [
      [order[0], order[1]],
      [order[2], order[3]],
      [order[4], order[5]],
      [order[6], order[7]],
    ];
  }

  generateNeutralPlayer(round: NeutralRound): Player {
    const player = new Player(this, 'Wild Pokemon', -100, -100, {
      pool: this.pool,
      isHumanPlayer: false,
      initialLevel: round.length,
    });
    round.forEach(pokemon => {
      player.addPokemonToSideboard(pokemon.name);
      player.movePokemon(
        // whatever lol, we just put it there.
        // eslint-disable-next-line
        player.sideboard[0]!,
        { location: 'mainboard', coords: pokemon.location }
      );
    });
    return player;
  }
}
