import { AccountUnlockKey } from "~/lib/Account/AccountUnlockKey";

export interface Authenticator {
  login: (
    accountId: string,
    accountUnlockKey: AccountUnlockKey,
  ) => Promise<void>;
}
