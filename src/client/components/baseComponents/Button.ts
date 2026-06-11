import { LitElement, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { translateText } from "../../Utils";

@customElement("o-button")
export class OButton extends LitElement {
  @property({ type: String }) title = "";
  @property({ type: String }) translationKey = "";
  @property({ type: String }) subtitleTranslationKey = "";
  @property({ type: String }) icon = "";
  @property({ type: Boolean }) chevron = false;
  @property({ type: Boolean }) menuRow = false;
  @property({ type: Boolean }) secondary = false;
  @property({ type: Boolean }) block = false;
  @property({ type: Boolean }) blockDesktop = false;
  @property({ type: Boolean }) disable = false;

  createRenderRoot() {
    return this;
  }

  render() {
    return html`
      <button
        class=${classMap({
          "c-button": true,
          "c-button--block": this.block,
          "c-button--blockDesktop": this.blockDesktop,
          "c-button--secondary": this.secondary,
          "c-button--disabled": this.disable,
          "c-button--menuRow": this.menuRow,
        })}
        ?disabled=${this.disable}
      >
        ${`${this.icon}` === ""
          ? nothing
          : html`<span class="c-button__icon" aria-hidden="true"
              >${this.icon}</span
            >`}
        <span class="c-button__text">
          <span class="c-button__title"
            >${`${this.translationKey}` === ""
              ? `${this.title}`
              : `${translateText(this.translationKey)}`}</span
          >
          ${`${this.subtitleTranslationKey}` === ""
            ? nothing
            : html`<span class="c-button__subtitle"
                >${translateText(this.subtitleTranslationKey)}</span
              >`}
        </span>
        ${this.chevron
          ? html`<span class="c-button__chevron" aria-hidden="true">›</span>`
          : nothing}
      </button>
    `;
  }
}
