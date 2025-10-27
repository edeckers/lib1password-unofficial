import {
  ENCRYPTED_ITEM_DEFAULT_CTY,
  KEY_DERIVATION_NUMBER_OF_ITERATIONS,
  SYMMETRIC_KEY_ENCRYPTION_ALGORITHM,
} from "~/Consts";
import {
  exportCryptoKeyAsJwk,
  generateIV,
  generateSymKey,
  importCryptoKeyFromJwk,
} from "~/lib/Encryption";
import {
  arrayBufferToString,
  base64decode,
  base64encode,
  stringToArrayBuffer,
} from "~/lib/Encoding";
import { AccountUnlockKey } from "~/lib/Account/AccountUnlockKey";
import { Keyset } from "~/lib/Keysets/Entities";
import { KeysetResponse } from "~/lib/Keysets/Entities";

// White paper page 12
//
// Key sets are fairly high-level abstractions; the actual keys within them have a finer structure that
// includes the specifications for the algorithms, such as initialization vectors. Symmetric encryption is
// AES-256-GCM, and public key encryption is RSA-OAEP with 2048-bit moduli and a public exponent of
// 65537.

// Static / config
const alg = "PBES2g-HS256";
const cty = ENCRYPTED_ITEM_DEFAULT_CTY;
const iterations = KEY_DERIVATION_NUMBER_OF_ITERATIONS;

// The BigInteger typedef is a Uint8Array that holds an arbitrary magnitude
// unsigned integer in big-endian order. 1*256*256 + 1 = 65_537
const publicExponent = new Uint8Array([1, 0, 1]);
const modulusLength = 2_048;

const hash = "SHA-1";

const generateKeyPair = () =>
  crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength,
      publicExponent,
      hash,
    },
    true,
    ["encrypt", "decrypt"],
  );

const generateEncryptedMasterSymKey = async (
  kid: string,
  encryptor: CryptoKey,
  symKey: CryptoKey,
  p2s: Uint8Array,
) => {
  const iv = generateIV();

  const symKeyJwk = await exportCryptoKeyAsJwk(symKey);

  const symKeyEncryptedBytes = await crypto.subtle.encrypt(
    { name: SYMMETRIC_KEY_ENCRYPTION_ALGORITHM, iv },
    encryptor,
    stringToArrayBuffer(JSON.stringify(symKeyJwk)),
  );
  const symKeyEncryptedJson = base64encode(
    new Uint8Array(symKeyEncryptedBytes),
  );

  return {
    kid,
    data: symKeyEncryptedJson,
    cty,
    iv: base64encode(iv),
    alg,
    p2c: iterations,
    enc: "A256GCM",
    p2s: base64encode(p2s),
  };
};

const generateKeyset = async (
  encryptedBy: string,
  encryptor: CryptoKey,
  salt: Uint8Array,
): Promise<KeysetResponse> => {
  const { privateKey, publicKey } = await generateKeyPair();

  const symKey = await generateSymKey();

  const uuid = crypto.randomUUID();

  const encryptedSymKey = await generateEncryptedMasterSymKey(
    encryptedBy,
    encryptor,
    symKey.k,
    salt,
  );

  const priKeyJwk = await exportCryptoKeyAsJwk(privateKey);
  const pubKeyJwk = await exportCryptoKeyAsJwk(publicKey);

  const iv = generateIV();

  const priKeyEncryptedBytes = await crypto.subtle.encrypt(
    { name: SYMMETRIC_KEY_ENCRYPTION_ALGORITHM, iv },
    symKey.k,
    stringToArrayBuffer(JSON.stringify(priKeyJwk)),
  );

  const priKeyEncryptedJson = base64encode(
    new Uint8Array(priKeyEncryptedBytes),
  );

  return {
    uuid,
    encryptedBy,
    encSymKey: encryptedSymKey,
    encPriKey: {
      kid: uuid,
      enc: "A256GCM",
      cty,
      data: priKeyEncryptedJson,
      iv: base64encode(iv),
    },
    pubKey: {
      ...pubKeyJwk,
      kid: uuid,
    },
  };
};

export class EncryptedKeyset {
  private constructor(public readonly keyset: KeysetResponse) {}

  public static fromResponse = (response: KeysetResponse) =>
    new EncryptedKeyset(response);

  public static create = async (
    encryptedBy: string,
    encryptor: CryptoKey,
    salt: Uint8Array,
  ): Promise<EncryptedKeyset> => {
    const keysetResponse = await generateKeyset(encryptedBy, encryptor, salt);

    return new EncryptedKeyset(keysetResponse);
  };

  public decrypt = async (key: CryptoKey): Promise<Keyset> => {
    const { encSymKey, encPriKey, pubKey } = this.keyset;

    const symKeyBytes = await crypto.subtle.decrypt(
      {
        name: SYMMETRIC_KEY_ENCRYPTION_ALGORITHM,
        iv: base64decode(encSymKey.iv),
      },
      key,
      base64decode(encSymKey.data),
    );

    const symKey = await importCryptoKeyFromJwk(
      JSON.parse(arrayBufferToString(symKeyBytes)),
      true,
    );

    const priKeyBytes = await crypto.subtle.decrypt(
      {
        name: SYMMETRIC_KEY_ENCRYPTION_ALGORITHM,
        iv: base64decode(encPriKey.iv),
      },
      symKey,
      base64decode(encPriKey.data),
    );

    const priKey = await crypto.subtle.importKey(
      "jwk",
      JSON.parse(arrayBufferToString(priKeyBytes)),
      { name: "RSA-OAEP", hash: "SHA-1" },
      true,
      ["decrypt"],
    );

    const pubKeyC = await crypto.subtle.importKey(
      "jwk",
      pubKey,
      { name: "RSA-OAEP", hash: "SHA-1" },
      true,
      ["encrypt"],
    );

    return {
      sym: { kid: encSymKey.kid, k: symKey },
      pri: { kid: encPriKey.kid, k: priKey },
      pub: { kid: pubKey.kid, k: pubKeyC },
    };
  };

  public decryptMaster = async (
    accountUnlockKey: AccountUnlockKey,
  ): Promise<Keyset> => {
    const { encSymKey } = this.keyset;

    const auk = await accountUnlockKey.derive(
      encSymKey.p2c,
      base64decode(encSymKey.p2s),
    );

    return this.decrypt(auk);
  };
}
