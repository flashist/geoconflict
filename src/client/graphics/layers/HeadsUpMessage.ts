import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { GameView } from "../../../core/game/GameView";
import { translateText } from "../../Utils";
import { Layer } from "./Layer";

@customElement("heads-up-message")
export class HeadsUpMessage extends LitElement implements Layer {
  public game: GameView;

  @state()
  private isVisible = false;

  createRenderRoot() {
    return this;
  }

  init() {
    if (this.game.config().gameConfig().isTutorial) return;
    this.isVisible = true;
    this.requestUpdate();
  }

  tick() {
    if (!this.game.inSpawnPhase()) {
      this.isVisible = false;
      this.requestUpdate();
    }
  }

  render() {
    if (!this.isVisible) {
      return html``;
    }

    return html`
      <div
        class="fixed bottom-4 left-1/2 -translate-x-1/2
                    max-w-[90vw] w-max
                    bg-opacity-60 bg-gray-900 rounded-md lg:rounded-lg
                    backdrop-blur-md text-white text-md lg:text-xl p-2 lg:p-3
                    text-center"
        @contextmenu=${(e: MouseEvent) => e.preventDefault()}
      >
        ${translateText("heads_up_message.choose_spawn")}
      </div>
    `;
  }
}
