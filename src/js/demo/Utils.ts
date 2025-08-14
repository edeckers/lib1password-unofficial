export const $ = (selector: string) => {
  const o = document.querySelector(selector);
  if (!o) {
    throw Error(`Element not found for selector ${selector}`);
  }

  return o as HTMLElement;
};
