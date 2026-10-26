/**
 * @jest-environment jsdom
 */
// Task 0494 (spec §5, §12): every product's purchase and restart-popup
// analytics are existing enum entries (never inline strings), its popup text
// keys exist in both lang files, and citizenship's are exactly today's.
import fs from "fs";
import path from "path";
import { PAYMENT_PRODUCT_IDS } from "../../src/core/profile/PaymentsContract";
import { flashistConstants } from "../../src/client/flashist/FlashistFacade";
import { getProductClientConfig } from "../../src/client/ProductClientConfig";

const LANG_DIR = path.join(__dirname, "../../resources/lang");

function lookUp(file: string, key: string): unknown {
  const lang = JSON.parse(
    fs.readFileSync(path.join(LANG_DIR, file), "utf-8"),
  ) as Record<string, unknown>;
  return key
    .split(".")
    .reduce<unknown>(
      (node, part) =>
        typeof node === "object" && node !== null
          ? (node as Record<string, unknown>)[part]
          : undefined,
      lang,
    );
}

describe("PRODUCT_CLIENT_CONFIG", () => {
  const enumValues = new Set<string>(
    Object.values(flashistConstants.analyticEvents),
  );

  it("citizenship keeps today's event strings and popup text", () => {
    expect(getProductClientConfig("citizenship")).toEqual({
      analytics: {
        started: "Purchase:Started:Citizenship",
        completed: "Purchase:Completed:Citizenship",
        abandoned: "Purchase:Abandoned:Citizenship",
        restartPrompt: {
          shown: "Citizenship:RestartPrompt:Shown",
          restart: "Citizenship:RestartPrompt:Restart",
          later: "Citizenship:RestartPrompt:Later",
        },
        loginRequested: "Purchase:Login:Requested:Citizenship",
        loginSucceeded: "Purchase:Login:Succeeded:Citizenship",
        loginCancelled: "Purchase:Login:Cancelled:Citizenship",
        loginProfileFailed: "Purchase:Login:ProfileFailed:Citizenship",
        continueReady: "Purchase:Continue:Ready:Citizenship",
        continueNeedsTap: "Purchase:Continue:NeedsTap:Citizenship",
        blockedAlreadyOwned: "Purchase:Blocked:AlreadyOwned:Citizenship",
        blockedEarlierPurchasePending:
          "Purchase:Blocked:EarlierPurchasePending:Citizenship",
        // The citizenship kind never answers cannot_verify (task 0495).
        blockedCannotVerify: null,
        heldOnOtherProfile: "Purchase:HeldOnOtherProfile:Citizenship",
        blockedOtherProfile: "Purchase:Blocked:OtherProfile:Citizenship",
      },
      restartPromptTitleKey: "citizenship_restart_modal.title",
      restartPromptBodyKey: "citizenship_restart_modal.body",
      alreadyOwnedLineKey: "citizenship_explainer.already_citizen",
      isUiEnabled: null,
    });
  });

  it.each(PAYMENT_PRODUCT_IDS)(
    "%s: every event is a flashistConstants.analyticEvents value",
    (productId) => {
      const { analytics } = getProductClientConfig(productId);
      const events = [
        analytics.started,
        analytics.completed,
        analytics.abandoned,
        analytics.restartPrompt.shown,
        analytics.restartPrompt.restart,
        analytics.restartPrompt.later,
        analytics.loginRequested,
        analytics.loginSucceeded,
        analytics.loginCancelled,
        analytics.loginProfileFailed,
        analytics.continueReady,
        analytics.continueNeedsTap,
        analytics.blockedAlreadyOwned,
        analytics.blockedEarlierPurchasePending,
        analytics.heldOnOtherProfile,
        analytics.blockedOtherProfile,
        ...(analytics.blockedCannotVerify === null
          ? []
          : [analytics.blockedCannotVerify]),
      ];
      for (const event of events) {
        expect(enumValues.has(event)).toBe(true);
      }
    },
  );

  it.each(PAYMENT_PRODUCT_IDS)(
    "%s: the popup text keys exist, non-empty, in en.json and ru.json",
    (productId) => {
      const config = getProductClientConfig(productId);
      for (const key of [
        config.restartPromptTitleKey,
        config.restartPromptBodyKey,
        config.alreadyOwnedLineKey,
      ]) {
        for (const file of ["en.json", "ru.json"]) {
          const value = lookUp(file, key);
          expect(typeof value).toBe("string");
          expect((value as string).length).toBeGreaterThan(0);
        }
      }
    },
  );
});
