export const assert = (test: boolean, message: string) => {
  if (test) {
    return;
  }

  throw new Error(message);
};

export const assertHasValue = <T>(v: T | null | undefined) => {
  assert(!!v, "Value cannot be empty");

  return v as T;
};

export const toHexString = (byteArray: Uint8Array) =>
  Array.from(byteArray, (byte) =>
    ("0" + (byte & 0xff).toString(16)).slice(-2),
  ).join("");
