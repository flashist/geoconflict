# GeoConflict Licensing Brief

**Subject:** Legal status of GeoConflict as a derivative of OpenFront
**Audience:** GeoConflict team
**Status:** Internal working document — informational, not legal advice

---

## Disclaimer

This document is an analysis of the OpenFront license texts (AGPL v3 + CC BY-SA 4.0 + proprietary asset notice). It is **not legal advice** and was not produced by an attorney. Before we monetize at scale, we should have a Russian IP lawyer review our compliance posture and the interaction between AGPL obligations and Yandex.Games platform terms.

---

## TL;DR

We **can** develop, publish, and monetize GeoConflict on Yandex.Games. The licenses permit commercial use. But we inherit three hard obligations that shape how we build and run the business:

1. Our entire codebase must be public, under AGPL v3.
2. Every player must be offered a way to download our current source code.
3. We cannot use any asset from OpenFront's `/proprietary` folder, CDN, database, or API — only assets from `/resources` (which themselves require attribution and stay CC BY-SA 4.0).

The "Based on OpenFront" attribution we already display on the main menu satisfies the Section 7 attribution requirement.

---

## The licenses governing OpenFront

| Component | License | Effect on us |
|---|---|---|
| Source code | AGPL v3 + Section 7 attribution | Strong copyleft including network use |
| Assets in `/resources` | CC BY-SA 4.0 | Free to use commercially with attribution and ShareAlike |
| Assets in `/proprietary` | All Rights Reserved | Off-limits |
| Assets on OpenFront CDN / DB / API | Proprietary | Off-limits |

---

## What we are allowed to do

- Charge money for the game (in-game purchases, ads, premium features, etc.).
- Modify the code freely.
- Use a different game title and our own branding ("GeoConflict").
- Distribute on Yandex.Games and other platforms.
- Use and modify assets from `/resources`.

---

## What we MUST do

### 1. Release our full source code under AGPL v3

Our codebase is a derivative work of OpenFront. Every modification, addition, and integration we write that is combined with OpenFront code falls under AGPL v3. Concretely:

- Maintain a public source repository (GitHub or equivalent) containing the full current source.
- Include the AGPL v3 license text and copyright notices in the repository.
- Preserve the Section 7 attribution requirement for anyone who forks our fork.

### 2. Comply with AGPL Section 13 — the network clause

This is the most consequential obligation for a web game on Yandex.Games. Section 13 requires that any user interacting with our modified version "remotely through a computer network" must be offered a way to receive the corresponding source code.

Practical requirements:

- A prominently visible link in the game UI (main menu, settings, or footer) leading to our public source repository.
- The published source must match what is actually running in production. We must update it as we deploy.
- Source must be offered at no charge.

A "Source Code" link next to the "Based on OpenFront" attribution is the standard pattern.

### 3. Display the Section 7 attribution

Already in place. The main menu shows "Based on OpenFront" — this satisfies the requirement. Acceptable variants per the license:

- "Based on OpenFront"
- "Derived from OpenFront"
- "Powered by OpenFront"
- "Fork of OpenFront"

A link to https://openfront.io may be included alongside but is not required.

### 4. Attribute and share-alike for `/resources` assets

Any asset we use from the `/resources` directory:

- Must be attributed to "OpenFront" or "OpenFront LLC".
- If we modify it, our derivative version must also be released under CC BY-SA 4.0.

This means **we cannot lock down modified resource assets as proprietary GeoConflict-only content.**

---

## What we MUST NOT do

- **Use anything from `/proprietary`.** This folder is All Rights Reserved. Audit our build pipeline to confirm nothing from `/proprietary` ends up in the production bundle.
- **Use assets from OpenFront's CDN, database, or API.** Same legal status as `/proprietary`. If our client fetches anything from OpenFront infrastructure, that's infringement.
- **Use "OpenFront" as our primary game title or imply official endorsement.** Our title is GeoConflict — fine. Marketing copy should not present us as an "official" or "authorized" version.
- **Combine AGPL code with code under incompatible licenses** in ways that prevent us from releasing the combined work under AGPL v3.

---

## Business implications

### The competitive moat shifts

Because our full source must be public under AGPL, anyone — including OpenFront LLC themselves or a competitor on Yandex.Games — can legally take our code, rebuild it, and publish a competing version. Our defensible value lives **above the code**:

- Yandex.Games platform integration and SDK expertise
- Russian-market localization and live-ops
- Community, monetization tuning, and relationships with Yandex
- Speed of iteration

### Premium content and monetization

We can sell premium skins, passes, etc. But if a premium skin is implemented as AGPL-covered code or CC BY-SA 4.0 derivative assets, players who purchase it receive content under those licenses and can legally redistribute it.

Monetization should lean on convenience, social signaling, time-savers, and live-service value rather than on technical exclusivity that competitors literally cannot copy.

### Server-side code

If GeoConflict has a backend (matchmaking, leaderboards, analytics, anti-cheat) that links against OpenFront code, that backend is also AGPL and must be released. If our backend is fully independent and only communicates with the client over a network protocol without sharing code, it may sit outside AGPL — but this is a fuzzy boundary and is exactly the kind of architecture question to put in front of a lawyer.

### Trademark caution

OpenFront was at one point asserted as a registered trademark. Even though the trademark notice was removed from the current LICENSE file, trademark rights exist independently of license text. Keep "OpenFront" mentions limited to the attribution line and source repository. Do not use it in marketing, store listings, screenshots, or descriptions beyond what is required for attribution.

---

## Action items

### Engineering

- [ ] Create a public GitHub repository for GeoConflict source under AGPL v3.
- [ ] Add the AGPL v3 LICENSE file, asset license file, and copyright notices to the repo.
- [ ] Set up a process to keep the public repo in sync with what's deployed to production.
- [ ] Add a "Source Code" link in the main menu next to the existing "Based on OpenFront" attribution.
- [ ] Audit the build pipeline: confirm nothing from `/proprietary` or OpenFront CDN is in our production bundle.
- [ ] Inventory all assets currently in use, mark their origin (`/resources` vs. our own vs. third-party), and confirm attribution coverage.

### Product / business

- [ ] Review monetization plans against AGPL/CC BY-SA realities — confirm nothing depends on technical exclusivity.
- [ ] Review marketing copy and store listing for any uses of "OpenFront" beyond required attribution.
- [ ] Verify the in-game attribution placement remains visible after any UI changes.

### Legal

- [ ] Engage a Russian IP lawyer for a compliance review before scaling monetization.
- [ ] Specifically ask the lawyer about: AGPL Section 13 compliance for web games, interaction between AGPL and the Yandex.Games developer agreement, and the boundary between client and any future server-side code.

---

## Open questions for legal counsel

1. Does our planned backend architecture qualify as a separate work, or is it considered linked to AGPL code?
2. Are there any clauses in the Yandex.Games developer agreement that conflict with our AGPL Section 13 obligations?
3. What is the trademark exposure from naming "OpenFront" in our attribution and store description in the Russian market?
4. What happens to player-generated content (replays, custom maps, etc.) under these licenses?
5. If we accept external contributions to GeoConflict, what contributor agreement should we use?

---

## Reference: source files

- `LICENSE` — AGPL v3 with Section 7 additional attribution terms
- `LICENSE-ASSETS` — CC BY-SA 4.0 for `/resources`, All Rights Reserved for `/proprietary`
- `LICENSING.md` — Project licensing history and notices

All three are in the OpenFront repository root and should be preserved in our fork.
