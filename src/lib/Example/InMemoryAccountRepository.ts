import { toHexString } from "~/lib/Utils";
import { AccountRepository } from "~/lib/Account/AccountRepository";
import { KeysetResponse } from "~/lib/Keysets/Entities";
import { Profile } from "~/lib/Profile/Entities";
import { createProfile } from "~/lib/Profile/ProfileRepository";
import { stringToArrayBuffer } from "~/lib/Encoding";

const createProfileId = async (
  vaultId: string,
  vaultFormat: string,
  emailAddress: string,
) => {
  const emailHashBytes = await crypto.subtle.digest(
    "SHA-256",
    stringToArrayBuffer(emailAddress),
  );
  const emailHash = toHexString(new Uint8Array(emailHashBytes));

  return `${vaultId}/${vaultFormat}/${emailHash}`;
};

export class InMemoryAccountRepository implements AccountRepository {
  public constructor(
    private readonly keysetsStorage: { [key: string]: KeysetResponse } = {},
    private readonly profilesStorage: { [key: string]: Profile } = {},
  ) {}

  public storeProfile = async (
    secretId: string,
    secretKeyFormat: string,
    emailAddress: string,
  ): Promise<void> => {
    const id = await createProfileId(secretId, secretKeyFormat, emailAddress);

    this.profilesStorage[id] = createProfile(emailAddress);
  };

  public getProfile = async (
    vaultId: string,
    vaultFormat: string,
    email: string,
  ) => {
    const id = await createProfileId(vaultId, vaultFormat, email);

    return this.profilesStorage[id] as unknown as Profile;
  };

  public readKeysetsRaw = async (): Promise<KeysetResponse[]> =>
    Object.values(this.keysetsStorage);

  public upsertKeyset = async (keyset: KeysetResponse) => {
    this.keysetsStorage[keyset.uuid] = keyset;
  };
}
