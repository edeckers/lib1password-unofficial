export type KeyIdentifier = {
  kid: string;
};

type EncryptedKeyMeta = KeyIdentifier & {
  cty: string;
  enc: string;
};

type EncryptedKeyCommon = {
  data: string;
  iv: string;
};

export type AnyEncryptedKey = EncryptedKeyMeta & EncryptedKeyCommon;

export type AsymmetricEncryptedVaultItem = KeyIdentifier & {
  enc: string;
  data: string;
  cty: string;
};

export type EncryptedSymmetricKey = AnyEncryptedKey & {
  alg: string;
  p2c: number;
  p2s: string;
};

export type SymEncryptedData = KeyIdentifier & {
  cty: string;
  data: string;
  enc: string;
  iv: string;
  kid: string;
};

export type AsymEncryptedData = KeyIdentifier & {
  cty: string;
  data: string;
  enc: string;
};

export type KeyWithMeta = KeyIdentifier & {
  k: CryptoKey;
};

export interface VaultAccess {
  enc_vault_key: AsymmetricEncryptedVaultItem;
}

export type EncryptedVaultItem = KeyIdentifier & {
  cty: string;
  data: string;
  enc: string;
  iv: string;
};

export interface AccessData {
  encryptedBy: string;
  encVaultKey: AsymEncryptedData;
}

export interface VaultInfo {
  uuid: string;
  type: string;
  encAttrs: SymEncryptedData;
  access: AccessData[];
}
