import { base64decode } from "~/lib/Encoding";
import { AccountUnlockKey } from "~/lib/Account/AccountUnlockKey";
import { EncryptedKeyset } from "~/lib/Keysets/EncryptedKeyset";
import {
  isPasswordEncrypted,
  Keyset,
  KeysetResponse,
  SomeEncryptedData,
} from "~/lib/Keysets/Entities";
import { Keyring } from "~/lib/Keysets/Keyring";

type UnlockedKeysets = { [uuid: string]: Keyset };

export class KeysetDecryptor {
  private constructor(
    private readonly keyring: Keyring,
    public readonly encryptedKeyset: UnlockedKeysets,
  ) {}

  public decrypt = async (
    encryptedItem: SomeEncryptedData,
  ): Promise<ArrayBuffer> => this.keyring.open(encryptedItem);

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

    if (!isPasswordEncrypted(encSymKey)) {
      throw new Error(
        "Master keyset " +
          masterKeyset.uuid +
          " is not sealed by the Account Unlock Key",
      );
    }

    const auk = await accountUnlockKey.derive(
      encSymKey.p2c,
      base64decode(encSymKey.p2s),
    );

    const { keyring, keyset } = await EncryptedKeyset.fromResponse(
      masterKeyset,
    ).open(Keyring.empty.withSymmetricKey(encSymKey.kid, auk));

    // The derived key opens only the master it was derived for; any other
    // password-sealed keyset has its own salt and stays locked.
    return KeysetDecryptor.unlockReachable(
      keyring,
      keysets.filter((ks) => !isPasswordEncrypted(ks.encSymKey)),
      { [masterKeyset.uuid]: keyset },
    );
  };

  // Each pass opens every keyset the keyring can already open; their keys
  // open the next pass's. List order is irrelevant, and keysets nothing on
  // the keyring can open are left out.
  private static unlockReachable = async (
    keyring: Keyring,
    pending: KeysetResponse[],
    unlocked: UnlockedKeysets,
  ): Promise<KeysetDecryptor> => {
    const ready = pending.filter((ks) => keyring.canOpen(ks.encSymKey));

    if (ready.length === 0) {
      return new KeysetDecryptor(keyring, unlocked);
    }

    const opened = await ready.reduce(async (previous, ks) => {
      const soFar = await previous;
      const { keyring: next, keyset } = await EncryptedKeyset.fromResponse(
        ks,
      ).open(soFar.keyring);

      return {
        keyring: next,
        unlocked: { ...soFar.unlocked, [ks.uuid]: keyset },
      };
    }, Promise.resolve({ keyring, unlocked }));

    return KeysetDecryptor.unlockReachable(
      opened.keyring,
      pending.filter((ks) => !ready.includes(ks)),
      opened.unlocked,
    );
  };
}
