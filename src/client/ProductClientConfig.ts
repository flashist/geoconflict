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
  // A guest's "Log in and buy" (task 0495).
  loginRequested: string;
  loginSucceeded: string;
  loginCancelled: string;
  loginProfileFailed: string;
  continueReady: string;
  continueNeedsTap: string;
  blockedAlreadyOwned: string;
  blockedEarlierPurchasePending: string;
  /** null for a kind that never answers `cannot_verify` (citizenship). */
  blockedCannotVerify: string | null;
  // ADR-126: the reconcile found it on another profile; a purchase was refused.
  heldOnOtherProfile: string;
  blockedOtherProfile: string;
}

export interface ProductClientConfig {
  analytics: ProductAnalytics;
  restartPromptTitleKey: string;
  restartPromptBodyKey: string;
  /** The line a surface shows when the purchase flow ends `already_owned`. */
  alreadyOwnedLineKey: string;
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
        loginRequested: events.PURCHASE_LOGIN_REQUESTED_CITIZENSHIP,
        loginSucceeded: events.PURCHASE_LOGIN_SUCCEEDED_CITIZENSHIP,
        loginCancelled: events.PURCHASE_LOGIN_CANCELLED_CITIZENSHIP,
        loginProfileFailed: events.PURCHASE_LOGIN_PROFILE_FAILED_CITIZENSHIP,
        continueReady: events.PURCHASE_CONTINUE_READY_CITIZENSHIP,
        continueNeedsTap: events.PURCHASE_CONTINUE_NEEDS_TAP_CITIZENSHIP,
        blockedAlreadyOwned: events.PURCHASE_BLOCKED_ALREADY_OWNED_CITIZENSHIP,
        blockedEarlierPurchasePending:
          events.PURCHASE_BLOCKED_EARLIER_PURCHASE_PENDING_CITIZENSHIP,
        blockedCannotVerify: null,
        heldOnOtherProfile: events.PURCHASE_HELD_ON_OTHER_PROFILE_CITIZENSHIP,
        blockedOtherProfile: events.PURCHASE_BLOCKED_OTHER_PROFILE_CITIZENSHIP,
      },
      restartPromptTitleKey: "citizenship_restart_modal.title",
      restartPromptBodyKey: "citizenship_restart_modal.body",
      alreadyOwnedLineKey: "citizenship_explainer.already_citizen",
      isUiEnabled: null,
    };
  },
};

export function getProductClientConfig(
  productId: PaymentProductId,
): ProductClientConfig {
  return PRODUCT_CLIENT_CONFIG[productId]();
}
