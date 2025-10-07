import {
  ENCRYPTED_ITEM_DEFAULT_CTY,
  SYMMETRIC_KEY_IV_NUMBER_OF_BYTES,
} from "~/Consts";

import {
  EncryptedVaultItem,
  KeyWithMeta,
  SymEncryptedData,
} from "~/lib/Vault/Entities";
import { base64decode, base64encode } from "~/lib/Encoding";
import {
  SYMMETRIC_KEY_ENCRYPTION_ALGORITHM,
  SYMMETRIC_KEY_ENCRYPTION_ALGORITHM_LENGTH_BITS,
} from "~/Consts";

const SALT_NUMBER_OF_BYTES = 32;

export const importCryptoKeyFromJwk = (
  jsonWebKey: JsonWebKey,
  extractable = false,
) =>
  crypto.subtle.importKey(
    "jwk",
    jsonWebKey,
    {
      name: SYMMETRIC_KEY_ENCRYPTION_ALGORITHM,
      length: SYMMETRIC_KEY_ENCRYPTION_ALGORITHM_LENGTH_BITS,
    },
    extractable,
    ["encrypt", "decrypt"],
  );

export const exportCryptoKeyAsJwk = (key: CryptoKey) =>
  crypto.subtle.exportKey("jwk", key);

export const generateSalt = () =>
  crypto.getRandomValues(new Uint8Array(SALT_NUMBER_OF_BYTES));

export const generateIV = () =>
  crypto.getRandomValues(new Uint8Array(SYMMETRIC_KEY_IV_NUMBER_OF_BYTES));

export const generateSymKey = async (): Promise<KeyWithMeta> => {
  const k = await crypto.subtle.generateKey(
    {
      name: SYMMETRIC_KEY_ENCRYPTION_ALGORITHM,
      length: SYMMETRIC_KEY_ENCRYPTION_ALGORITHM_LENGTH_BITS,
    },
    true,
    ["encrypt", "decrypt"],
  );

  const kid = crypto.randomUUID();

  return {
    kid,
    k,
  };
};

export const decryptSymmetric = async (
  symKey: CryptoKey,
  message: SymEncryptedData,
) =>
  await crypto.subtle.decrypt(
    {
      name: SYMMETRIC_KEY_ENCRYPTION_ALGORITHM,
      iv: base64decode(message.iv),
    },
    symKey,
    base64decode(message.data),
  );

export const encryptSymmetric = async (
  key: KeyWithMeta,
  message: Uint8Array<ArrayBuffer>,
): Promise<EncryptedVaultItem> => {
  const iv = generateIV();

  const { k, kid } = key;

  const data = await crypto.subtle.encrypt(
    { name: k.algorithm.name, iv },
    k,
    message,
  );

  return {
    cty: ENCRYPTED_ITEM_DEFAULT_CTY,
    enc: "A256GCM",
    data: base64encode(new Uint8Array(data)),
    iv: base64encode(iv),
    kid,
  };
};
