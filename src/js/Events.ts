// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sendEvent = (eventName: string, detail: any = {}): void => {
  const event = new CustomEvent(eventName, { detail });

  document.dispatchEvent(event);
};

export const listenEvent = (
  eventName: string,
  callback: (event: CustomEvent) => void,
): void => {
  document.addEventListener(eventName, (event) => {
    callback(event as CustomEvent);
  });
};
