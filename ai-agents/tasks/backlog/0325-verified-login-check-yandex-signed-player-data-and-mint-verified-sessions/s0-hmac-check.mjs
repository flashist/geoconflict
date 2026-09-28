// s0-hmac-check.mjs — task 0325, spike S0, Step B. A THROWAWAY: never deployed, never imported by src/.
//
// WHAT IT DOES
//   1. Reads ONE signed string (`<signature>.<payload>`) from stdin. Trailing CR/LF is stripped
//      (clipboard safety); nothing else is changed.
//   2. Writes a small Node program to stdout. You pipe that program into `node` INSIDE the profile-api
//      container. There, the program:
//        - reads YANDEX_PAYMENTS_SECRET from the container's own environment (the key never leaves the box);
//        - checks the signature exactly the way src/profile-server/YandexSignature.ts
//          (verifySignedPayload) does: split at the first ".", base64-decode the signature, decode the
//          payload to UTF-8 text, HMAC-SHA256 keyed by the secret, compared with timingSafeEqual on
//          equal-length buffers only; an empty secret never matches;
//        - does it once per construction — HMAC over the base64 payload as sent, and over the decoded JSON;
//        - prints exactly these three lines and nothing else:
//              secret present: yes|NO
//              HMAC over base64 payload: MATCH|no
//              HMAC over decoded JSON: MATCH|no
//        - if anything throws, prints only `error: <the error's name>` (e.g. `error: TypeError`).
//
// WHAT IT NEVER PRINTS
//   The signature, the payload, the decoded JSON, the secret, any id or name, or any digest (whole or
//   partial). The payload is never parsed as JSON here: only the HMAC is checked.
//
// SAFETY RAILS
//   - Refuses to run if stdout is a terminal: the generated program embeds the signed string, so it must
//     go straight into the pipe, never onto your screen.
//   - Refuses to run if stdin is a terminal (nothing piped in).
//   - Writes no file. Uses Node built-ins only.
//
// USAGE (from the repo root; placeholders in <angle brackets>):
//   printf 'AAAA.e30=' | node <this-file> | ssh <ssh-alias> 'docker exec -i <container> node'
//   pbpaste            | node <this-file> | ssh <ssh-alias> 'docker exec -i <container> node'

if (process.stdout.isTTY || process.stdin.isTTY) {
  process.stderr.write(
    "refusing: pipe a signed string in, and pipe the output into node (see the header comment)\n",
  );
  process.exit(2);
}

try {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const signed = Buffer.concat(chunks).toString("utf8").replace(/[\r\n]+$/, "");

  // The generated program. The signed string is the only data in it, as a JSON.stringify literal on its
  // own line. It works whether the container's node reads stdin as CommonJS or as an ES module.
  const program = `
const signed =
${JSON.stringify(signed)};
try {
  const crypto = typeof require === "function" ? require("crypto") : process.getBuiltinModule("crypto");
  const secret = process.env.YANDEX_PAYMENTS_SECRET ?? "";
  let base64Match = false;
  let jsonMatch = false;
  const dotIndex = signed.indexOf(".");
  if (secret.length > 0 && dotIndex > 0 && dotIndex !== signed.length - 1) {
    const payloadPart = signed.slice(dotIndex + 1);
    const providedSignature = Buffer.from(signed.slice(0, dotIndex), "base64");
    const decodedPayload = Buffer.from(payloadPart, "base64").toString("utf8");
    const matches = (message) => {
      const expected = crypto.createHmac("sha256", secret).update(message).digest();
      return expected.length === providedSignature.length && crypto.timingSafeEqual(expected, providedSignature);
    };
    if (providedSignature.length > 0 && decodedPayload.length > 0) {
      base64Match = matches(payloadPart);
      jsonMatch = matches(decodedPayload);
    }
  }
  console.log("secret present: " + (secret.length > 0 ? "yes" : "NO"));
  console.log("HMAC over base64 payload: " + (base64Match ? "MATCH" : "no"));
  console.log("HMAC over decoded JSON: " + (jsonMatch ? "MATCH" : "no"));
} catch (error) {
  console.log("error: " + (error && error.name ? error.name : "unknown"));
}
`;
  process.stdout.write(program);
} catch (error) {
  process.stderr.write("error: " + (error && error.name ? error.name : "unknown") + "\n");
  process.exit(1);
}
