import { base64decode } from "~/lib/Encoding";
import { AccountUnlockKey } from "~/lib/Account/AccountUnlockKey";
import { EncryptedKeyset } from "~/lib/Keysets/EncryptedKeyset";
import { AsymEncryptedData, SymEncryptedData } from "~/lib/Vault/Entities";
import { Keyset } from "~/lib/Keysets/Entities";
import { SomeEncryptedData } from "~/lib/Keysets/Entities";
import { KeysetResponse } from "~/lib/Keysets/Entities";
import { decryptSymmetric } from "~/lib/Encryption";

const decryptAsymmetric = async (
  priKey: CryptoKey,
  encryptedItem: AsymEncryptedData,
) =>
  await crypto.subtle.decrypt(
    {
      name: "RSA-OAEP",
    },
    priKey,
    Uint8Array.from(base64decode(encryptedItem.data)),
  );

export class KeysetDecryptor {
  public constructor(
    public readonly encryptedKeyset: { [key: string]: Keyset },
  ) {}

  public decrypt = async (
    encryptedItem: SomeEncryptedData,
  ): Promise<ArrayBuffer> => {
    if (!this.encryptedKeyset[encryptedItem.kid]) {
      throw new Error("No keyset found for kid " + encryptedItem.kid);
    }

    const keyset = this.encryptedKeyset[encryptedItem.kid];

    if (encryptedItem.enc === "A256GCM") {
      const symEncryptedItem: SymEncryptedData =
        encryptedItem as SymEncryptedData;

      return await decryptSymmetric(keyset.sym.k, symEncryptedItem);
    } else if (encryptedItem.enc === "RSA-OAEP") {
      const asymEncryptedItem: AsymEncryptedData =
        encryptedItem as AsymEncryptedData;

      return await decryptAsymmetric(keyset.pri.k, asymEncryptedItem);
    }

    throw new Error("Unsupported encryption algorithm " + encryptedItem.enc);
  };

  public contains = (kid: string): boolean => !!this.encryptedKeyset[kid];

  public static unlock = async (
    accountUnlockKey: AccountUnlockKey,
    keysets: KeysetResponse[],
  ): Promise<KeysetDecryptor> => {
    const masterKeyset = keysets.find((ek) => ek.encryptedBy === "mp");

    if (!masterKeyset) {
      throw new Error("No master keyset found");
    }

    const { encSymKey } = masterKeyset;

    const auk = await accountUnlockKey.derive(
      encSymKey.p2c,
      base64decode(encSymKey.p2s),
    );

    const mks = await EncryptedKeyset.fromResponse(masterKeyset).decrypt(auk);

    const kx = {
      [masterKeyset.uuid]: mks,
    };

    for (const ks of keysets) {
      if (!kx[ks.encryptedBy]) {
        continue;
      }

      kx[ks.uuid] = await EncryptedKeyset.fromResponse(ks).decrypt(
        kx[ks.encryptedBy].sym.k,
      );
    }

    return new KeysetDecryptor(kx);
  };
}
