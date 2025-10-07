import {
  EncryptedVaultItem,
  AccessData,
  SymEncryptedData,
  VaultInfo,
} from "~/lib/Vault/Entities";

export interface VaultRepository {
  readItemFromVault: (
    vaultUuid: string,
    uuid: string,
  ) => Promise<EncryptedVaultItem>;
  upsertItemForVault: (
    vaultUuid: string,
    uuid: string,
    encryptedVaultItem: EncryptedVaultItem,
  ) => Promise<void>;
  listItemIdsForVault: (vaultUuid: string) => Promise<string[]>;
  list: () => Promise<VaultInfo[]>;
  create: (
    uuid: string,
    type: string,
    encAttrs: SymEncryptedData,
    access: AccessData,
  ) => Promise<void>;
}
