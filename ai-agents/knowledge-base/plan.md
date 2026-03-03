Plan: Improve Worker Initialization Error Handling
                                     
 Context

 Sentry issue https://flashist.sentry.io/issues/7300179379/ reports
 Error: Worker initialization timeout as an unhandled promise rejection (last seen
 Mar 3, 12:26 PM). This is the 5-second timeout in WorkerClient.initialize() firing
 because the worker never sends the initialized acknowledgement — the worker crashed
 on startup (due to the window.matchMedia bug fixed in PR #23, now awaiting deploy).

 Two problems remain even after that root cause is fixed:

 1. Worker crashes are invisible: There is no worker.onerror listener. When the
 worker throws an uncaught exception, the browser fires an ErrorEvent on the
 worker object — currently ignored. The main thread waits the full 5 seconds before
 timing out, with no information about what went wrong.
 2. Initialization failure is unhandled: await worker.initialize() at
 ClientGameRunner.ts:173 has no try/catch. A rejection propagates as an
 unhandled promise rejection — blank screen, no user-facing message.

 ---
 Fix

 Change 1 — src/core/worker/WorkerClient.ts: propagate worker crashes immediately

 Add a worker.onerror listener in the constructor that rejects the pending
 initialize() promise right away instead of waiting 5 seconds.

 // Add private field to class:
 private initReject?: (err: Error) => void;

 // In constructor, after setting up the message listener:
 this.worker.addEventListener("error", (event: ErrorEvent) => {
   if (this.initReject) {
     this.initReject(new Error(`Worker crashed: ${event.message}`));
     this.initReject = undefined;
   }
 });

 // In initialize(), store and clear the reject reference:
 initialize(): Promise<void> {
   return new Promise((resolve, reject) => {
     this.initReject = reject;             // ← store for onerror

     const messageId = generateID();
     this.messageHandlers.set(messageId, (message) => {
       if (message.type === "initialized") {
         this.isInitialized = true;
         this.initReject = undefined;      // ← clear on success
         resolve();
       }
     });

     this.worker.postMessage({ type: "init", id: messageId, ... });

     setTimeout(() => {
       if (!this.isInitialized) {
         this.initReject = undefined;      // ← clear on timeout
         this.messageHandlers.delete(messageId);
         reject(new Error("Worker initialization timeout"));
       }
     }, 5000);
   });
 }

 Change 2 — src/client/ClientGameRunner.ts: catch failure and show error modal

 Wrap await worker.initialize() (line 173) in a try/catch and call the existing
 showErrorModal() function on failure.

 try {
   await worker.initialize();
 } catch (err) {
   showErrorModal(
     err instanceof Error ? err.message : String(err),
     undefined,
     lobbyConfig.gameStartInfo.gameID,
     lobbyConfig.clientID,
     true,
     false,
     "error_modal.crashed",
   );
   return;  // abort — do not proceed to create GameView/renderer
 }

 showErrorModal() already exists at line 802 of ClientGameRunner.ts and is the
 established pattern for all other error cases (connection errors, desync, server
 errors). No new UI component needed.

 ---
 Files to Modify

 ┌─────────────────────────────────┬─────────────────────────────────────────────────────────────────────────────────────────┐
 │              File               │                                         Change                                          │
 ├─────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
 │ src/core/worker/WorkerClient.ts │ Add initReject field + worker.onerror listener; clear initReject on resolve and timeout │
 ├─────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────┤
 │ src/client/ClientGameRunner.ts  │ Wrap await worker.initialize() in try/catch → call showErrorModal()                     │
 └─────────────────────────────────┴─────────────────────────────────────────────────────────────────────────────────────────┘

 No localization changes needed — "error_modal.crashed" / "Game crashed!" already
 exists in en.json and ru.json and is appropriate for this failure.

 ---
 Verification

 1. Simulate worker crash: Temporarily add throw new Error("test") at the top of
 Worker.worker.ts — the error modal should appear immediately (not after 5s).
 2. Simulate timeout: Comment out the sendMessage({ type: "initialized" }) line —
 error modal should appear after 5 seconds.
 3. Normal flow: Start a game normally — initialization should proceed as before,
 no modal shown.
 4. TypeScript: npx tsc --noEmit — no new errors.
