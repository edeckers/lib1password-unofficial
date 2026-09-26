import { importCryptoKeyFromJwk } from "~/lib/Encryption";
import { arrayBufferToString } from "~/lib/Encoding";
import { Keyset } from "~/lib/Keysets/Entities";
import { KeysetResponse } from "~/lib/Keysets/Entities";
import { Keyring } from "~/lib/Keysets/Keyring";

export class EncryptedKeyset {
  private constructor(private readonly keyset: KeysetResponse) {}

  public static fromResponse = (response: KeysetResponse) =>
    new EncryptedKeyset(response);

  /**
   * Opens the keyset with a key already on the keyring, and returns the
   * keyring with the keyset's own symmetric and private keys added.
   */
  public open = async (
    keyring: Keyring,
  ): Promise<{ keyring: Keyring; keyset: Keyset }> => {
    const { uuid, encSymKey, encPriKey, pubKey } = this.keyset;

    const symKeyBytes = await keyring.open(encSymKey);
    const symKey = await importCryptoKeyFromJwk(
      JSON.parse(arrayBufferToString(symKeyBytes)),
      true,
    );
    const withSymKey = keyring.withSymmetricKey(uuid, symKey);

    const priKeyBytes = await withSymKey.open(encPriKey);
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
      keyring: withSymKey.withPrivateKey(uuid, priKey),
      keyset: {
        sym: { kid: uuid, k: symKey },
        pri: { kid: uuid, k: priKey },
        pub: { kid: pubKey.kid, k: pubKeyC },
      },
    };
  };
}
