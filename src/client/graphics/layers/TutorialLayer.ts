import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { translateText } from "../../../client/Utils";
import { EventBus } from "../../../core/EventBus";
import { PlayerType } from "../../../core/game/Game";
import { GameView } from "../../../core/game/GameView";
import {
  flashist_logEventAnalytics,
  flashistConstants,
  FlashistFacade,
} from "../../flashist/FlashistFacade";
import { TUTORIAL_COMPLETED_KEY } from "../../TutorialStorage";
import { Layer } from "./Layer";

const ATTACK_TROOP_THRESHOLD = 100; // troops needed to show tooltip 2
const CITY_GOLD_COST = 125_000; // gold needed to show tooltip 3

@customElement("tutorial-layer")
export class TutorialLayer extends LitElement implements Layer {
  public game: GameView;
  public eventBus: EventBus;

  @state() private activeTooltip: 1 | 2 | 3 | 4 | null = null;

  private shownTooltips = [false, false, false, false];
  private initialNPCCount: number | null = null;
  private tutorialStartTime = Date.now();

  createRenderRoot() {
    return this;
  }

  tick() {
    const myPlayer = this.game.myPlayer();
    if (!myPlayer) return;

    // Track initial NPC count once spawn phase ends
    if (this.initialNPCCount === null && !this.game.inSpawnPhase()) {
      this.initialNPCCount = [...this.game.players()].filter(
        (p) => p.type() === PlayerType.Bot && p.isAlive(),
      ).length;
    }

    // Only trigger if no tooltip is currently active
    if (this.activeTooltip !== null) return;

    // Tooltip 1: player has spawned
    if (!this.shownTooltips[0] && myPlayer.hasSpawned()) {
      this.triggerTooltip(1);
      return;
    }
    // Tooltip 2: has enough troops to attack
    if (
      !this.shownTooltips[1] &&
      this.shownTooltips[0] &&
      myPlayer.troops() >= ATTACK_TROOP_THRESHOLD
    ) {
      this.triggerTooltip(2);
      return;
    }
    // Tooltip 3: has enough gold for a city
    if (
      !this.shownTooltips[2] &&
      this.shownTooltips[1] &&
      myPlayer.gold() >= CITY_GOLD_COST
    ) {
      this.triggerTooltip(3);
      return;
    }
    // Tooltip 4: first bot eliminated
    if (
      !this.shownTooltips[3] &&
      this.shownTooltips[2] &&
      this.initialNPCCount !== null
    ) {
      const alive = [...this.game.players()].filter(
        (p) => p.type() === PlayerType.Bot && p.isAlive(),
      ).length;
      if (alive < this.initialNPCCount) {
        this.triggerTooltip(4);
      }
    }
  }

  private triggerTooltip(n: 1 | 2 | 3 | 4) {
    this.shownTooltips[n - 1] = true;
    this.activeTooltip = n;
    flashist_logEventAnalytics(
      flashistConstants.analyticEvents[`TUTORIAL_TOOLTIP_SHOWN_${n}`],
    );
    this.requestUpdate();
  }

  private dismissTooltip() {
    this.activeTooltip = null;
    this.requestUpdate();
  }

  private skipTutorial() {
    const duration = Math.floor((Date.now() - this.tutorialStartTime) / 1000);
    flashist_logEventAnalytics(flashistConstants.analyticEvents.TUTORIAL_SKIPPED);
    flashist_logEventAnalytics(
      flashistConstants.analyticEvents.TUTORIAL_DURATION,
      duration,
    );
    localStorage.setItem(TUTORIAL_COMPLETED_KEY, "true");
    FlashistFacade.instance.changeHref(FlashistFacade.instance.rootPathname);
  }

  render() {
    return html`
      <style>
        .tutorial-skip {
          position: fixed;
          top: 12px;
          right: 12px;
          z-index: 10001;
          padding: 8px 16px;
          background: rgba(0, 0, 0, 0.6);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.4);
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          pointer-events: all;
          transition: background 0.2s;
        }
        .tutorial-skip:hover {
          background: rgba(0, 0, 0, 0.8);
        }
        .tutorial-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: all;
        }
        .tutorial-box {
          background: rgba(20, 20, 30, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          padding: 28px 32px;
          max-width: 380px;
          width: 90%;
          color: white;
          text-align: center;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
        }
        .tutorial-box p {
          font-size: 16px;
          line-height: 1.5;
          margin: 0 0 20px 0;
        }
        .tutorial-got-it {
          padding: 10px 28px;
          background: rgba(74, 158, 255, 0.8);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 15px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .tutorial-got-it:hover {
          background: rgba(74, 158, 255, 1);
        }
      </style>
      <button class="tutorial-skip" @click=${this.skipTutorial}>
        ${translateText("tutorial.skip")}
      </button>
      ${this.activeTooltip !== null
        ? html`
            <div class="tutorial-backdrop">
              <div class="tutorial-box">
                <p>${translateText(`tutorial.tooltip_${this.activeTooltip}`)}</p>
                <button class="tutorial-got-it" @click=${this.dismissTooltip}>
                  ${translateText("tutorial.got_it")}
                </button>
              </div>
            </div>
          `
        : html``}
    `;
  }

  renderLayer() {}
  shouldTransform(): boolean {
    return false;
  }
}
