import {
  Difficulty,
  GameMapSize,
  GameMapType,
  GameMode,
  GameType,
} from "../src/core/game/Game";
import { generatePrivateLobbyCode } from "../src/core/PrivateLobbyCode";
import {
  ClientJoinMessageSchema,
  ClientMessageSchema,
  ClientUpdateIdentitySchema,
  GameStartInfoSchema,
  ID,
} from "../src/core/Schemas";

// A minimal join message whose other fields satisfy their schemas:
// - clientID / gameID: 8-char alphanumeric (ID schema)
// - token: a UUID literal (TokenSchema accepts a UUID via PersistentIdSchema)
// - username: a name that passes the shared name rule (task 0307)
function baseJoinMessage(): Record<string, unknown> {
  return {
    type: "join",
    clientID: "abcd1234",
    token: "123e4567-e89b-12d3-a456-426614174000",
    gameID: "game5678",
    lastTurn: 0,
    username: "player",
  };
}

describe("ClientJoinMessageSchema yandexPlayerId", () => {
  test("accepts a string yandexPlayerId and preserves it", () => {
    const result = ClientJoinMessageSchema.safeParse({
      ...baseJoinMessage(),
      yandexPlayerId: "yandex-unique-id-123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.yandexPlayerId).toBe("yandex-unique-id-123");
    }
  });

  test("accepts a null yandexPlayerId (guest)", () => {
    const result = ClientJoinMessageSchema.safeParse({
      ...baseJoinMessage(),
      yandexPlayerId: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.yandexPlayerId).toBeNull();
    }
  });

  test("accepts an omitted yandexPlayerId (backwards compatible)", () => {
    const result = ClientJoinMessageSchema.safeParse(baseJoinMessage());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.yandexPlayerId).toBeUndefined();
    }
  });

  test("rejects a non-string, non-null yandexPlayerId", () => {
    const result = ClientJoinMessageSchema.safeParse({
      ...baseJoinMessage(),
      yandexPlayerId: 12345,
    });
    expect(result.success).toBe(false);
  });

  test("accepts a yandexPlayerId at the max length boundary (256)", () => {
    const result = ClientJoinMessageSchema.safeParse({
      ...baseJoinMessage(),
      yandexPlayerId: "x".repeat(256),
    });
    expect(result.success).toBe(true);
  });

  test("rejects an oversize yandexPlayerId (257)", () => {
    const result = ClientJoinMessageSchema.safeParse({
      ...baseJoinMessage(),
      yandexPlayerId: "x".repeat(257),
    });
    expect(result.success).toBe(false);
  });
});

// Task 0307 (F4): the game server now enforces the name rule on the JOIN name —
// before this it took any SafeString of up to 1000 characters, including the
// right-to-left override, and relayed it raw to every other player's lobby list.
describe("ClientJoinMessageSchema username (task 0307)", () => {
  const withName = (username: unknown) =>
    ClientJoinMessageSchema.safeParse({ ...baseJoinMessage(), username });

  test.each([
    ["an HTML tag", "<script>"],
    ["a single quote", "O'Brien"],
    ["the right-to-left override U+202E", "ab\u202Ecd"],
    ["a zero-width space", "ab\u200Bcd"],
    ["28 characters", "a".repeat(28)],
    ["a too-short name", "ab"],
    ["the empty name", ""],
    ["an emoji", "Cat\u{1F408}User"],
    ["a non-string", 12345],
  ])("refuses %s", (_label, username) => {
    expect(withName(username).success).toBe(false);
  });

  test.each([
    ["Cyrillic", "Привет123"],
    ["underscore, brackets and a space", "Name_1 [TAG]"],
    ["exactly 27 characters", "a".repeat(27)],
    ["exactly 3 characters", "abc"],
    ["a generated guest name", "Anon1234"],
  ])("accepts %s, unchanged", (_label, username) => {
    const result = withName(username);
    expect(result.success).toBe(true);
    expect(result.data?.username).toBe(username);
  });

  // 0307 review R2: the join check trims first, like the name input and the
  // profile server. Untrimmed, "   " is three characters of `\s` and passed.
  test.each([
    ["three spaces", "   "],
    ["a tab and spaces", " \t "],
    ["a name that is too short once trimmed", "  ab  "],
    ["28 letters behind an edge space", " " + "a".repeat(28)],
  ])("refuses %s", (_label, username) => {
    expect(withName(username).success).toBe(false);
  });

  test.each([
    [" Bob", "Bob"],
    ["Bob ", "Bob"],
    ["  Name_1 [TAG]  ", "Name_1 [TAG]"],
    [" " + "a".repeat(27) + " ", "a".repeat(27)],
  ])(
    "trims %j to %j before checking, and keeps the trimmed name",
    (username, trimmed) => {
      const result = withName(username);
      expect(result.success).toBe(true);
      expect(result.data?.username).toBe(trimmed);
    },
  );

  // Only the JOIN is narrowed. Bot, nation and archived names travel in
  // PlayerSchema / AiPlayerSchema, and a game start must never fail over a name.
  test("GameStartInfo still accepts bot/nation names the join schema refuses", () => {
    const result = GameStartInfoSchema.safeParse({
      gameID: "game1234",
      config: {
        gameMap: GameMapType.World,
        difficulty: Difficulty.Medium,
        donateGold: false,
        donateTroops: false,
        gameType: GameType.Private,
        gameMode: GameMode.FFA,
        gameMapSize: GameMapSize.Normal,
        disableNPCs: false,
        bots: 0,
        infiniteGold: false,
        infiniteTroops: false,
        instantBuild: false,
      },
      players: [{ clientID: "aaaa1111", username: "Player One" }],
      aiPlayers: [
        { clientID: "bbbb2222", username: "Côte d'Ivoire" },
        { clientID: "cccc3333", username: "ab" },
      ],
    });
    expect(result.success).toBe(true);
    expect(withName("Côte d'Ivoire").success).toBe(false);
  });
});

