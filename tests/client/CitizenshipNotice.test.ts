jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  flashist_logEventAnalytics: jest.fn(),
  flashistConstants: {
    analyticEvents: {
      CITIZENSHIP_STATUS_UNVERIFIED: "Citizenship:Status:Unverified",
      CITIZENSHIP_STATUS_READ_FAILED: "Citizenship:Status:ReadFailed",
    },
  },
}));

import {
  type CitizenshipNotice,
  type CitizenshipNoticeInputs,
  deriveCitizenshipNotice,
  reportCitizenshipNoticeShown,
  resetCitizenshipNoticeReportedForTests,
} from "../../src/client/CitizenshipNotice";
import type { ProfileVerificationStatus } from "../../src/client/CitizenshipStatus";
import { flashist_logEventAnalytics } from "../../src/client/flashist/FlashistFacade";

const logEventAnalytics = flashist_logEventAnalytics as jest.Mock;

// Task 0397: the card's session status line, from owner rulings Q1–Q3.
describe("deriveCitizenshipNotice", () => {
  const STATUSES: ProfileVerificationStatus[] = [
    "unknown",
    "guest",
    "read_failed",
    "unverified",
    "verified",
  ];

  /** The approved table B, written out independently of the code. */
  function expected(inputs: CitizenshipNoticeInputs): CitizenshipNotice {
    const { verificationStatus: status } = inputs;
    if (status === "unknown") return "checking";
    if (status === "guest") return "none";
    if (status === "read_failed") {
      return inputs.restartedAfterReadFailure ? "still_failing" : "read_failed";
    }
    if (status === "unverified")
      return inputs.isCitizen ? "unverified" : "none";
    return inputs.isPaidCitizen ? "verified_paid" : "none";
  }

  const combos: CitizenshipNoticeInputs[] = [];
  for (const verificationStatus of STATUSES) {
    for (const isCitizen of [false, true]) {
      for (const isPaidCitizen of [false, true]) {
        for (const restartedAfterReadFailure of [false, true]) {
          combos.push({
            verificationStatus,
            isCitizen,
            isPaidCitizen,
            restartedAfterReadFailure,
          });
        }
      }
    }
  }

  it.each(combos.map((c) => [JSON.stringify(c), c] as const))(
    "%s",
    (_label, inputs) => {
      expect(deriveCitizenshipNotice(inputs)).toBe(expected(inputs));
    },
  );

  it.each([
    ["unknown", "checking"],
    ["guest", "none"],
  ] as const)("%s → %s whatever the other inputs", (status, notice) => {
    for (const c of combos.filter((x) => x.verificationStatus === status)) {
      expect(deriveCitizenshipNotice(c)).toBe(notice);
    }
  });

  // Brief verification step 3: the verified-paid line only on a VERIFIED
  // session whose published paid answer is true — never on an unverified one.
  it("verified_paid appears only for verified + paid", () => {
    for (const c of combos) {
      const shown = deriveCitizenshipNotice(c) === "verified_paid";
      expect(shown).toBe(
        c.verificationStatus === "verified" && c.isPaidCitizen,
      );
    }
  });

  it("an unverified session never shows verified_paid, even with paid published", () => {
    expect(
      deriveCitizenshipNotice({
        verificationStatus: "unverified",
        isCitizen: true,
        isPaidCitizen: true,
        restartedAfterReadFailure: false,
      }),
    ).toBe("unverified");
  });

  it("an unverified NON-citizen sees nothing new (Q1: they cannot have paid)", () => {
    expect(
      deriveCitizenshipNotice({
        verificationStatus: "unverified",
        isCitizen: false,
        isPaidCitizen: false,
        restartedAfterReadFailure: false,
      }),
    ).toBe("none");
  });
});

describe("reportCitizenshipNoticeShown", () => {
  beforeEach(() => {
    logEventAnalytics.mockClear();
    resetCitizenshipNoticeReportedForTests();
  });

  it("logs Unverified at most once per page", () => {
    reportCitizenshipNoticeShown("unverified");
    reportCitizenshipNoticeShown("unverified");

    expect(logEventAnalytics.mock.calls).toEqual([
      ["Citizenship:Status:Unverified"],
    ]);
  });

  it("logs ReadFailed at most once per page, shared with still_failing", () => {
    reportCitizenshipNoticeShown("read_failed");
    reportCitizenshipNoticeShown("still_failing");
    reportCitizenshipNoticeShown("read_failed");

    expect(logEventAnalytics.mock.calls).toEqual([
      ["Citizenship:Status:ReadFailed"],
    ]);
  });

  it("still_failing alone logs ReadFailed", () => {
    reportCitizenshipNoticeShown("still_failing");
    expect(logEventAnalytics.mock.calls).toEqual([
      ["Citizenship:Status:ReadFailed"],
    ]);
  });

  it("the two latches are independent", () => {
    reportCitizenshipNoticeShown("read_failed");
    reportCitizenshipNoticeShown("unverified");
    expect(logEventAnalytics).toHaveBeenCalledTimes(2);
  });

  it.each(["none", "checking", "verified_paid"] as const)(
    "%s logs nothing",
    (notice) => {
      reportCitizenshipNoticeShown(notice);
      expect(logEventAnalytics).not.toHaveBeenCalled();
    },
  );

  it("logs with no value or id — the event name only", () => {
    reportCitizenshipNoticeShown("unverified");
    expect(logEventAnalytics.mock.calls[0]).toHaveLength(1);
  });
});
