// The fixed tester roles (task 0425): every role is consistent with the citizenship
// rules (src/core/profile/Citizenship.ts) and with the three `players` CHECK
// constraints (migrations/006). Real Postgres proves the same in
// tests/integration/TesterRole.it.test.ts.

import {
  CITIZENSHIP_XP_THRESHOLD,
  XP_PER_MATCH,
  isCitizenFromXp,
} from "../../src/core/profile/Citizenship";
import {
  TESTER_NON_CITIZEN_XP,
  TESTER_ROLES,
  TESTER_ROLE_IDS,
  isTesterRoleId,
} from "../../src/profile-server/TesterRoles";

describe("tester roles (task 0425)", () => {
  it("has exactly the five owner-ruled roles", () => {
    expect([...TESTER_ROLE_IDS].sort()).toEqual(
      [
        "almost-citizen",
        "brand-new",
        "earned-citizen",
        "non-citizen",
        "paid-citizen",
      ].sort(),
    );
  });

  it.each(TESTER_ROLE_IDS)("%s: its id matches its key", (id) => {
    expect(TESTER_ROLES[id].id).toBe(id);
    expect(isTesterRoleId(id)).toBe(true);
  });

  it("isTesterRoleId refuses anything else, including prototype keys", () => {
    for (const value of [
      "",
      "admin",
      "toString",
      "__proto__",
      "EARNED-CITIZEN",
    ]) {
      expect(isTesterRoleId(value)).toBe(false);
    }
  });

  it("the table and every role are frozen (values never change at run time)", () => {
    expect(Object.isFrozen(TESTER_ROLES)).toBe(true);
    for (const id of TESTER_ROLE_IDS) {
      expect(Object.isFrozen(TESTER_ROLES[id])).toBe(true);
    }
  });

  it.each(TESTER_ROLE_IDS)(
    "%s satisfies the players CHECK constraints",
    (id) => {
      const role = TESTER_ROLES[id];
      // chk_paid_implies_citizen
      expect(!role.isPaidCitizen || role.isCitizen).toBe(true);
      // chk_purchased_implies_paid
      expect(!role.stampPurchasedAt || role.isPaidCitizen).toBe(true);
      // chk_earned_implies_citizen
      expect(!role.stampEarnedAt || role.isCitizen).toBe(true);
      // xp >= 0
      expect(role.xp).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(role.xp)).toBe(true);
    },
  );

  it.each(TESTER_ROLE_IDS.filter((id) => !TESTER_ROLES[id].isPaidCitizen))(
    "%s (not paid): is_citizen agrees with the XP threshold rule",
    (id) => {
      const role = TESTER_ROLES[id];
      expect(role.isCitizen).toBe(isCitizenFromXp(role.xp));
      // An earned citizen always carries the earned stamp, and only it.
      expect(role.stampEarnedAt).toBe(role.isCitizen);
    },
  );

  it("almost-citizen is exactly one match credit short of the threshold", () => {
    expect(TESTER_ROLES["almost-citizen"].xp).toBe(
      CITIZENSHIP_XP_THRESHOLD - XP_PER_MATCH,
    );
    expect(isCitizenFromXp(TESTER_ROLES["almost-citizen"].xp)).toBe(false);
    expect(
      isCitizenFromXp(TESTER_ROLES["almost-citizen"].xp + XP_PER_MATCH),
    ).toBe(true);
  });

  it("non-citizen sits strictly between 0 and almost-citizen", () => {
    expect(TESTER_ROLES["non-citizen"].xp).toBe(TESTER_NON_CITIZEN_XP);
    expect(TESTER_NON_CITIZEN_XP).toBeGreaterThan(0);
    expect(TESTER_NON_CITIZEN_XP).toBeLessThan(
      TESTER_ROLES["almost-citizen"].xp,
    );
  });

  it("earned-citizen is what the first threshold crossing leaves", () => {
    expect(TESTER_ROLES["earned-citizen"]).toMatchObject({
      xp: CITIZENSHIP_XP_THRESHOLD,
      isCitizen: true,
      isPaidCitizen: false,
      stampEarnedAt: true,
      stampPurchasedAt: false,
    });
  });

  it("paid-citizen is a buyer who never earned: paid + citizen + purchased, no earned stamp", () => {
    const role = TESTER_ROLES["paid-citizen"];
    expect(role).toMatchObject({
      isCitizen: true,
      isPaidCitizen: true,
      stampEarnedAt: false,
      stampPurchasedAt: true,
    });
    expect(isCitizenFromXp(role.xp)).toBe(false);
  });

  it("only brand-new resets the tenure grant, and it is a fresh row's values", () => {
    for (const id of TESTER_ROLE_IDS) {
      expect(TESTER_ROLES[id].clearTenureGrant).toBe(id === "brand-new");
    }
    expect(TESTER_ROLES["brand-new"]).toMatchObject({
      xp: 0,
      isCitizen: false,
      isPaidCitizen: false,
      stampEarnedAt: false,
      stampPurchasedAt: false,
    });
  });
});