// Task 0389: private-lobby codes are a subset of the shared `ID`, so the join
// message, the game start and every other game-id field take them unchanged —
// no wider game-id schema was needed, and `ID` itself did not change.
describe("ID and private-lobby codes (task 0389)", () => {
  test("ID is unchanged: 8 characters of [a-zA-Z0-9]", () => {
    expect(ID.safeParse("abcd1234").success).toBe(true);
    expect(ID.safeParse("AbC12345").success).toBe(true);
    expect(ID.safeParse("abcd123").success).toBe(false);
    expect(ID.safeParse("abcd12345").success).toBe(false);
    expect(ID.safeParse("abcd-123").success).toBe(false);
  });

  test("a join message carries a new private-lobby code as its gameID", () => {
    const code = generatePrivateLobbyCode();
    const result = ClientJoinMessageSchema.safeParse({
      ...baseJoinMessage(),
      gameID: code,
    });
    expect(result.success).toBe(true);
    expect(ID.safeParse("K7M4PCRX").success).toBe(true);
  });
});

// Task 0332 (ADR-124). The profile session token rides the join and the late
// update_identity. A malformed token must NEVER fail the message — a failed join
// parse closes the socket (1002) — so it is read as absent instead (report §5.1).
describe("profileSession on join and update_identity (task 0332)", () => {
  const TOKEN = "v1.synthetic-payload.synthetic-mac";

  function baseUpdateIdentity(): Record<string, unknown> {
    return { type: "update_identity", yandexPlayerId: "yandex-unique-id-123" };
  }

  test("a join with a token parses and keeps it", () => {
    const result = ClientJoinMessageSchema.safeParse({
      ...baseJoinMessage(),
      profileSession: TOKEN,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.profileSession).toBe(TOKEN);
    }
  });

  test("an update_identity with a token parses and keeps it", () => {
    const result = ClientUpdateIdentitySchema.safeParse({
      ...baseUpdateIdentity(),
      profileSession: TOKEN,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.profileSession).toBe(TOKEN);
    }
  });

  test("a missing token is fine on both messages", () => {
    const join = ClientJoinMessageSchema.safeParse(baseJoinMessage());
    const update = ClientUpdateIdentitySchema.safeParse(baseUpdateIdentity());
    expect(join.success).toBe(true);
    expect(update.success).toBe(true);
    if (join.success) expect(join.data.profileSession).toBeUndefined();
    if (update.success) expect(update.data.profileSession).toBeUndefined();
  });

  test("the 1024-character boundary is kept", () => {
    const result = ClientJoinMessageSchema.safeParse({
      ...baseJoinMessage(),
      profileSession: "t".repeat(1024),
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.profileSession).toHaveLength(1024);
    }
  });

  test.each([
    ["too long (1025)", "t".repeat(1025)],
    ["a number", 42],
    ["empty", ""],
    ["null", null],
    ["an object", { token: "x" }],
  ])(
    "a token that is %s reads as absent and the message still parses",
    (_label, profileSession) => {
      const join = ClientJoinMessageSchema.safeParse({
        ...baseJoinMessage(),
        yandexPlayerId: "yandex-unique-id-123",
        profileSession,
      });
      expect(join.success).toBe(true);
      if (join.success) {
        expect(join.data.profileSession).toBeUndefined();
        expect(join.data.yandexPlayerId).toBe("yandex-unique-id-123");
      }
      const update = ClientMessageSchema.safeParse({
        ...baseUpdateIdentity(),
        profileSession,
      });
      expect(update.success).toBe(true);
      if (update.success && update.data.type === "update_identity") {
        expect(update.data.profileSession).toBeUndefined();
        expect(update.data.yandexPlayerId).toBe("yandex-unique-id-123");
      }
    },
  );

  test("an update_identity without yandexPlayerId still fails (old servers need it)", () => {
    const result = ClientUpdateIdentitySchema.safeParse({
      type: "update_identity",
      profileSession: TOKEN,
    });
    expect(result.success).toBe(false);
  });
});
