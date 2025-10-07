import {
  EncryptedSymmetricKey,
  KeyIdentifier,
  AnyEncryptedKey,
  AsymEncryptedData,
  SymEncryptedData,
  KeyWithMeta,
} from "~/lib/Vault/Entities";

export interface KeysetResponse {
  uuid: string;
  encryptedBy: string;
  encSymKey: EncryptedSymmetricKey;
  encPriKey: EncryptedAsymmetricKey;
  pubKey: JsonWebKey & KeyIdentifier;
}
export type EncryptedAsymmetricKey = AnyEncryptedKey;
export type SomeEncryptedData = SymEncryptedData | AsymEncryptedData;
export interface Keyset {
  sym: KeyWithMeta;
  pri: KeyWithMeta;
  pub: KeyWithMeta;
}
