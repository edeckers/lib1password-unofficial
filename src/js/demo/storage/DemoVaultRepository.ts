import {
  InMemoryVaultRepository,
  type EncryptedVaultItem,
  type SomeAccessData,
  type SomeSymEncryptedData,
  type VaultInfo,
  type VaultRepository,
} from '@edeckers/lib1password-unofficial';

export class DemoVaultRepository implements VaultRepository {
  private readonly vaultStorage: { [key: string]: string } = {};

  private readonly vaults: InMemoryVaultRepository;

  constructor() {
    this.vaults = new InMemoryVaultRepository(this.vaultStorage);
  }

  public readItemFromVault = (
    vaultUuid: string,
    uuid: string,
  ): Promise<EncryptedVaultItem> =>
    this.vaults.readItemFromVault(vaultUuid, uuid);

  public upsertItemForVault = (
    vaultUuid: string,
    uuid: string,
    encryptedVaultItem: EncryptedVaultItem,
  ): Promise<void> =>
    this.vaults.upsertItemForVault(vaultUuid, uuid, encryptedVaultItem);

  public listItemIdsForVault = (vaultUuid: string): Promise<string[]> =>
    this.vaults.listItemIdsForVault(vaultUuid);

  public list = (): Promise<VaultInfo[]> => this.vaults.list();

  public create = (
    uuid: string,
    type: string,
    encAttrs: SomeSymEncryptedData,
    access: SomeAccessData,
  ): Promise<void> => this.vaults.create(uuid, type, encAttrs, access);

  public clear = (): void => {
    for (const k in this.vaultStorage) {
      delete this.vaultStorage[k];
    }
  };
}
