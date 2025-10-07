import { assert, toHexString } from "~/lib/Utils";
import { EncryptedVaultItem } from "~/lib/Vault/Entities";
import { arrayBufferToString, stringToArrayBuffer } from "~/lib/Encoding";
import { SYMMETRIC_KEY_ENCRYPTION_ALGORITHM } from "~/Consts";
import { decryptSymmetric, encryptSymmetric } from "~/lib/Encryption";

const SECRET_NUMBER_OF_BYTES = 32;
const VERSION = "A3";

const sanitizeSecret = (rawSecret: Uint8Array<ArrayBuffer>) => {
  assert(
    rawSecret.length === SECRET_NUMBER_OF_BYTES,
    `A secret must contain exactly ${SECRET_NUMBER_OF_BYTES} bytes`,
  );
  assert(
    rawSecret.filter((v) => {
      const c = String.fromCharCode(v);

      return c.match(/[A-Z0-9]/);
    }).length === SECRET_NUMBER_OF_BYTES,
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
  while (result.length <= SECRET_NUMBER_OF_BYTES) {
    const randomData = crypto.getRandomValues(
      new Uint8Array(SECRET_NUMBER_OF_BYTES),
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

  return result.slice(0, SECRET_NUMBER_OF_BYTES);
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

    const version = VERSION;
    const id = arrayBufferToString(sanitizedValue.slice(0, 6).buffer);

    const secretDataString = arrayBufferToString(
      sanitizedValue.slice(6).buffer,
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
    SecretKey.secretKeyFromData(generateRandomArrayOfAlphaNumValues());
}
