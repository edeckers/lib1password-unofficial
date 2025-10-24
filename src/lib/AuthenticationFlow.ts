import { KeysetRepository } from "~/lib/Account/AccountRepository";
import { SecretKey } from "~/lib/Account/SecretKey";

import { VaultRepository } from "~/lib/Vault/VaultRepository";
import { Authenticator } from "~/lib/Authentication/Authenticator";
import { AccountUnlockKey } from "~/lib/Account/AccountUnlockKey";
import { Session } from "~/lib/Session";

export class AuthenticationFlow {
  public constructor(
    private readonly authenticator: Authenticator,
    private readonly keysetRepository: KeysetRepository,
    private readonly vaultRepository: VaultRepository,
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

    return Session.using(this.keysetRepository, this.vaultRepository).start(
      accountUnlockKey,
      secretKey,
    );
  };
}
