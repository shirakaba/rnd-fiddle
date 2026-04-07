declare module "event-target-shim" {
  const EventImpl: typeof Event;
  const EventTargetImpl: typeof EventTarget;

  export { EventImpl as Event, EventTargetImpl as EventTarget };
}
