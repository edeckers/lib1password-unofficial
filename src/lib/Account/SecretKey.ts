import { assert, toHexString } from "~/lib/Utils";
import { EncryptedVaultItem } from "~/lib/Vault/Entities";
import { arrayBufferToString, stringToArrayBuffer } from "~/lib/Encoding";
import { SYMMETRIC_KEY_ENCRYPTION_ALGORITHM } from "~/Consts";
import { decryptSymmetric, encryptSymmetric } from "~/lib/Encryption";

const VERSION = "A3";
const SECRET_KEY_RANDOM_NUMBER_OF_BYTES = 32;
const FULL_SECRET_KEY_NUMBER_OF_BYTES =
  SECRET_KEY_RANDOM_NUMBER_OF_BYTES + VERSION.length;

const sanitizeSecret = (rawSecret: Uint8Array<ArrayBuffer>) => {
  assert(
    rawSecret.length === FULL_SECRET_KEY_NUMBER_OF_BYTES,
    `A secret must contain exactly ${FULL_SECRET_KEY_NUMBER_OF_BYTES} bytes`,
  );
  assert(
    rawSecret.filter((v) => {
      const c = String.fromCharCode(v);

      return c.match(/[A-Z0-9]/);
    }).length === FULL_SECRET_KEY_NUMBER_OF_BYTES,
    "A secret only contains numbers and uppercase letters",
  );

  return rawSecret;
};

const generateSecretKeyObfuscationKey = async () => {
  const secretKeyObfuscationKey160bits = await crypto.subtle.digest(
    "SHA-1",
    stringToArrayBuffer(
      // Pulled from the code on the 1Password site
      "Obfuscation Does Not Provide Security But It Doesn't Hurt",
    ),
  );
  const secretObfuscationKey128bits = new Uint8Array(
    secretKeyObfuscationKey160bits.slice(0, 16),
  );
  const secretBitsAsHex = toHexString(secretObfuscationKey128bits);
  const secretHexAsBytes = stringToArrayBuffer(secretBitsAsHex);

  return await crypto.subtle.importKey(
    "raw",
    secretHexAsBytes,
    SYMMETRIC_KEY_ENCRYPTION_ALGORITHM,
    true,
    ["encrypt", "decrypt"],
  );
};

const generateRandomArrayOfAlphaNumValues = () => {
  let result = new Uint8Array();
  while (result.length <= SECRET_KEY_RANDOM_NUMBER_OF_BYTES) {
    const randomData = crypto.getRandomValues(
      new Uint8Array(SECRET_KEY_RANDOM_NUMBER_OF_BYTES),
    );

    // https://agilebits.github.io/security-design/deepKeys.html
    const randomAlphaNumeric = randomData.filter((v) => {
      const isUppercaseLetter = v >= 65 && v <= 90;
      const isNumber = v >= 48 && v <= 57;

      if (isUppercaseLetter) {
        // Exclude I, O, U to avoid confusion with 1, 0 and V
        return v !== /* I */ 73 && v !== /* O */ 79 && v !== /* U */ 85;
      } else if (isNumber) {
        // Exclude 0 and 1 to avoid confusion with O and I
        return v !== /* 0 */ 48 && v !== /* 1 */ 49;
      }

      return false;
    });

    result = new Uint8Array([...result, ...randomAlphaNumeric]);
  }

  return result.slice(0, SECRET_KEY_RANDOM_NUMBER_OF_BYTES);
};

const chunks = (value: string, size: number) => {
  const cx = [];
  for (let i = 0; i < value.length; i += size) {
    cx.push(value.substring(i, i + size));
  }

  return cx;
};

const toFullWithDashes = (
  version: string,
  accountId: string,
  value: string,
) => {
  const head = value.substring(0, 6);
  const data = value.substring(6);

  const parts = [head].concat(chunks(data, 5));

  const secretDataDashed = parts.join("-");
  const secretWithDashes = `${version}-${accountId}-${secretDataDashed}`;

  return secretWithDashes;
};

// From: https://evanhahn.com/the-best-way-to-concatenate-uint8arrays/
const concat = (
  uint8arrays: Uint8Array<ArrayBuffer>[],
): Uint8Array<ArrayBuffer> => {
  const totalLength = uint8arrays.reduce(
    (total, uint8array) => total + uint8array.byteLength,
    0,
  );

  const result = new Uint8Array(totalLength);

  let offset = 0;
  uint8arrays.forEach((uint8array) => {
    result.set(uint8array, offset);
    offset += uint8array.byteLength;
  });

  return result;
};

export class SecretKey {
  public readonly fullWithDashes: string;

  private constructor(
    public readonly version: string,
    public readonly accountId: string,
    public readonly secret: string,
  ) {
    this.fullWithDashes = toFullWithDashes(version, accountId, secret);
  }

  private static secretKeyFromData = (
    value: Uint8Array<ArrayBuffer>,
  ): SecretKey => {
    const sanitizedValue = sanitizeSecret(value);

    const version = sanitizedValue
      .slice(0, 2)
      .reduce((s, b) => s + String.fromCharCode(b), "");

    const id = arrayBufferToString(sanitizedValue.slice(2, 8).buffer);

    const secretDataString = arrayBufferToString(
      sanitizedValue.slice(8).buffer,
    );

    return new SecretKey(version, id, secretDataString);
  };

  public obfuscate = async () => {
    const k = await generateSecretKeyObfuscationKey();
    const kid = "obf-v1";

    const obfKey = { kid, k };

    return await encryptSymmetric(
      obfKey,
      stringToArrayBuffer(this.fullWithDashes),
    );
  };

  public static fromReadableString = (value: string): SecretKey =>
    SecretKey.secretKeyFromData(
      stringToArrayBuffer(value.replaceAll("-", "").trim()),
    );

  public static fromObfuscated = async (value: EncryptedVaultItem) => {
    const obf = await generateSecretKeyObfuscationKey();

    const dataBytes = await decryptSymmetric(obf, value);

    return SecretKey.fromReadableString(arrayBufferToString(dataBytes));
  };

  public static generate = () =>
    SecretKey.secretKeyFromData(
      concat([
        stringToArrayBuffer(VERSION),
        generateRandomArrayOfAlphaNumValues(),
      ]),
    );
}
