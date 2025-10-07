import { KeysetRepository } from "~/lib/Account/AccountRepository";
import { SecretKey } from "~/lib/Account/SecretKey";

import { VaultRepository } from "~/lib/Vault/VaultRepository";
import { Vault } from "~/lib/Vault/Vault";
import { Authenticator } from "~/lib/Authentication/Authenticator";
import { AccountUnlockKey } from "~/lib/Account/AccountUnlockKey";
import { ProfileRepository } from "~/lib/Profile/ProfileRepository";
import { KeysetDecryptor } from "~/lib/Keysets/KeysetDecryptor";
import { Session } from "~/lib/Session";

export class AuthenticationFlow {
  public constructor(
    readonly authenticator: Authenticator,
    readonly keysetRepository: KeysetRepository,
    readonly profileRepository: ProfileRepository,
    readonly vaultRepository: VaultRepository,
  ) {}

  public login = async (
    email: string,
    password: string,
    secretKey: SecretKey,
  ): Promise<Session> => {
    const accountUnlockKey = await AccountUnlockKey.create(
      email,
      password,
      secretKey,
    );

    await this.authenticator.login(secretKey.accountId, accountUnlockKey);

    const keysets = await this.keysetRepository.readKeysetsRaw();

    const decryptor = await KeysetDecryptor.unlock(accountUnlockKey, keysets);

    const vaults = await this.vaultRepository.list();

    const unlockedVaults = await Promise.all(
      vaults.map((v) => Vault.using(this.vaultRepository).unlock(decryptor, v)),
    );

    return new Session(secretKey, unlockedVaults);
  };
}
