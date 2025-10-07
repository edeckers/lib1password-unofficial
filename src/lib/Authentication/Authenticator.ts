import { AccountUnlockKey } from "~/lib/Account/AccountUnlockKey";
import { ProfileAuth } from "~/lib/Profile/Entities";

export interface Authenticator {
  login: (
    accountId: string,
    accountUnlockKey: AccountUnlockKey,
  ) => Promise<void>;

  createProfileAuth: () => ProfileAuth;

  storeProfileAuth: (
    accountId: string,
    profileAuth: ProfileAuth,
  ) => Promise<void>;
}
