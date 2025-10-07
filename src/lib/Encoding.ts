const base64encode = (bytes: Uint8Array) => {
  if (typeof window !== "undefined") {
    return window.btoa(String.fromCharCode(...bytes));
  }

  // eslint-disable-next-line no-undef
  return Buffer.from(bytes).toString("base64");
};

const base64decode = (str: string) => {
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
