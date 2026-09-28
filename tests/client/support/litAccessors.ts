// Task 0327. A test helper, not a test.

// Under this jest/SWC build, class fields are defined on the instance and
// shadow Lit's @state/@query prototype accessors (the "decorator updates are
// unreliable under the test build" note in HostLobbyModal.ts). Re-expose the
// accessors so the real components query and re-render as in the browser.
export function exposeLitAccessors(element: object): void {
  const target = element as Record<string, unknown>;
  for (const key of Object.keys(target)) {
    let proto: object | null = Object.getPrototypeOf(target);
    let descriptor: PropertyDescriptor | undefined;
    while (proto !== null && descriptor === undefined) {
      descriptor = Object.getOwnPropertyDescriptor(proto, key);
      proto = Object.getPrototypeOf(proto);
    }
    if (descriptor?.get === undefined) continue;
    const value = target[key];
    delete target[key];
    if (descriptor.set !== undefined) target[key] = value;
  }
}
