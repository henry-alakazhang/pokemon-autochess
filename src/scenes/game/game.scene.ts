import { synergyData } from '../../core/game.model';
import { buyablePokemon, pokemonData } from '../../core/pokemon.model';
import { flatten } from '../../helpers';
import { Button } from '../../objects/button.object';
import { Player } from '../../objects/player.object';
import { PokemonObject } from '../../objects/pokemon.object';
import { defaultStyle } from '../../objects/text.helpers';
import { MenuScene } from '../menu.scene';
import { Coords } from './combat/combat.helpers';
import {
  CombatEndEvent,
  CombatScene,
  CombatSceneData,
} from './combat/combat.scene';
import {
  BOARD_WIDTH,
  CELL_WIDTH,
  GameMode,
  getRandomNames,
  GRID_X,
  GRID_Y,
  NeutralRound,
  shuffle,
} from './game.helpers';
import { ShopPool } from './shop.helpers';
import { ShopScene } from './shop.scene';

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

  /* TEMPORARY JUNK */
  nextRoundButton: Button;
  shopButton: Phaser.GameObjects.GameObject;
  humanPlayer: Player;
  currentVisiblePlayer: Player;
  playerInfoText: Phaser.GameObjects.Text;
  sellArea: Phaser.GameObjects.Shape;
  sellText: Phaser.GameObjects.Text;
  currentRoundText: Phaser.GameObjects.Text;
  /* END TEMPORARY JUNK */

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
        `Round ${this.currentStage + 1}-${this.currentRound}`,
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

    this.scene.launch(ShopScene.KEY, {
      player: this.humanPlayer,
      pool: this.pool,
    });
    this.shop = this.scene.get(ShopScene.KEY) as ShopScene;
    this.shop.setCentre({ x: SHOP_X, y: SHOP_Y });

    this.input.on(
      Phaser.Input.Events.POINTER_DOWN,
      (event: Phaser.Input.Pointer) => {
        if (event.leftButtonDown()) {
          if (!this.selectedPokemon) {
            this.selectPokemon({ x: event.downX, y: event.downY });
          } else {
            this.movePokemon({ x: event.downX, y: event.downY });
          }
        }
      }
    );

    this.input.keyboard.on('keydown-SPACE', () => {
      this.toggleShop();
    });

    this.shopButton = this.add.existing(
      new Button(this, this.game.canvas.width / 2, 660, 'Shop')
    );
    this.shopButton.on(Button.Events.CLICK, () => this.toggleShop());

    this.sellArea = this.add
      .rectangle(
        750, // centre x
        470, // centre y
        150, // width
        300, // height
        0xff0000, // color: red
        0.2 // alpha: mostly transparent
      )
      .setVisible(false);

    this.sellArea
      .setInteractive()
      .on(Phaser.Input.Events.POINTER_DOWN, (event: Phaser.Input.Pointer) => {
        if (event.leftButtonDown()) {
          this.humanPlayer.sellPokemon(this.selectedPokemon as PokemonObject);
        }
      });

    this.nextRoundButton = new Button(this, SIDEBOARD_X, 525, 'Next Round');
    this.nextRoundButton.on(Button.Events.CLICK, () => {
      this.nextRoundButton.setVisible(false).setActive(false);
      this.startCombat();
    });
    this.add.existing(this.nextRoundButton);
  }

  update() {
    this.currentRoundText.setText(
      `Round ${this.currentStage + 1}-${this.currentRound}`
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
      // force human player to be player 1
      if (player2 === this.humanPlayer) {
        [player1, player2] = [player2, player1];
      }

      if (player1 === this.humanPlayer) {
        // human player: show combat
        this.scene.launch(CombatScene.KEY, {
          player: player1,
          enemy: player2,
        } as CombatSceneData);
        this.scene
          .get(CombatScene.KEY)
          .events.once(
            CombatScene.Events.COMBAT_END,
            ({ winner }: CombatEndEvent) => {
              this.handleCombatResult(player1, winner === 'player');
              this.handleCombatResult(player2, winner === 'enemy');
            }
          );
        this.scene
          .get(CombatScene.KEY)
          .events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.startDowntime();
          });
      } else {
        // AI players: after combat ends, randomly determine a winner
        this.scene
          .get(CombatScene.KEY)
          .events.once(CombatScene.Events.COMBAT_END, () => {
            const won = Math.random() < 0.5;
            this.handleCombatResult(player1, won);
            this.handleCombatResult(player2, !won);
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
    // TODO: handle other players losing
    if (this.humanPlayer.hp <= 0) {
      this.add
        .text(GRID_X, GRID_Y, `YOU LOSE`, {
          ...defaultStyle,
          backgroundColor: '#000',
          fontSize: '40px',
        })
        .setDepth(200)
        .setOrigin(0.5, 0.5);
      this.time.addEvent({
        callback: () => {
          this.scene.start(MenuScene.KEY);
        },
        delay: 2000,
      });
      return;
    }

    // other players that are still alive
    const remainingPlayers = this.players.filter(
      player => player !== this.humanPlayer && player.hp > 0
    );
    if (remainingPlayers.length <= 0) {
      this.add
        .text(GRID_X, GRID_Y, `YOU WIN!!`, {
          ...defaultStyle,
          backgroundColor: '#242',
          fontSize: '40px',
        })
        .setDepth(200)
        .setOrigin(0.5, 0.5);
      this.time.addEvent({
        callback: () => {
          this.scene.start(MenuScene.KEY);
        },
        delay: 2000,
      });
      return;
    }

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
    this.input.enabled = true;

    this.nextRoundButton.setActive(true).setVisible(true);
  }

  watchPlayer(player: Player) {
    this.currentVisiblePlayer.setVisible(false);
    player.setVisible(true);
    this.currentVisiblePlayer = player;
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
   * Randomise pairings and return an index -> index mapping
   */
  matchmakePairings(): [Player, Player][] {
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
