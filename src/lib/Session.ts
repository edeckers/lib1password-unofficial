import { KeysetRepository } from "~/lib/Account/AccountRepository";
import { AccountUnlockKey } from "~/lib/Account/AccountUnlockKey";
import { SecretKey } from "~/lib/Account/SecretKey";
import { KeysetDecryptor } from "~/lib/Keysets/KeysetDecryptor";
import { Vault } from "~/lib/Vault/Vault";
import { VaultRepository } from "~/lib/Vault/VaultRepository";

export class Session {
  constructor(
    public readonly secretKey: SecretKey,
    public readonly vaults: Vault[],
  ) {}

  public getPersonalVault = (): Vault | undefined =>
    this.vaults.length > 0 ? this.vaults[0] : undefined;

  public static using = (
    keysetRepository: KeysetRepository,
    vaultRepository: VaultRepository,
  ) => ({
    start: async (
      accountUnlockKey: AccountUnlockKey,
      secretKey: SecretKey,
    ): Promise<Session> => {
      const keysets = await keysetRepository.readKeysetsRaw();

      const decryptor = await KeysetDecryptor.unlock(accountUnlockKey, keysets);

      const vaults = await vaultRepository.list();

      const unlockedVaults = await Promise.all(
        vaults.map((v) => Vault.using(vaultRepository).unlock(decryptor, v)),
      );

      return new Session(secretKey, unlockedVaults);
    },
  });
}
