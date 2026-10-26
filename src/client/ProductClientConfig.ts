// Per-product client settings for the shared purchase flow (task 0494, spec
// §5): which analytics enum entries a product's purchase and restart popup
// log, and which text keys the popup shows. Every value points at an existing
// flashistConstants entry or lang key — never a string built from the id.

import type { PaymentProductId } from "../core/profile/PaymentsContract";
import { flashistConstants } from "./flashist/FlashistFacade";

export interface ProductAnalytics {
  started: string;
  completed: string;
  abandoned: string;
  restartPrompt: { shown: string; restart: string; later: string };
}

export interface ProductClientConfig {
  analytics: ProductAnalytics;
  restartPromptTitleKey: string;
  restartPromptBodyKey: string;
  /** Per-product UI switch (hides UI only); null = none. */
  isUiEnabled: (() => Promise<boolean>) | null;
}

// Built on read, not at module load: many test suites mock the facade with
// only the enum keys they need, and a load-time read would crash their import.
const PRODUCT_CLIENT_CONFIG: Record<
  PaymentProductId,
  () => ProductClientConfig
> = {
  citizenship: () => {
    const events = flashistConstants.analyticEvents;
    return {
      analytics: {
        started: events.PURCHASE_STARTED_CITIZENSHIP,
        completed: events.PURCHASE_COMPLETED_CITIZENSHIP,
        abandoned: events.PURCHASE_ABANDONED_CITIZENSHIP,
        restartPrompt: {
          shown: events.CITIZENSHIP_RESTART_PROMPT_SHOWN,
          restart: events.CITIZENSHIP_RESTART_PROMPT_RESTART,
          later: events.CITIZENSHIP_RESTART_PROMPT_LATER,
        },
      },
      restartPromptTitleKey: "citizenship_restart_modal.title",
      restartPromptBodyKey: "citizenship_restart_modal.body",
      isUiEnabled: null,
    };
  },
};

export function getProductClientConfig(
  productId: PaymentProductId,
): ProductClientConfig {
  return PRODUCT_CLIENT_CONFIG[productId]();
}
