import { SYMMETRIC_KEY_ENCRYPTION_ALGORITHM } from "~/Consts";
import { importCryptoKeyFromJwk } from "~/lib/Encryption";
import { arrayBufferToString, base64decode } from "~/lib/Encoding";
import { AccountUnlockKey } from "~/lib/Account/AccountUnlockKey";
import { Keyset } from "~/lib/Keysets/Entities";
import { KeysetResponse } from "~/lib/Keysets/Entities";

export class EncryptedKeyset {
  private constructor(private readonly keyset: KeysetResponse) {}

  public static fromResponse = (response: KeysetResponse) =>
    new EncryptedKeyset(response);

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
