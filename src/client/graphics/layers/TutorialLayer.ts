import { translateText } from "../../../client/Utils";
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

const SKIP_BUTTON_STYLE: Partial<CSSStyleDeclaration> = {
  position: "fixed",
  top: "12px",
  right: "12px",
  zIndex: "10001",
  padding: "8px 16px",
  background: "rgba(0, 0, 0, 0.6)",
  color: "white",
  border: "1px solid rgba(255, 255, 255, 0.4)",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "14px",
  pointerEvents: "all",
};

const BACKDROP_STYLE: Partial<CSSStyleDeclaration> = {
  position: "fixed",
  inset: "0",
  background: "rgba(0, 0, 0, 0.5)",
  zIndex: "10000",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  pointerEvents: "all",
};

const BOX_STYLE: Partial<CSSStyleDeclaration> = {
  background: "rgba(20, 20, 30, 0.9)",
  border: "1px solid rgba(255, 255, 255, 0.2)",
  borderRadius: "12px",
  padding: "28px 32px",
  maxWidth: "380px",
  width: "90%",
  color: "white",
  textAlign: "center",
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6)",
};

const TEXT_STYLE: Partial<CSSStyleDeclaration> = {
  fontSize: "16px",
  lineHeight: "1.5",
  margin: "0 0 20px 0",
};

const GOT_IT_STYLE: Partial<CSSStyleDeclaration> = {
  padding: "10px 28px",
  background: "rgba(74, 158, 255, 0.8)",
  color: "white",
  border: "none",
  borderRadius: "6px",
  fontSize: "15px",
  cursor: "pointer",
};

function applyStyles(el: HTMLElement, styles: Partial<CSSStyleDeclaration>) {
  Object.assign(el.style, styles);
}

export class TutorialLayer implements Layer {
  private skipButton: HTMLButtonElement | null = null;
  private tooltipBackdrop: HTMLDivElement | null = null;
  private activeTooltip: 1 | 2 | 3 | 4 | null = null;
  private shownTooltips = [false, false, false, false];
  private initialNPCCount: number | null = null;
  private tutorialStartTime = Date.now();

  constructor(private game: GameView) {}

  init() {
    // Hide the top-right game UI (settings/sidebar) so it doesn't overlap the skip button
    const topRight = document.getElementById("game-top-right");
    if (topRight) topRight.style.display = "none";

    const btn = document.createElement("button");
    btn.textContent = translateText("tutorial.skip");
    applyStyles(btn, SKIP_BUTTON_STYLE);
    btn.addEventListener("click", () => this.skipTutorial());
    document.body.appendChild(btn);
    this.skipButton = btn;
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

    if (!this.shownTooltips[0] && myPlayer.hasSpawned()) {
      this.triggerTooltip(1);
      return;
    }
    if (
      !this.shownTooltips[1] &&
      this.shownTooltips[0] &&
      myPlayer.troops() >= ATTACK_TROOP_THRESHOLD
    ) {
      this.triggerTooltip(2);
      return;
    }
    if (
      !this.shownTooltips[2] &&
      this.shownTooltips[1] &&
      myPlayer.gold() >= CITY_GOLD_COST
    ) {
      this.triggerTooltip(3);
      return;
    }
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
    this.showTooltipDOM(n);
  }

  private showTooltipDOM(n: 1 | 2 | 3 | 4) {
    const backdrop = document.createElement("div");
    applyStyles(backdrop, BACKDROP_STYLE);

    const box = document.createElement("div");
    applyStyles(box, BOX_STYLE);

    const text = document.createElement("p");
    text.textContent = translateText(`tutorial.tooltip_${n}`);
    applyStyles(text, TEXT_STYLE);

    const gotIt = document.createElement("button");
    gotIt.textContent = translateText("tutorial.got_it");
    applyStyles(gotIt, GOT_IT_STYLE);
    gotIt.addEventListener("click", () => this.dismissTooltip());

    box.appendChild(text);
    box.appendChild(gotIt);
    backdrop.appendChild(box);
    document.body.appendChild(backdrop);
    this.tooltipBackdrop = backdrop;
  }

  private dismissTooltip() {
    this.tooltipBackdrop?.remove();
    this.tooltipBackdrop = null;
    this.activeTooltip = null;
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

  renderLayer() {}
  shouldTransform(): boolean {
    return false;
  }
}
