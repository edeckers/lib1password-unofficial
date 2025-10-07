import { SYMMETRIC_KEY_ENCRYPTION_ALGORITHM } from "~/Consts";
import { SecretKey } from "~/lib/Account/SecretKey";
import { assert, assertHasValue } from "~/lib/Utils";
import { stringToArrayBuffer } from "~/lib/Encoding";

const normalizePassword = (rawPassword: string) => {
  const passwordWithoutTrailingOrLeadingSpaces = rawPassword.trim();

  // "[normalize] to a UTF-8 byte string using Unicode Normalization
  // Form Compatibility Decomposition (NFKD) normalization." (1Password White Paper)
  return passwordWithoutTrailingOrLeadingSpaces;
};

const xorArrays = (maybeA0: Uint8Array, maybeA1: Uint8Array) => {
  const a0 = assertHasValue(maybeA0);
  const a1 = assertHasValue(maybeA1);

  assertHasValue(a0);
  assertHasValue(a1);
  assert(a0.byteLength === a1.byteLength, "Arrays differ in length");

  return Uint8Array.from(a0, (v, i) => v ^ a1[i]);
};

const saltTheSecretKey = async (secretKey: SecretKey) => {
  const hkdfKey = await crypto.subtle.importKey(
    "raw",
    stringToArrayBuffer(secretKey.secret),
    {
      name: "HKDF",
    },
    false,
    ["deriveBits"],
  );

  return await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      salt: stringToArrayBuffer(secretKey.accountId),
      hash: "SHA-256",
      info: stringToArrayBuffer(secretKey.version),
    },
    hkdfKey,
    256,
  );
};

const saltTheMasterKeySalt = async (
  salt: Uint8Array<ArrayBuffer>,
  emailAddress: string,
) => {
  const hkdfKey = await crypto.subtle.importKey(
    "raw",
    salt,
    {
      name: "HKDF",
    },
    false,
    ["deriveBits"],
  );

  return await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      salt: stringToArrayBuffer(emailAddress),
      hash: "SHA-256",
      info: stringToArrayBuffer("PBES2g-HS256"),
    },
    hkdfKey,
    256,
  );
};

const createPbkdf2Key = async (password: string) => {
  const normalizedPassword = normalizePassword(password);

  return await crypto.subtle.importKey(
    "raw",
    stringToArrayBuffer(normalizedPassword),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
};

export class AccountUnlockKey {
  private constructor(
    private readonly emailAddress: string,
    private readonly secretKey: SecretKey,
    private readonly pbkdf2Key: CryptoKey,
  ) {}

  private bits = async (
    iterations: number,
    salt: Uint8Array<ArrayBuffer>,
  ): Promise<ArrayBuffer> =>
    await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt,
        hash: "SHA-256",
        iterations,
        info: stringToArrayBuffer("PBES2g-HS256"),
      },
      this.pbkdf2Key,
      256,
    );

  public derive = async (
    iterations: number,
    salt: Uint8Array<ArrayBuffer>,
  ): Promise<CryptoKey> => {
    assertHasValue(salt);
    assertHasValue(iterations);

    const hkdfMasterKeySalt = await saltTheMasterKeySalt(
      salt,
      this.emailAddress,
    );

    const kM = await this.bits(iterations, new Uint8Array(hkdfMasterKeySalt));

    const hkdfSecretSalt = await saltTheSecretKey(this.secretKey);

    const xorredMasterKeyAndSecretSalt = xorArrays(
      new Uint8Array(kM),
      new Uint8Array(hkdfSecretSalt),
    );

    return await crypto.subtle.importKey(
      "raw",
      xorredMasterKeyAndSecretSalt,
      SYMMETRIC_KEY_ENCRYPTION_ALGORITHM,
      true,
      ["encrypt", "decrypt"],
    );
  };

  public static create = async (
    emailAddress: string,
    password: string,
    secretKey: SecretKey,
  ): Promise<AccountUnlockKey> => {
    const normalizedPassword = normalizePassword(password);

    const pbkdf2Key = await createPbkdf2Key(normalizedPassword);

    return new AccountUnlockKey(emailAddress, secretKey, pbkdf2Key);
  };
}
