// Written as base64url without padding (RFC 4648 section 5), as 1Password and
// JOSE write it. Read in either alphabet: the two share no characters, and
// vaults written by earlier versions of this library use the standard one.
const toBase64Url = (standardBase64: string) =>
  standardBase64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const toStandardBase64 = (base64: string) =>
  base64.replace(/-/g, "+").replace(/_/g, "/");

const toStandardBase64FromBytes = (bytes: Uint8Array) => {
  if (typeof window !== "undefined") {
    return window.btoa(String.fromCharCode(...bytes));
  }

  // eslint-disable-next-line no-undef
  return Buffer.from(bytes).toString("base64");
};

const base64encode = (bytes: Uint8Array) =>
  toBase64Url(toStandardBase64FromBytes(bytes));

const base64decode = (base64: string) => {
  const str = toStandardBase64(base64);

  if (typeof window !== "undefined") {
    const binaryString = window.atob(str);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes;
  }

  // eslint-disable-next-line no-undef
  return new Uint8Array(Buffer.from(str, "base64"));
};

const enc = new TextEncoder();
const dec = new TextDecoder();

const stringToArrayBuffer = (message: string) => enc.encode(message);
const arrayBufferToString = (buffer: ArrayBuffer) => dec.decode(buffer);

export { base64encode, base64decode, stringToArrayBuffer, arrayBufferToString };
