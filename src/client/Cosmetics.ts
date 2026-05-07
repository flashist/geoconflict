import { UserMeResponse } from "../core/ApiSchemas";
import {
  ColorPalette,
  Cosmetics,
  CosmeticsSchema,
  Pattern,
} from "../core/CosmeticSchemas";
import { FlashistFacade } from "./flashist/FlashistFacade";
import { getApiBase, getAuthHeader } from "./jwt";
import { getPersistentID } from "./Main";

const loggedCosmeticsFetchFailures = new Set<string>();

function warnCosmeticsFetchFailure(message: string, error?: unknown) {
  if (loggedCosmeticsFetchFailures.has(message)) {
    return;
  }
  loggedCosmeticsFetchFailures.add(message);
  if (error === undefined) {
    console.warn(message);
    return;
  }
  console.warn(message, error);
}

export async function handlePurchase(
  pattern: Pattern,
  colorPalette: ColorPalette | null,
) {
  if (pattern.product === null) {
    alert("This pattern is not available for purchase.");
    return;
  }

  const response = await fetch(
    `${getApiBase()}/stripe/create-checkout-session`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: getAuthHeader(),
        "X-Persistent-Id": getPersistentID(),
      },
      body: JSON.stringify({
        priceId: pattern.product.priceId,

        // Flashist Adaptation
        // hostname: window.location.origin,
        hostname: FlashistFacade.instance.windowOrigin,

        colorPaletteName: colorPalette?.name,
      }),
    },
  );

  if (!response.ok) {
    console.error(
      `Error purchasing pattern:${response.status} ${response.statusText}`,
    );
    if (response.status === 401) {
      alert("You are not logged in. Please log in to purchase a pattern.");
    } else {
      alert("Something went wrong. Please try again later.");
    }
    return;
  }

  const { url } = await response.json();

  // Redirect to Stripe checkout

  // Flashist Adaptation
  // window.location.href = url;
  FlashistFacade.instance.changeHref(url);
}

export async function fetchCosmetics(): Promise<Cosmetics | null> {
  const cosmeticsUrl = `${getApiBase()}/cosmetics.json`;
  try {
    const response = await fetch(cosmeticsUrl);
    if (!response.ok) {
      warnCosmeticsFetchFailure(
        `Unable to load optional cosmetics config from ${cosmeticsUrl}: HTTP ${response.status}`,
      );
      return null;
    }
    const result = CosmeticsSchema.safeParse(await response.json());
    if (!result.success) {
      warnCosmeticsFetchFailure(
        `Unable to load optional cosmetics config from ${cosmeticsUrl}: invalid JSON schema`,
        result.error,
      );
      return null;
    }
    return result.data;
  } catch (error) {
    warnCosmeticsFetchFailure(
      `Unable to load optional cosmetics config from ${cosmeticsUrl}: fetch failed`,
      error,
    );
    return null;
  }
}

export function patternRelationship(
  pattern: Pattern,
  colorPalette: { name: string; isArchived?: boolean } | null,
  userMeResponse: UserMeResponse | false,
  affiliateCode: string | null,
): "owned" | "purchasable" | "blocked" {
  const flares =
    userMeResponse === false ? [] : (userMeResponse.player.flares ?? []);
  if (flares.includes("pattern:*")) {
    return "owned";
  }

  if (colorPalette === null) {
    // For backwards compatibility only show non-colored patterns if they are owned.
    if (flares.includes(`pattern:${pattern.name}`)) {
      return "owned";
    }
    return "blocked";
  }

  const requiredFlare = `pattern:${pattern.name}:${colorPalette.name}`;

  if (flares.includes(requiredFlare)) {
    return "owned";
  }

  if (pattern.product === null) {
    // We don't own it and it's not for sale, so don't show it.
    return "blocked";
  }

  if (colorPalette?.isArchived) {
    // We don't own the color palette, and it's archived, so don't show it.
    return "blocked";
  }

  if (affiliateCode !== pattern.affiliateCode) {
    // Pattern is for sale, but it's not the right store to show it on.
    return "blocked";
  }

  // Patterns is for sale, and it's the right store to show it on.
  return "purchasable";
}
