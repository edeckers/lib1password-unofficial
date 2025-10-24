import { AccessData, KeyWithMeta, VaultInfo } from "~/lib/Vault/Entities";
import { VaultRepository } from "~/lib/Vault/VaultRepository";
import {
  decryptSymmetric,
  encryptSymmetric,
  importCryptoKeyFromJwk,
} from "~/lib/Encryption";
import { KeysetDecryptor } from "~/lib/Keysets/KeysetDecryptor";
import { arrayBufferToString } from "~/lib/Encoding";

class VaultItem {
  constructor(
    public readonly id: string,
    public readonly data: ArrayBuffer,
  ) {}

  public serialize() {
    return arrayBufferToString(this.data);
  }
}

type VaultMeta = {
  access: { [key: string]: AccessData };
  unlockedBy: string;
};

export class Vault {
  public readonly meta: VaultMeta;

  private constructor(
    private readonly vaultRepository: VaultRepository,
    private readonly vaultKey: KeyWithMeta,
    public readonly uuid: string,
    public readonly name: string,
    access: AccessData[],
    unlockedBy: string,
  ) {
    this.meta = {
      access: Object.fromEntries(access.map((a) => [a.encVaultKey.kid, a])),
      unlockedBy,
    };
  }

  public async readItem(id: string): Promise<VaultItem> {
    const encryptedVaultItem = await this.vaultRepository.readItemFromVault(
      this.uuid,
      id,
    );
    const data = await decryptSymmetric(this.vaultKey.k, encryptedVaultItem);

    return new VaultItem(id, data);
  }

  public async writeItem(id: string, data: Uint8Array<ArrayBuffer>) {
    const encryptedSecret = await encryptSymmetric(this.vaultKey, data);

    await this.vaultRepository.upsertItemForVault(
      this.uuid,
      id,
      encryptedSecret,
    );
  }

  public async readAllItems() {
    const vaultItemIds = await this.vaultRepository.listItemIdsForVault(
      this.uuid,
    );

    return await Promise.all(vaultItemIds.map(this.readItem.bind(this)));
  }

  public static using = (vaultRepository: VaultRepository) => ({
    unlock: async (
      decryptor: KeysetDecryptor,
      vault: VaultInfo,
    ): Promise<Vault> => {
      const firstAccess = vault.access.find((va) =>
        decryptor.contains(va.encVaultKey.kid),
      );
      if (!firstAccess) {
        throw new Error("No access to vault " + vault.uuid);
      }

      const vaultKeyBytes = await decryptor.decrypt(firstAccess.encVaultKey);

      const vaultKeyJson = JSON.parse(arrayBufferToString(vaultKeyBytes));
      const vaultKey = await importCryptoKeyFromJwk(vaultKeyJson, true);

      const attrsBytes = await decryptSymmetric(vaultKey, vault.encAttrs);

      const attrs = JSON.parse(arrayBufferToString(attrsBytes));

      return new Vault(
        vaultRepository,
        { kid: vaultKeyJson.kid, k: vaultKey },
        vault.uuid,
        attrs.name,
        vault.access,
        firstAccess.encryptedBy,
      );
    },
  });
}
