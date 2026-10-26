// A start-up error from the module, subscriber or port registries (Phase 0 spec PS-15,
// PS-16, §4.8). The message names the subscriber, port, namespace, route or type that is
// wrong, and never contains an input value. Both process entry points turn it into one
// FATAL line and exit 1 before the API listens or the worker claims an event.
export class RegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RegistryError";
  }
}
