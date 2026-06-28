import WebSocket from "ws";
import { ClientID } from "../../src/core/Schemas";
import { Client } from "../../src/server/Client";

function makeClient(yandexPlayerId: string | null): Client {
  return new Client(
    "abcd1234" as ClientID,
    "persistent-1",
    null,
    undefined,
    undefined,
    "127.0.0.1",
    "player",
    {} as unknown as WebSocket,
    undefined,
    yandexPlayerId,
  );
}

describe("Client.setYandexPlayerIdIfUnset", () => {
  test("sets the id and reports a change when currently null", () => {
    const client = makeClient(null);
    expect(client.setYandexPlayerIdIfUnset("yx-resolved")).toBe(true);
    expect(client.yandexPlayerId).toBe("yx-resolved");
  });

  test("refuses to overwrite an already-known id (no hijack)", () => {
    const client = makeClient("original");
    expect(client.setYandexPlayerIdIfUnset("attacker")).toBe(false);
    expect(client.yandexPlayerId).toBe("original");
  });
});
