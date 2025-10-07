import { VaultRepository } from "~/lib/Vault/VaultRepository";
import { logger } from "~/Deps";
import {
  EncryptedVaultItem,
  AccessData,
  SymEncryptedData,
  VaultInfo,
} from "~/lib/Vault/Entities";

export class InMemoryVaultRepository implements VaultRepository {
  constructor(private readonly storage: { [key: string]: string } = {}) {}

  public list = async (): Promise<VaultInfo[]> =>
    Object.keys(this.storage)
      .filter((key) => key.endsWith("/info"))
      .map((key) => {
        const rawText = this.storage[key];
        return JSON.parse(rawText) as VaultInfo;
      });

  public create = async (
    uuid: string,
    type: string,
    encAttrs: SymEncryptedData,
    access: AccessData,
  ) => {
    const info = JSON.stringify({
      uuid,
      type,
      encAttrs,
      access: [access],
    });

    logger.debug("Creating Vault", "RAW", info);

    this.storage[`${uuid}/info`] = info;
  };

  public readItemFromVault = async (vaultId: string, id: string) => {
    const rawText = this.storage[`${vaultId}/items/${id}`];

    logger.debug("Reading Vault Item", "RAW", rawText);

    const encryptedVaultItem: EncryptedVaultItem = JSON.parse(rawText);

    return encryptedVaultItem;
  };

  public upsertItemForVault = async (
    vaultId: string,
    id: string,
    encryptedVaultItem: EncryptedVaultItem,
  ) => {
    const item = JSON.stringify({
      id,
      ...encryptedVaultItem,
    });

    logger.debug("Upserting Vault Item", "RAW", item);

    this.storage[`${vaultId}/items/${id}`] = item;
  };

  public listItemIdsForVault = async (vaultId: string) =>
    Object.keys(this.storage)
      .filter((key) => key.startsWith(`${vaultId}/items/`))
      .map((v) => v?.substring(v.lastIndexOf("/")).replace("/", ""))
      .filter((v) => !!v) as string[];
}
