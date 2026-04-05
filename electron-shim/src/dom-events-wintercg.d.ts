declare module "dom-events-wintercg" {
  const AbortControllerImpl: typeof AbortController;
  const AbortSignalImpl: typeof AbortSignal;
  const CustomEventImpl: typeof CustomEvent;
  const DOMExceptionImpl: typeof DOMException;
  const EventImpl: typeof Event;
  const EventTargetImpl: typeof EventTarget;

  export {
    AbortControllerImpl as AbortController,
    AbortSignalImpl as AbortSignal,
    CustomEventImpl as CustomEvent,
    DOMExceptionImpl as DOMException,
    EventImpl as Event,
    EventTargetImpl as EventTarget,
  };
}
