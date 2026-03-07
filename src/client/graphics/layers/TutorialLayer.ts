import { isMobileDevice, translateText } from "../../../client/Utils";
import { EventBus } from "../../../core/EventBus";
import { UnitType } from "../../../core/game/Game";
import { GameUpdateType } from "../../../core/game/GameUpdates";
import { GameView } from "../../../core/game/GameView";
import { ContextMenuEvent, ReplaySpeedChangeEvent } from "../../InputHandler";
import { TransformHandler } from "../TransformHandler";
import { ReplaySpeedMultiplier } from "../../utilities/ReplaySpeedMultiplier";
import {
  flashist_logEventAnalytics,
  flashistConstants,
  FlashistFacade,
} from "../../flashist/FlashistFacade";
import { TUTORIAL_COMPLETED_KEY } from "../../TutorialStorage";
import { Layer } from "./Layer";

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
  private activeTooltip: 1 | 2 | 3 | 4 | 5 | 6 | 7 | null = null;
  private shownTooltips = [false, false, false, false, false, false, false];
  private tutorialStartTime = Date.now();
  private radialMenuOpened = false;
  private cityBuilt = false;

  constructor(
    private game: GameView,
    private eventBus: EventBus,
    private transformHandler: TransformHandler,
  ) {}

  init() {
    // Hide the top-right game UI (settings/sidebar) so it doesn't overlap the skip button
    const topRight = document.getElementById("game-top-right");
    if (topRight) topRight.style.display = "none";

    // Track radial menu opens over own territory so tooltip 5 only shows
    // when the build menu is actually available
    this.eventBus.on(ContextMenuEvent, (event) => {
      const world = this.transformHandler.screenToWorldCoordinates(event.x, event.y);
      if (!this.game.isValidCoord(world.x, world.y)) return;
      const tile = this.game.ref(world.x, world.y);
      const myPlayer = this.game.myPlayer();
      if (myPlayer && this.game.owner(tile) === myPlayer) {
        this.radialMenuOpened = true;
      }
    });

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

    // Detect when the player builds their first city
    if (!this.cityBuilt) {
      const updates = this.game.updatesSinceLastTick();
      const unitUpdates = updates !== null ? updates[GameUpdateType.Unit] : [];
      const playerSmallID = myPlayer.smallID();
      for (const u of unitUpdates) {
        if (
          u.unitType === UnitType.City &&
          u.ownerID === playerSmallID &&
          u.isActive
        ) {
          this.cityBuilt = true;
          break;
        }
      }
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
      !this.game.inSpawnPhase()
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
    // Tooltips 4, 5, 6 fire sequentially immediately after the previous is dismissed
    if (!this.shownTooltips[3] && this.shownTooltips[2]) {
      this.triggerTooltip(4);
      return;
    }
    if (!this.shownTooltips[4] && this.shownTooltips[3] && this.radialMenuOpened) {
      this.triggerTooltip(5);
      return;
    }
    if (!this.shownTooltips[5] && this.shownTooltips[4] && this.cityBuilt) {
      this.triggerTooltip(6);
      return;
    }
    if (!this.shownTooltips[6] && this.shownTooltips[5]) {
      this.triggerTooltip(7);
    }
  }

  private triggerTooltip(n: 1 | 2 | 3 | 4 | 5 | 6 | 7) {
    this.shownTooltips[n - 1] = true;
    this.activeTooltip = n;
    // Reset radial menu flag when tooltip 4 shows, so tooltip 5 only fires
    // after the player opens the radial menu in response to tooltip 4's instruction
    if (n === 4) this.radialMenuOpened = false;
    // Near-pause the game while tooltip is visible
    this.eventBus.emit(new ReplaySpeedChangeEvent(100 as ReplaySpeedMultiplier));
    flashist_logEventAnalytics(
      flashistConstants.analyticEvents.TUTORIAL_TOOLTIP_SHOWN_FIRST_PART + n,
    );
    this.showTooltipDOM(n);
  }

  private showTooltipDOM(n: 1 | 2 | 3 | 4 | 5 | 6 | 7) {
    const mobile = isMobileDevice();
    const backdrop = document.createElement("div");
    applyStyles(backdrop, BACKDROP_STYLE);

    const box = document.createElement("div");
    applyStyles(box, BOX_STYLE);

    const hasMobileVariant = mobile && (n === 2 || n === 4);
    const textKey = hasMobileVariant ? `tutorial.tooltip_${n}_mobile` : `tutorial.tooltip_${n}`;
    const text = document.createElement("p");
    text.textContent = translateText(textKey);
    applyStyles(text, TEXT_STYLE);

    box.appendChild(text);

    if (n === 2 && mobile) {
      const img = document.createElement("img");
      img.src = "/images/helpModal/radialMenu3.webp";
      applyStyles(img, { display: "block", maxWidth: "80%", borderRadius: "6px", margin: "0 auto 20px" });
      box.appendChild(img);
    }

    if (n === 5) {
      const images = [
        "/images/helpModal/radialMenu4.webp",
        "/images/helpModal/radialMenu5.webp",
      ];
      const row = document.createElement("div");
      applyStyles(row, { display: "flex", gap: "12px", justifyContent: "center", marginBottom: "20px" });
      for (const src of images) {
        const img = document.createElement("img");
        img.src = src;
        applyStyles(img, { maxWidth: "45%", borderRadius: "6px" });
        row.appendChild(img);
      }
      box.appendChild(row);
    }

    const gotIt = document.createElement("button");
    gotIt.textContent = translateText("tutorial.got_it");
    applyStyles(gotIt, GOT_IT_STYLE);
    gotIt.addEventListener("click", () => this.dismissTooltip());

    box.appendChild(gotIt);
    backdrop.appendChild(box);
    document.body.appendChild(backdrop);
    this.tooltipBackdrop = backdrop;
  }

  private dismissTooltip() {
    const dismissedTooltip = this.activeTooltip;
    const wasLastTooltip = dismissedTooltip === 7;
    this.tooltipBackdrop?.remove();
    this.tooltipBackdrop = null;
    this.activeTooltip = null;
    // Restore normal game speed
    this.eventBus.emit(new ReplaySpeedChangeEvent(ReplaySpeedMultiplier.normal));
    if (dismissedTooltip !== null) {
      flashist_logEventAnalytics(
        flashistConstants.analyticEvents.TUTORIAL_TOOLTIP_CLOSED_FIRST_PART + dismissedTooltip,
      );
    }
    // Mark tutorial complete when the final tooltip is dismissed
    if (wasLastTooltip) {
      localStorage.setItem(TUTORIAL_COMPLETED_KEY, "true");
      flashist_logEventAnalytics(flashistConstants.analyticEvents.TUTORIAL_COMPLETED);
    }
  }

  private skipTutorial() {
    // Restore normal speed before navigating away (in case tooltip was active)
    this.eventBus.emit(new ReplaySpeedChangeEvent(ReplaySpeedMultiplier.normal));
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
