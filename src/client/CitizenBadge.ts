import { TemplateResult, html } from "lit";
import { translateText } from "./Utils";

/**
 * The citizen "verified" badge (task 0068).
 *
 * THIS IS THE ONLY PLACE THE GLYPH LIVES. The visual design is deliberately a
 * placeholder — the owner ruled on 2026-08-28 to ship a neutral mark now and file
 * the real icon as a follow-up task (the 0066 favicon precedent). Keeping every
 * surface on this one helper is what makes that follow-up a one-file change.
 *
 * Constraint that outlives the placeholder: NO country or flag imagery, ever.
 * Yandex bans real-country flags and names, which is also why `/flags/*.svg` is
 * deliberately suppressed elsewhere in the client — do not borrow from it here.
 *
 * Rendered as text rather than an asset so there is no new file to load, no shadow
 * DOM, and no new custom element (so neither HTML template needs updating).
 */
const CITIZEN_BADGE_GLYPH = "★";

/**
 * All four surfaces (host lobby, join-private lobby, leaderboard, player panel) are
 * light-DOM Lit components, so the Tailwind utilities below apply verbatim in each.
 */
export function renderCitizenBadge(): TemplateResult {
  return html`<span
    class="citizen-badge inline-flex items-center leading-none text-amber-300"
    role="img"
    aria-label=${translateText("citizen_badge.aria_label")}
    title=${translateText("citizen_badge.tooltip")}
    >${CITIZEN_BADGE_GLYPH}</span
  >`;
}
