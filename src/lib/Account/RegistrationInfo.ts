import { AccountUnlockKey } from "~/lib/Account/AccountUnlockKey";
import { SecretKey } from "~/lib/Account/SecretKey";
import { generateSalt } from "~/lib/Encryption";

export class RegistrationInfo {
  constructor(
    public readonly emailAddress: string,
    public readonly secretKey: SecretKey,
    public readonly auk: AccountUnlockKey,
    public readonly aukSalt: Uint8Array<ArrayBuffer>,
  ) {}

  public static create = async (
    emailAddress: string,
    password: string,
  ): Promise<RegistrationInfo> => {
    const aukSalt = generateSalt();
    const secretKey = SecretKey.generate();

    const auk = await AccountUnlockKey.create(
      emailAddress,
      password,
      secretKey,
    );

    return {
      emailAddress,
      secretKey,
      auk,
      aukSalt,
    };
  };
}
