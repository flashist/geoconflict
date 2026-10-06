import { LitElement, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { openCitizenshipExplainer } from "./CitizenshipExplainer";
import {
  FlashistFacade,
  flashist_waitGameInitComplete,
} from "./flashist/FlashistFacade";
import { translateText } from "./Utils";

/**
 * The Citizenship section at the top of Instructions (task 0301): a title, one
 * line and a "What is citizenship?" link that opens the explainer popup above
 * Instructions. Kept out of HelpModal so it is testable on its own.
 *
 * Hidden by default (fail closed); shown only once the citizenship surfaces are
 * confirmed on after platform init. A late flag recovery (task 0329) does not
 * reveal it for that load — accepted, as for the private-lobby row.
 */
@customElement("citizenship-help-section")
export class CitizenshipHelpSection extends LitElement {
  @state() private isEnabled = false;

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    flashist_waitGameInitComplete()
      .then(() => FlashistFacade.instance.isCitizenshipSurfacesEnabled())
      .then((enabled) => {
        if (enabled) {
          this.isEnabled = true;
          this.requestUpdate();
        }
      })
      .catch((error) => {
        // Fail closed: the section stays hidden.
        console.warn("Citizenship help section could not be shown:", error);
      });
  }

  private readonly onLinkTap = (): void => {
    openCitizenshipExplainer({ source: "Instructions" });
  };

  render() {
    if (!this.isEnabled) {
      return nothing;
    }
    // The separator is rendered here, not in HelpModal, so a hidden section
    // leaves no stray line at the top of Instructions.
    return html`
      <div id="citizenship-help-section" class="flex flex-col items-center">
        <div class="text-center text-2xl font-bold mb-4">
          ${translateText("help_modal.citizenship_title")}
        </div>
        <p class="text-center mb-2">
          ${translateText("help_modal.citizenship_desc")}
        </p>
        <button
          id="citizenship-help-link"
          class="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors duration-200"
          @click=${this.onLinkTap}
        >
          ${translateText("citizenship_explainer.link")}
        </button>
      </div>
      <hr class="mt-6 mb-4" />
    `;
  }
}
