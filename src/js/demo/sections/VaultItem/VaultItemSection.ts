import {
  base64decode,
  Vault,
  type EncryptedVaultItem,
  type VaultRepository,
} from '@edeckers/lib1password-unofficial';
import { type Section, type WithUpdate } from '~/demo/Sections';
import { $ } from '~/demo/Utils';
import { TemplateRenderer } from '~/TemplateRenderer';
import { sendEvent } from '~/Events';

const $encryptItemBtn = $('#encryptItemBtn');
const $title = $('#itemTitle') as HTMLInputElement;
const $username = $('#itemUsername') as HTMLInputElement;
const $password = $('#itemPassword') as HTMLInputElement;
const $url = $('#itemUrl') as HTMLInputElement;
const $notes = $('#itemNotes') as HTMLTextAreaElement;

const $plaintextPreview = $('#plaintextPreview');
const $ciphertextPreview = $('#ciphertextPreview');
const $vaultKeyUsed = $('#vaultKeyUsed');
const $storedItemDisplay = $('#storedItemDisplay');

const resetEncryptItemBtn = () => {
  $encryptItemBtn.textContent = 'Encrypt & Store Item';
  $encryptItemBtn.removeAttribute('disabled');
  $encryptItemBtn.classList.add('bg-indigo-600', 'hover:bg-indigo-700');
  $encryptItemBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
};

const activateEncryptItemBtn = () => {
  $encryptItemBtn.textContent = '✅ Item Encrypted & Stored';
  $encryptItemBtn.classList.add('bg-green-600', 'hover:bg-green-700');
  $encryptItemBtn.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
};

const renderItemDisplay = (
  vault: Vault,
  itemId: string,
  encryptedItem: EncryptedVaultItem,
) => {
  $ciphertextPreview.textContent = encryptedItem.data;

  $vaultKeyUsed.textContent = `${vault.meta.access[vault.meta.unlockedBy].encVaultKey.data.substring(0, 28)}...`;

  const encAlias = (enc: string) => {
    if (enc.startsWith('A256GCM')) return 'AES-256-GCM';

    return enc;
  };

  const displayData = {
    itemId,
    encAlgorithm: encAlias(encryptedItem.enc),
    ivLength: new TextDecoder()
      .decode(base64decode(encryptedItem.iv))
      .length.toString(10),
    encryptedSize: new TextDecoder()
      .decode(base64decode(encryptedItem.data))
      .length.toString(10),
    storageFormat: JSON.stringify(
      {
        id: 'identifier of the item in the vault',
        version: 'version format of the vault',
        cty: 'content type, e.g. b5+jwt+json',
        enc: 'algorithm used',
        iv: 'initialization vector, base64 encoded',
        kid: 'identifier of the vault access key',
      },
      null,
      2,
    ),
    rawEncryptedData: JSON.stringify(encryptedItem, null, 2),
  };

  TemplateRenderer.renderToElement(
    'stored-item',
    displayData,
    $storedItemDisplay,
  );
  $storedItemDisplay.classList.remove('hidden');
};

const encryptAndStoreItem = async (
  vault: Vault,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  itemData: any,
): Promise<string> => {
  const itemId = crypto.randomUUID();

  const itemJson = JSON.stringify(itemData);
  const itemBytes = new TextEncoder().encode(itemJson);

  await vault.writeItem(itemId, itemBytes);

  return itemId;
};

const visualizeItemEncryption = async (
  vaultRepository: VaultRepository,
  unlockedVaults: Vault[],
) => {
  if (unlockedVaults.length === 0) {
    throw Error(
      'No unlocked vaults available. Please Generate Keysets and Your Personal Vault first.',
    );
  }

  $encryptItemBtn.textContent = 'Encrypting...';

  const title = $title.value;
  const username = $username.value;
  const password = $password.value;
  const url = $url.value;
  const notes = $notes.value;

  const unencryptedItem = {
    title,
    fields: [
      { name: 'username', type: 'text', value: username },
      { name: 'password', type: 'password', value: password },
    ],
    urls: [{ href: url }],
    notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    itemType: 'login',
  };

  // Use the first unlocked vault, which is the always available personal vault
  const vault = unlockedVaults[0];

  try {
    $plaintextPreview.textContent = JSON.stringify(unencryptedItem, null, 2);

    const itemId = await encryptAndStoreItem(vault, unencryptedItem);

    const encryptedItem = await vaultRepository.readItemFromVault(
      vault.uuid,
      itemId,
    );

    renderItemDisplay(vault, itemId, encryptedItem);

    // *After* render, so we can scroll the screen to the final position of
    // the transition text
    sendEvent('storedEncryptedItem', {
      encryptedItem,
      itemId,
      vaultId: vault.uuid,
    });

    activateEncryptItemBtn();
  } catch (error) {
    resetEncryptItemBtn();
    console.error('Encryption failed:', error);
    alert(`Encryption failed: ${JSON.stringify(error)}`);
  }
};

type VaultItemState = {
  vaults: Vault[];
};

export class VaultItemSection implements Section, WithUpdate<VaultItemState> {
  private state: VaultItemState = {
    vaults: [],
  };

  constructor(vaultRepository: VaultRepository) {
    $encryptItemBtn.addEventListener('click', () => {
      const f = async () => {
        visualizeItemEncryption(vaultRepository, this.state.vaults);
      };

      f();
    });
  }

  public reset(): void {
    resetEncryptItemBtn();
    $storedItemDisplay.classList.add('hidden');

    $plaintextPreview.textContent = 'Click "Encrypt & Store Item" to see data';
    $ciphertextPreview.textContent = 'Encrypted data will appear here';
    $vaultKeyUsed.textContent = 'Vault key will be shown here';
  }

  public show(): void {
    this.reset();
  }

  public update = (v: VaultItemState): void => {
    this.state = v;
  };
}
