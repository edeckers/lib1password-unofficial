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
  encSymKey: EncryptedSymmetricKey | SomeEncryptedData;
  encPriKey: EncryptedAsymmetricKey;
  pubKey: JsonWebKey & KeyIdentifier;
}
export type EncryptedAsymmetricKey = AnyEncryptedKey;
export type SomeEncryptedData = SymEncryptedData | AsymEncryptedData;

// The master keyset's symmetric key is sealed by the Account Unlock Key and
// carries its derivation parameters; a group keyset's is sealed to its
// parent's public key.
export const isPasswordEncrypted = (
  encrypted: EncryptedSymmetricKey | SomeEncryptedData,
): encrypted is EncryptedSymmetricKey => "p2s" in encrypted;
export interface Keyset {
  sym: KeyWithMeta;
  pri: KeyWithMeta;
  pub: KeyWithMeta;
}
