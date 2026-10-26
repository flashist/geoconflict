import { Howler } from "howler";
import { LitElement, TemplateResult, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { translateText } from "../../../client/Utils";
import { ColorPalette, Pattern } from "../../../core/CosmeticSchemas";
import { EventBus } from "../../../core/EventBus";
import { ColoredTeams, GameType } from "../../../core/game/Game";
import { GameUpdateType, WinUpdate } from "../../../core/game/GameUpdates";
import { GameView } from "../../../core/game/GameView";
import { AllPlayersStats, PlayerParticipation } from "../../../core/Schemas";
import "../../components/PatternButton";
import {
  fetchCosmetics,
  handlePurchase,
  patternRelationship,
} from "../../Cosmetics";
import { EmailSubscribeModal } from "../../EmailSubscribeModal";
import { getUserMe } from "../../jwt";
import { isEliminated } from "../../PlayerElimination";
import { SendWinnerEvent } from "../../Transport";
import { Layer } from "./Layer";
import {
  flashist_logEventAnalytics,
  flashistConstants,
  FlashistFacade,
  TELEGRAM_CHANNEL_URL,
  VK_CHANNEL_URL,
} from "../../flashist/FlashistFacade";
import { clearReconnectSession } from "../../ReconnectSession";
import {
  getNextMissionLevel,
  markMissionCompleted,
  setNextMissionLevel,
} from "../../SinglePlayMissionStorage";
import { setActiveTab } from "../../StartScreenTabStorage";
import {
  TUTORIAL_COMPLETED_KEY,
  TUTORIAL_START_TIME_KEY,
} from "../../TutorialStorage";
import { logMatchEndAnalytics } from "../../MatchStartAnalytics";
import {
  CITIZENSHIP_XP_THRESHOLD,
  XP_PER_MATCH,
} from "../../../core/profile/Citizenship";
import {
  getCitizenshipStatus,
  getProfileVerificationStatus,
} from "../../CitizenshipStatus";
import {
  deriveRewardedOffer,
  type RewardedOffer,
  type RewardedOfferDecision,
} from "../../RewardedMatchXpOffer";
import {
  claimRewardedMatchXp,
  type RewardedMatchXpClaimResult,
} from "../../RewardedMatchXpClaim";
import type { RewardedVideoResult } from "../../flashist/FlashistFacade";

/** How long Exit waits for a running reward claim before it navigates away. */
const EXIT_WAIT_FOR_REWARDED_CLAIM_MS = 5_000;

type RewardedStatus =
  | "idle"
  | "playing"
  | "claiming"
  | "granted"
  | "not_credited"
  | "failed"
  | "closed_early"
  | "unavailable"
  | "logged_in";

@customElement("win-modal")
export class WinModal extends LitElement implements Layer {
  public game: GameView;
  public eventBus: EventBus;

  private hasShownDeathModal = false;
  private missionProgressed = false;
  private eliminationTracked = false;
  private opponentWinLossTracked = false;

  @state()
  isVisible = false;

  @state()
  showButtons = false;

  @state()
  private isWin = false;

  @state()
  private patternContent: TemplateResult | null = null;

  @state()
  private isSubscribeButtonEnabled = false;

  @state()
  private isTelegramLinkVisible = false;

  @state()
  private isVkLinkVisible = false;

  // Rewarded-video offer (task 0488). Per match, so the death popup and the
  // match-end popup of one match share one offer and one reward.
  private rewardedGameId: string | null = null;
  @state()
  private rewardedOffer: RewardedOffer = "hidden";
  @state()
  private rewardedStatus: RewardedStatus = "idle";
  private rewardedClaim: Promise<RewardedMatchXpClaimResult> | null = null;
  private isGuestLoginOpen = false;
  private hasLoggedRewardedOfferShown = false;
  private hasLoggedLoginOfferShown = false;
  private hasLoggedSuppressedForCitizen = false;

  private _title: string;
  private _body = "";

  private rand = Math.random();

  // Override to prevent shadow DOM creation
  createRenderRoot() {
    return this;
  }

  constructor() {
    super();
  }

  connectedCallback() {
    super.connectedCallback();
    void this.loadCtaFlags();
  }

  private async loadCtaFlags(): Promise<void> {
    const [isSubscribeEnabled, isTelegramLinkEnabled, isVkLinkEnabled] =
      await Promise.all([
        FlashistFacade.instance.isEmailSubscribeButtonEnabled(),
        FlashistFacade.instance.isTelegramLinkEnabled(),
        FlashistFacade.instance.isVkLinkEnabled(),
      ]);
    if (!this.isConnected) return;
    this.isSubscribeButtonEnabled = isSubscribeEnabled;
    this.isTelegramLinkVisible = isTelegramLinkEnabled;
    this.isVkLinkVisible = isVkLinkEnabled;
  }

  render() {
    return html`
      <div
        class="${this.isVisible
        ? "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-800/70 p-6 rounded-lg z-[9999] shadow-2xl backdrop-blur-sm text-white w-[350px] max-w-[90%] md:w-[700px] md:max-w-[700px] animate-fadeIn"
        : "hidden"}"
      >
        <h2 class="m-0 mb-4 text-[26px] text-center text-white">
          ${this._title || ""}
        </h2>
        ${this._body
        ? html`<p class="m-0 mb-5 text-center text-white">
              ${this._body}
            </p>`
        : nothing}
        ${this.innerHtml()}
        ${this.showButtons ? this.renderRewardedSection() : nothing}
        <div
          class="${this.showButtons
        ? "flex justify-between gap-2.5"
        : "hidden"}"
        >
          <button
            @click=${this._handleExit}
            class="flex-1 px-3 py-3 text-base cursor-pointer bg-blue-500/60 text-white border-0 rounded transition-all duration-200 hover:bg-blue-500/80 hover:-translate-y-px active:translate-y-px"
          >
            ${translateText("win_modal.exit")}
          </button>
          <button
            @click=${this.hide}
            class="flex-1 px-3 py-3 text-base cursor-pointer bg-blue-500/60 text-white border-0 rounded transition-all duration-200 hover:bg-blue-500/80 hover:-translate-y-px active:translate-y-px"
          >
            ${this.isWin
        ? translateText("win_modal.keep")
        : translateText("win_modal.spectate")}
          </button>
        </div>
        ${this.showButtons && this.isSubscribeButtonEnabled
        ? html`
              <button
                @click=${this.openSubscribeModal}
                class="w-full mt-2.5 px-3 py-3 text-base cursor-pointer bg-green-600/60 text-white border-0 rounded transition-all duration-200 hover:bg-green-600/80 hover:-translate-y-px active:translate-y-px"
              >
                ${translateText("email_subscribe_modal.subscribe_button")}
              </button>
            `
        : nothing}
        ${this.showButtons && this.isTelegramLinkVisible
        ? html`
              <a
                href=${TELEGRAM_CHANNEL_URL}
                target="_blank"
                rel="noopener"
                class="mt-2.5 block text-center text-base text-blue-300 underline underline-offset-2 transition-colors duration-200 hover:text-blue-200"
                @click=${this.onTelegramLinkClick}
              >
                ${translateText("telegram_link.cta_text")}
              </a>
            `
        : nothing}
        ${this.showButtons && this.isVkLinkVisible
          ? html`
              <a
                href=${VK_CHANNEL_URL}
                target="_blank"
                rel="noopener"
                class="mt-2 block text-center text-base text-blue-300 underline underline-offset-2 transition-colors duration-200 hover:text-blue-200"
                @click=${this.onVkLinkClick}
              >
                ${translateText("vk_link.cta_text")}
              </a>
            `
          : nothing}
      </div>

      <style>
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translate(-50%, -48%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      </style>
    `;
  }

  innerHtml() {
    // Flashist Adaptation: removing the steam wishlist link
    // if (isInIframe() || this.rand < 0.25) {
    //   return this.steamWishlist();
    // }
    return this.renderPatternButton();
  }

  renderPatternButton() {
    // Flashist Adaptation: removing the open-front mention
    return html``;
    // return html`
    //   <div class="text-center mb-6 bg-black/30 p-2.5 rounded">
    //     <h3 class="text-xl font-semibold text-white mb-3">
    //       ${translateText("win_modal.support_openfront")}
    //     </h3>
    //     <p class="text-white mb-3">
    //       ${translateText("win_modal.territory_pattern")}
    //     </p>
    //     <div class="flex justify-center">${this.patternContent}</div>
    //   </div>
    // `;
  }

  async loadPatternContent() {
    const me = await getUserMe();
    const patterns = await fetchCosmetics();

    const purchasablePatterns: {
      pattern: Pattern;
      colorPalette: ColorPalette;
    }[] = [];

    for (const pattern of Object.values(patterns?.patterns ?? {})) {
      for (const colorPalette of pattern.colorPalettes ?? []) {
        if (
          patternRelationship(pattern, colorPalette, me, null) === "purchasable"
        ) {
          const palette = patterns?.colorPalettes?.[colorPalette.name];
          if (palette) {
            purchasablePatterns.push({
              pattern,
              colorPalette: palette,
            });
          }
        }
      }
    }

    if (purchasablePatterns.length === 0) {
      this.patternContent = html``;
      return;
    }

    // Shuffle the array and take patterns based on screen size
    const shuffled = [...purchasablePatterns].sort(() => Math.random() - 0.5);
    const isMobile = window.innerWidth < 768; // md breakpoint
    const maxPatterns = isMobile ? 1 : 3;
    const selectedPatterns = shuffled.slice(
      0,
      Math.min(maxPatterns, shuffled.length),
    );

    this.patternContent = html`
      <div class="flex gap-4 flex-wrap justify-start">
        ${selectedPatterns.map(
      ({ pattern, colorPalette }) => html`
            <pattern-button
              .pattern=${pattern}
              .colorPalette=${colorPalette}
              .requiresPurchase=${true}
              .onSelect=${(p: Pattern | null) => { }}
              .onPurchase=${(p: Pattern, colorPalette: ColorPalette | null) =>
          handlePurchase(p, colorPalette)}
            ></pattern-button>
          `,
    )}
      </div>
    `;
  }

  steamWishlist(): TemplateResult {
    // Flashist Adaptation: disabling even a possibility of shwing the steam text anywhere in the game
    return html``;
    // return html`<p class="m-0 mb-5 text-center bg-black/30 p-2.5 rounded">
    //   <a
    //     href="https://store.steampowered.com/app/3560670"
    //     target="_blank"
    //     rel="noopener noreferrer"
    //     class="text-[#4a9eff] underline font-medium transition-colors duration-200 text-2xl hover:text-[#6db3ff]"
    //   >
    //     ${translateText("win_modal.wishlist")}
    //   </a>
    // </p>`;
  }

  private openSubscribeModal() {
    if (!this.isSubscribeButtonEnabled) return;
    const modal = document.querySelector("email-subscribe-modal");
    if (!(modal instanceof EmailSubscribeModal)) return;
    void modal.show();
  }

  private onTelegramLinkClick() {
    FlashistFacade.instance.logUiTapEvent(
      flashistConstants.uiElementIds.telegramLinkGameEnd,
    );
  }

  private onVkLinkClick() {
    FlashistFacade.instance.logUiTapEvent(
      flashistConstants.uiElementIds.vkLinkGameEnd,
    );
  }

  async show() {
    await this.loadPatternContent();
    this.isVisible = true;
    this.requestUpdate();
    setTimeout(() => this.revealButtons(), 3000);
  }

  private revealButtons(): void {
    this.showButtons = true;
    this.requestUpdate();
    void this.refreshRewardedOffer();
  }

  private renderRewardedSection(): TemplateResult | typeof nothing {
    // Citizens, and every hidden case with nothing to report, see the popup as before.
    if (this.rewardedOffer === "hidden" && this.rewardedStatus === "idle") {
      return nothing;
    }
    const resultKey = this.rewardedResultKey();
    return html`
      <div class="mb-4 bg-black/30 p-3 rounded text-center">
        <p class="m-0 mb-2 text-white">
          ${translateText("win_modal.xp_explainer", {
            threshold: CITIZENSHIP_XP_THRESHOLD,
          })}
        </p>
        ${this.rewardedOffer === "watch"
          ? html`
              <button
                @click=${this.onRewardedWatchPress}
                ?disabled=${this.rewardedStatus === "playing"}
                class="w-full px-3 py-3 text-base cursor-pointer bg-amber-500/70 text-white border-0 rounded transition-all duration-200 hover:bg-amber-500/90 disabled:opacity-50 disabled:cursor-default"
              >
                ${translateText("win_modal.rewarded_watch_button", {
                  xp: XP_PER_MATCH,
                })}
              </button>
            `
          : nothing}
        ${this.rewardedOffer === "log_in" && this.rewardedStatus !== "logged_in"
          ? html`
              <p class="m-0 mb-2 text-white">
                ${translateText("win_modal.guest_login_text")}
              </p>
              <button
                @click=${this.onGuestLoginPress}
                class="w-full px-3 py-3 text-base cursor-pointer bg-amber-500/70 text-white border-0 rounded transition-all duration-200 hover:bg-amber-500/90"
              >
                ${translateText("win_modal.guest_login_button")}
              </button>
            `
          : nothing}
        ${resultKey !== null
          ? html`<p class="m-0 mt-2 text-white">${translateText(resultKey)}</p>`
          : nothing}
      </div>
    `;
  }

  private rewardedResultKey(): string | null {
    switch (this.rewardedStatus) {
      case "idle":
      case "playing":
        return null;
      case "claiming":
        return "win_modal.rewarded_claiming";
      case "granted":
        return "win_modal.rewarded_granted";
      case "not_credited":
        return "win_modal.rewarded_not_credited";
      case "failed":
        return "win_modal.rewarded_failed";
      case "closed_early":
        return "win_modal.rewarded_closed_early";
      case "unavailable":
        return "win_modal.rewarded_unavailable";
      case "logged_in":
        return "win_modal.guest_logged_in";
    }
  }

  /** Forget the offer when the popup is for a different match than last time. */
  private syncRewardedMatch(gameId: string): void {
    if (this.rewardedGameId === gameId) {
      return;
    }
    this.rewardedGameId = gameId;
    this.rewardedOffer = "hidden";
    this.rewardedStatus = "idle";
    this.rewardedClaim = null;
    this.hasLoggedRewardedOfferShown = false;
    this.hasLoggedLoginOfferShown = false;
    this.hasLoggedSuppressedForCitizen = false;
  }

  private async refreshRewardedOffer(): Promise<void> {
    let decision: RewardedOfferDecision;
    let gameId: string;
    try {
      gameId = this.game.gameID();
      this.syncRewardedMatch(gameId);
      const [isOfferFlagEnabled, isCitizenshipSurfacesEnabled] =
        await Promise.all([
          FlashistFacade.instance.isRewardedVideoEnabled(),
          FlashistFacade.instance.isCitizenshipSurfacesEnabled(),
        ]);
      const config = this.game.config();
      const gameConfig = config.gameConfig();
      decision = deriveRewardedOffer({
        isOfferFlagEnabled,
        isCitizenshipSurfacesEnabled,
        isRewardedVideoAvailable:
          FlashistFacade.instance.isRewardedVideoAvailable(),
        gameType: gameConfig.gameType,
        isTutorial: gameConfig.isTutorial === true,
        isReplay: config.isReplay(),
        participation: this.ownParticipation(),
        citizenshipStatus: getCitizenshipStatus(),
        verificationStatus: getProfileVerificationStatus(),
        isMatchAlreadyClaimed: this.rewardedClaim !== null,
      });
    } catch (error) {
      console.warn("WinModal | rewarded offer check failed: ", error);
      return;
    }
    if (!this.isConnected || this.rewardedGameId !== gameId) {
      return;
    }
    this.rewardedOffer = decision.offer;
    this.requestUpdate();
    const events = flashistConstants.analyticEvents;
    if (
      decision.isSuppressedForCitizen &&
      !this.hasLoggedSuppressedForCitizen
    ) {
      this.hasLoggedSuppressedForCitizen = true;
      flashist_logEventAnalytics(events.AD_REWARDED_SUPPRESSED_CITIZEN);
    }
    if (decision.offer === "watch" && !this.hasLoggedRewardedOfferShown) {
      this.hasLoggedRewardedOfferShown = true;
      flashist_logEventAnalytics(events.AD_REWARDED_OFFER_SHOWN);
    }
    if (decision.offer === "log_in" && !this.hasLoggedLoginOfferShown) {
      this.hasLoggedLoginOfferShown = true;
      flashist_logEventAnalytics(events.AD_REWARDED_LOGIN_OFFER_SHOWN);
    }
  }

  /** The same summary the XP credit is decided on, for this player only. */
  private ownParticipation(): PlayerParticipation | null {
    const myPlayer = this.game.myPlayer();
    const clientID = myPlayer?.clientID() ?? null;
    if (myPlayer === null || clientID === null) {
      return null;
    }
    return {
      clientID,
      hasSpawned: myPlayer.hasSpawned(),
      isAliveAtEnd: myPlayer.isAlive(),
      // An eliminated player is credited at elimination (0211), via killedAt.
      killedAt: isEliminated(this.game, myPlayer)
        ? this.game.ticks()
        : undefined,
    };
  }

  private async onRewardedWatchPress(): Promise<void> {
    const gameId = this.rewardedGameId;
    if (
      gameId === null ||
      this.rewardedOffer !== "watch" ||
      this.rewardedStatus === "playing" ||
      this.rewardedClaim !== null
    ) {
      return;
    }
    flashist_logEventAnalytics(
      flashistConstants.analyticEvents.AD_REWARDED_PRESSED,
    );
    this.rewardedStatus = "playing";
    this.requestUpdate();
    const result: RewardedVideoResult =
      await FlashistFacade.instance.showRewardedVideo(
        () => this.startRewardedClaim(gameId),
        (muted) => Howler.mute(muted),
      );
    if (this.rewardedGameId !== gameId || this.rewardedClaim !== null) {
      return;
    }
    this.rewardedStatus =
      result === "closed_early" ? "closed_early" : "unavailable";
    this.requestUpdate();
  }

  private startRewardedClaim(gameId: string): void {
    if (this.rewardedGameId !== gameId || this.rewardedClaim !== null) {
      return;
    }
    this.rewardedOffer = "hidden";
    this.rewardedStatus = "claiming";
    this.requestUpdate();
    this.rewardedClaim = claimRewardedMatchXp(gameId);
    void this.rewardedClaim.then((claim) => {
      if (this.rewardedGameId !== gameId) {
        return;
      }
      this.rewardedStatus =
        claim.status === "duplicate" ? "granted" : claim.status;
      this.requestUpdate();
    });
  }

  private async onGuestLoginPress(): Promise<void> {
    if (this.isGuestLoginOpen) {
      return;
    }
    this.isGuestLoginOpen = true;
    const events = flashistConstants.analyticEvents;
    try {
      flashist_logEventAnalytics(events.AD_REWARDED_LOGIN_PRESSED);
      // No restart request: a match is on, and Exit's navigation starts the
      // session on the next page load anyway. XP counts from the next match.
      if (await FlashistFacade.instance.openYandexAuthDialog()) {
        flashist_logEventAnalytics(events.AD_REWARDED_LOGIN_COMPLETED);
        this.rewardedStatus = "logged_in";
        this.requestUpdate();
      }
    } finally {
      this.isGuestLoginOpen = false;
    }
  }

  // hide() {
  async hide() {
    // Flashist Adaptation: interstitial adv — skipped for tutorial matches
    if (!this.game.config().gameConfig().isTutorial) {
      await FlashistFacade.instance.showInterstitial();
    }

    this.isVisible = false;
    this.showButtons = false;
    this.requestUpdate();
  }

  // Flashist Adaptation
  // private _handleExit() {
  private async _handleExit() {
    // Navigating away would cut off a reward claim still in flight.
    if (this.rewardedClaim !== null) {
      await Promise.race([
        this.rewardedClaim,
        new Promise((resolve) =>
          setTimeout(resolve, EXIT_WAIT_FOR_REWARDED_CLAIM_MS),
        ),
      ]);
    }
    // this.hide();
    await this.hide();

    // Land on the Multiplayer tab after a match (open item in
    // s4-start-screen-redesign-impl: safest default, flagged for review).
    setActiveTab("multiplayer");

    // Flashist Adaptation
    // window.location.href = "/";
    FlashistFacade.instance.changeHref(FlashistFacade.instance.rootPathname);
  }

  init() {
    this.hasShownDeathModal = false;
    this.eliminationTracked = false;
    this.opponentWinLossTracked = false;
  }

  tick() {
    const myPlayer = this.game.myPlayer();
    const eliminated = isEliminated(this.game, myPlayer);
    if (!this.eliminationTracked && eliminated) {
      this.eliminationTracked = true;
      flashist_logEventAnalytics(flashistConstants.analyticEvents.PLAYER_ELIMINATED, this.game.ticks());
    }
    if (!this.hasShownDeathModal && eliminated) {
      this.hasShownDeathModal = true;
      clearReconnectSession();
      this._title = translateText("win_modal.died");
      this._body = "";
      this.show();
    }
    const updates = this.game.updatesSinceLastTick();
    const winUpdates = updates !== null ? updates[GameUpdateType.Win] : [];
    winUpdates.forEach((wu) => {
      if (this.isSoloOpponentWin(wu.winner)) {
        this.showSoloOpponentWinLoss(wu);
        return;
      }
      if (wu.winner === undefined || wu.winner[0] === "opponent") {
        // ...
      } else if (wu.winner[0] === "team") {

        logMatchEndAnalytics(this.game.ticks());

        this.eventBus.emit(
          new SendWinnerEvent(
            wu.winner,
            wu.allPlayersStats,
            this.buildPlayerParticipation(wu.allPlayersStats),
          ),
        );
        if (wu.winner[1] === this.game.myPlayer()?.team()) {
          this._title = translateText("win_modal.your_team");
          this._body = "";
          this.isWin = true;

          //
          flashist_logEventAnalytics(
            flashistConstants.analyticEvents.GAME_WIN
          );

        } else if (wu.winner[1] === ColoredTeams.Bot) {
          // Reached only in a non-tutorial singleplayer Team-mode match, and
          // only when the solo-loss screen was skipped because the player is
          // already dead (isSoloOpponentWin's hasShownDeathModal / !isAlive
          // disjuncts) or there is no local player. checkWinnerTeam() is the
          // only producer of a "team" winner and it declares a Bot-team win
          // only when gameType is Singleplayer; a tutorial cannot reach here at
          // all, because the tutorial runs gameMode FFA (Main.ts) and so never
          // calls checkWinnerTeam().
          // "Bot" is a raw enum value, not a translatable team name, so show a
          // dedicated loss title instead of "{team} team has won!". Task 0022.
          this._title = translateText("win_modal.bot_team");
          this._body = "";
          this.isWin = false;

          //
          flashist_logEventAnalytics(
            flashistConstants.analyticEvents.GAME_LOSS
          );

        } else {
          this._title = translateText("win_modal.other_team", {
            team: wu.winner[1],
          });
          this._body = "";
          this.isWin = false;

          //
          flashist_logEventAnalytics(
            flashistConstants.analyticEvents.GAME_LOSS
          );
        }
        clearReconnectSession();
        this.show();

      } else {
        const winner = this.game.playerByClientID(wu.winner[1]);
        if (!winner?.isPlayer()) return;
        const winnerClient = winner.clientID();
        if (winnerClient !== null) {
          this.eventBus.emit(
            new SendWinnerEvent(
              ["player", winnerClient],
              wu.allPlayersStats,
              this.buildPlayerParticipation(wu.allPlayersStats),
            ),
          );
        }

        logMatchEndAnalytics(this.game.ticks());

        if (
          winnerClient !== null &&
          winnerClient === this.game.myPlayer()?.clientID()
        ) {
          this._title = translateText("win_modal.you_won");
          this._body = "";
          this.isWin = true;

          //
          flashist_logEventAnalytics(
            flashistConstants.analyticEvents.GAME_WIN
          );

        } else {
          this._title = translateText("win_modal.other_won", {
            player: winner.name(),
          });
          this._body = "";
          this.isWin = false;

          //
          flashist_logEventAnalytics(
            flashistConstants.analyticEvents.GAME_LOSS
          );

        }
        clearReconnectSession();
        this.show();
      }
      this.handleMissionProgress();
    });
  }

  /**
   * Build the per-player end-of-match participation summary the server needs to
   * decide XP-credit qualification (it does not run the simulation). Keyed by
   * clientID — only human players have one (AI players return null and are skipped).
   * `killedAt` comes from the authoritative match stats already in the winner message.
   */
  private buildPlayerParticipation(
    allPlayersStats: AllPlayersStats,
  ): PlayerParticipation[] {
    const participation: PlayerParticipation[] = [];
    for (const player of this.game.players()) {
      const clientID = player.clientID();
      if (clientID === null) continue;
      const killedAt = allPlayersStats[clientID]?.killedAt;
      participation.push({
        clientID,
        hasSpawned: player.hasSpawned(),
        isAliveAtEnd: player.isAlive(),
        killedAt: killedAt !== undefined ? Number(killedAt) : undefined,
      });
    }
    return participation;
  }

  private isSoloOpponentWin(winner: unknown): boolean {
    const gameConfig = this.game.config().gameConfig();
    if (
      gameConfig.gameType !== GameType.Singleplayer ||
      gameConfig.isTutorial
    ) {
      return false;
    }

    const myPlayer = this.game.myPlayer();
    if (myPlayer === null || this.hasShownDeathModal || !myPlayer.isAlive()) {
      return false;
    }

    if (!Array.isArray(winner)) {
      return false;
    }

    if (winner[0] === "opponent") {
      return true;
    }

    if (winner[0] === "team") {
      return winner[1] !== myPlayer.team();
    }

    if (winner[0] === "player") {
      return winner[1] !== myPlayer.clientID();
    }

    return false;
  }

  private showSoloOpponentWinLoss(wu: WinUpdate): void {
    if (this.opponentWinLossTracked) {
      return;
    }
    this.opponentWinLossTracked = true;
    logMatchEndAnalytics(this.game.ticks());
    flashist_logEventAnalytics(flashistConstants.analyticEvents.GAME_LOSS);

    flashist_logEventAnalytics(
      flashistConstants.analyticEvents.MATCH_LOSS_OPPONENT_WON,
    );

    this.eventBus.emit(
      new SendWinnerEvent(
        wu.winner,
        wu.allPlayersStats,
        this.buildPlayerParticipation(wu.allPlayersStats),
      ),
    );
    clearReconnectSession();
    this._title = translateText("win_modal.opponent_won_title");
    this._body = translateText("win_modal.opponent_won_body");
    this.isWin = false;
    this.show();
  }

  private handleMissionProgress() {
    if (this.missionProgressed || !this.isWin) {
      return;
    }

    // Tutorial win path
    if (this.game.config().gameConfig().isTutorial) {
      const startTime = Number(sessionStorage.getItem(TUTORIAL_START_TIME_KEY) ?? 0);
      const duration = startTime > 0 ? Math.floor((Date.now() - startTime) / 1000) : 0;
      localStorage.setItem(TUTORIAL_COMPLETED_KEY, "true");
      flashist_logEventAnalytics(flashistConstants.analyticEvents.TUTORIAL_COMPLETED);
      flashist_logEventAnalytics(flashistConstants.analyticEvents.TUTORIAL_DURATION, duration);
      this.missionProgressed = true;
      return;
    }

    const missionLevel = this.game.config().gameConfig().singlePlayMission?.level;
    if (!missionLevel) {
      return;
    }
    const nextLevel = Math.max(getNextMissionLevel(), missionLevel + 1);
    setNextMissionLevel(nextLevel);
    markMissionCompleted();
    this.missionProgressed = true;
  }

  renderLayer(/* context: CanvasRenderingContext2D */) { }

  shouldTransform(): boolean {
    return false;
  }
}
