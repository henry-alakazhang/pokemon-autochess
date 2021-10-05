import { Move } from '../core/move.model';
import { Pokemon } from '../core/pokemon.model';
import { getBaseTexture } from '../helpers';
import {
  getDamageReduction,
  getTurnDelay,
} from '../scenes/game/combat/combat.helpers';

/**
 * Returns whether the move does physical damage, special damage or neither
 */
function getMoveType(move?: Move): 'physical' | 'special' | 'other' {
  if (move?.type === 'active') {
    if (move?.defenseStat === 'defense') {
      return 'physical';
    }

    if (move?.defenseStat === 'specDefense') {
      return 'special';
    }
  }

  return 'other';
}

/**
 * A game object for displaying Pokemon info.
 * Shows a Pokemon's stats + move details.
 * Implemented via DOM Element.
 *
 * FIXME: Load HTML file from somewhere proper
 * FIXME: Styles should be global or something and not re-inlined every time
 * FIXME: Probably should only load once ever and just adjust fields for performance reasons
 */
export class PokemonCard extends Phaser.GameObjects.DOMElement {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private pokemon: Pokemon
  ) {
    super(scene, x, y, 'div');
    this.setOrigin(0, 1);

    // DIY react LMAO
    const background = '#ddeedd';
    const highlight = '#bbccbb';
    const border = '2px solid green';

    const moveType = getMoveType(pokemon.move);

    this.createFromHTML(
      `
      <style>
        .PokemonCard {
          font-family: 'Anonymous Pro';
          border: ${border};
          border-radius: 10px;
          background-color: ${background};
          max-width: 300px;
          /* maintain border-radius over scrollbar */
          overflow: hidden;
          display: grid;
          grid-template:
            "pokemon . stats" 120px
            "moveTitle . stats" 20px
            "move move move" 55px 
            / 198px 2px 100px;
        }
        
        .PokemonDetails {
          grid-area: pokemon;
          display: grid;
          grid-template:
            "name name stage" 20px
            "attack . ." 5px
            "attack sprite sprite" 10px
            "types sprite sprite" 70px
            "types . ." 5px
            / 75px 12fr 4fr;
          padding: 5px;
        }
        
        .PokemonName {
          grid-area: name;
          font-weight: 700;
        }
        
        .PokemonStage {
          grid-area: stage;
        }
        
        .PokemonSprite {
          grid-area: sprite;
          /* center */
          margin:auto;
          /*
            Crop the spritesheet to just the first sprite
            FIXME: get specialised art for this
          */
          width: 64px;
          height: 64px;
          overflow: hidden;
        }
        
        .PokemonTypes {
          grid-area: types;
          display: flex;
          flex-direction: column;
          justify-content: end;
        }

        .PokemonAttackDetails {
          grid-area: attack;
        }

        .DamageTypeIcon {
          vertical-align: text-top;
          height: 15px;
        }
        
        .VerticalDivider {
          grid-column: 2;
          grid-row: 1 / span 2;
          border-left: ${border};
        }
        
        .HorizontalDivider {
          grid-row: 2;
          grid-column: 1 / span 3;
          border-bottom:${border};
        }
        
        .Stats {
          grid-area: stats;
          font-size: 14px;
          border-collapse: collapse;
        }
        
        .MoveTitle {
          grid-area: moveTitle;
          margin-bottom: -3px;
        }
        
        .MoveTitleText {
          /* apply bg here to cover the divider line */
          background-color: ${background};
          border: ${border};
          border-radius: 5px;
          margin-left: 3px;
          padding: 2px;
        }
        
        .MoveDetails {
          grid-area: move;
          padding: 2px 5px;
          font-size: 14px;
          overflow-y: scroll;
          /* FIXME: Apply some styles on Chrome too */
          scrollbar-width: thin;
          scrollbar-color: ${highlight} ${background};
        }
        
        tr:nth-child(even) {
          background-color: ${highlight};
        }
        
        /* spacing */
        td:nth-child(1), td:nth-child(4) {
          width: 5px;
        }
        
        td:nth-child(3) {
          text-align: right;
        }
      </style>
      <!-- click handlers prevent accidentally clicking through the card -->
      <div
        class="PokemonCard"
        onmousedown="event.stopPropagation()"
        onmouseup="event.stopPropagation()"
        onclick="event.stopPropagation()"
      >
        <div class="PokemonDetails">
          <div class="PokemonName">${this.pokemon.displayName}</div>
          <div class="PokemonStage">${this.pokemon.stage}*</div>
          <div class="PokemonSprite">
            <img src="assets/pokemon/${getBaseTexture(
              this.pokemon.name
            )}.png" />
          </div>
          <div class="PokemonTypes">
            ${this.pokemon.categories
              .map(
                category =>
                  `<img width="75px" src="assets/fx/types/${category}.png"></img>`
              )
              .join('')}
          </div>
          <div class="PokemonAttackDetails" title="Basic attack uses ${
            this.pokemon.basicAttack.stat
          } stat and has range ${this.pokemon.basicAttack.range}">
            <img class="DamageTypeIcon" src="assets/fx/${
              this.pokemon.basicAttack.stat === 'attack'
                ? 'damage-physical'
                : 'damage-special'
            }.png" />${this.pokemon.basicAttack.range}
          </div>
          <br />
        </div>
        <div class="VerticalDivider"></div>
        <div class="HorizontalDivider"></div>
        <table class="Stats">
          <tr>
            <td></td>
            <td>Max HP</td>
            <td>${this.pokemon.maxHP}</td>
            <td></td>
          </tr>
          <tr>
            <td></td>
            <td>PP</td>
            <td>${
              this.pokemon.move?.type === 'active'
                ? `${this.pokemon.move.startingPP}/${this.pokemon.move.cost}`
                : '-'
            }</td>
            <td></td>
          </tr>
          <tr>
            <td></td>
            <td>Attack</td>
            <td>${this.pokemon.attack}</td>
            <td></td>
          </tr>
          <tr title="${Math.round(
            getDamageReduction(this.pokemon.defense) * 100
          )}% damage reduction">
            <td></td>
            <td>Defense</td>
            <td>${this.pokemon.defense}</td>
            <td></td>
          </tr>
          <tr>
            <td></td>
            <td>Sp. Atk</td>
            <td>${this.pokemon.specAttack}</td>
            <td></td>
          </tr>
          <tr title="${Math.round(
            getDamageReduction(this.pokemon.specDefense) * 100
          )}% damage reduction">
            <td></td>
            <td>Sp. Def</td>
            <td>${this.pokemon.specDefense}</td>
            <td></td>
          </tr>
          <tr title="${(1000 / getTurnDelay(this.pokemon)).toFixed(
            2
          )} attacks per second">
            <td></td>
            <td>Speed</td>
            <td>${this.pokemon.speed}</td>
            <td></td>
          </tr>
        </table>
        <div class="MoveTitle">
          <span class="MoveTitleText">
            <strong>${this.pokemon.move?.displayName}</strong>
            <img class="DamageTypeIcon" src="assets/fx/damage-${moveType}.png" />
          </span>
        </div>
        <div class="MoveDetails">
          ${this.pokemon.move?.description.replace(
            /{{user}}/g,
            this.pokemon.displayName
          )}
        </div>
      </div>
      `
    );
    this.fitToScreen();
  }

  setPosition(x: number, y: number): typeof this {
    super.setPosition(x, y);
    this.fitToScreen();
    return this;
  }

  private fitToScreen() {
    // default above and to the right of the pokemon
    let originX = 0;
    let originY = 1;
    if (this.x + 300 >= this.parent.clientWidth) {
      // if would be clipped by the edge of the canvas, flip origin
      originX = 1;
    }
    if (this.y < 200) {
      // if would be clipped by the top of the canvas, flip origin
      originY = 0;
    }

    this.setOrigin(originX, originY);
  }
}
