import { exportCryptoKeyAsJwk, generateSalt } from "~/lib/Encryption";
import { Authenticator } from "~/lib/Authentication/Authenticator";
import { AccountUnlockKey } from "~/lib/Account/AccountUnlockKey";
import { base64decode, base64encode } from "~/lib/Encoding";
import { KEY_DERIVATION_NUMBER_OF_ITERATIONS } from "~/Consts";

const deriveSrpxJsonWebKey = async (
  profile: SrpxProfileAuth,
  accountUnlockKey: AccountUnlockKey,
): Promise<JsonWebKey> => {
  const srpxKey = await accountUnlockKey.derive(
    profile.iterations,
    base64decode(profile.salt),
  );

  return await exportCryptoKeyAsJwk(srpxKey);
};

export interface SrpxProfileAuth {
  salt: string;
  alg: string;
  iterations: number;
  method: string;
}

export class SrpxAuthenticator implements Authenticator {
  public constructor(
    private readonly profileAuthByProfileId: (
      profileId: string,
    ) => Promise<SrpxProfileAuth>,
    private readonly authenticate: (srpxKey: JsonWebKey) => Promise<void>,
  ) {}

  public storeProfileAuth(
    accountId: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    profileAuth: SrpxProfileAuth, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public createProfileAuth = (): SrpxProfileAuth => {
    const saltBytes = base64encode(generateSalt());
    return {
      salt: saltBytes,
      alg: "PBKDF2",
      iterations: KEY_DERIVATION_NUMBER_OF_ITERATIONS,
      method: "SRPg-4096",
    };
  };

  public login = async (
    accountId: string,
    accountUnlockKey: AccountUnlockKey,
  ): Promise<void> => {
    const profileAuth = await this.profileAuthByProfileId(accountId);

    const srpKeyJson = await deriveSrpxJsonWebKey(
      profileAuth,
      accountUnlockKey,
    );

    await this.authenticate(srpKeyJson);
  };
}
