import { SecretKey } from "./Account/SecretKey";
import { Vault } from "./Vault/Vault";

export class Session {
  constructor(
    public readonly secretKey: SecretKey,
    public readonly vaults: Vault[],
  ) {}

  public getPersonalVault = (): Vault | undefined =>
    this.vaults.length > 0 ? this.vaults[0] : undefined;
}
