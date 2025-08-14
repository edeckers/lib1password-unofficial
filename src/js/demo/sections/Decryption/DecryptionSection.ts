import type { Vault } from '@edeckers/lib1password-unofficial';
import { sendEvent } from '~/Events';
import { TemplateRenderer } from '~/TemplateRenderer';
import { type Section, type WithUpdate } from '~/demo/Sections';
import { $ } from '~/demo/Utils';

const $decryptItemBtn = $('#decryptItemBtn');
const $decryptedResult = $('#decryptedResult');

const activateDecryptedItemBtn = () => {
  $decryptItemBtn.textContent = '✅ Successfully Decrypted';
  $decryptItemBtn.classList.add('bg-green-600', 'hover:bg-green-700');
  $decryptItemBtn.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
};

const resetDecryptedItemBtn = () => {
  $decryptItemBtn.textContent = 'Decrypt Stored Item';
  $decryptItemBtn.classList.add('bg-indigo-600', 'hover:bg-indigo-700');
  $decryptItemBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
};

const decryptStoredItem = async (
  unlockedVaults: Vault[],
  lastStoredItemId: string,
): Promise<void> => {
  if (unlockedVaults.length === 0 || !lastStoredItemId) {
    alert('No items to decrypt or vaults not unlocked.');
    return;
  }

  $decryptItemBtn.textContent = 'Decrypting...';

  try {
    const vault = unlockedVaults[0];
    const decryptedItem = await vault.readItem(lastStoredItemId);

    const itemJson = new TextDecoder().decode(decryptedItem.data);
    const itemData = JSON.parse(itemJson);

    const displayData = {
      title: itemData.title,
      username:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        itemData.fields?.find((f: any) => f.name === 'username')?.value ||
        'N/A',
      password:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        itemData.fields?.find((f: any) => f.name === 'password')?.value ||
        'N/A',
      url: itemData.urls?.[0]?.href || 'N/A',
      notes: itemData.notes || 'No notes',
    };

    TemplateRenderer.renderToElement(
      'decrypted-item',
      displayData,
      $decryptedResult,
    );
    $decryptedResult.classList.remove('hidden');

    activateDecryptedItemBtn();

    sendEvent('decryptedStoredItem', {
      decryptedItem,
      itemId: lastStoredItemId,
      vaultId: vault.uuid,
    });
  } catch (error) {
    console.error('Decryption failed:', error);
    alert(`Decryption failed: ${JSON.stringify(error)}`);
  } finally {
    if ($decryptItemBtn.textContent === 'Decrypting...') {
      $decryptItemBtn.textContent = 'Decrypt Stored Item';
      $decryptItemBtn.removeAttribute('disabled');
    }
  }
};
type DecryptionState = {
  vaults: Vault[];
  lastStoredItemId: string | null;
};
export class DecryptionSection implements Section, WithUpdate<DecryptionState> {
  private state: DecryptionState = {
    vaults: [],
    lastStoredItemId: null,
  };

  constructor() {
    $decryptItemBtn.addEventListener('click', () => {
      const f = async () => {
        if (this.state.lastStoredItemId === null) {
          throw new Error('No item to decrypt');
        }

        await decryptStoredItem(this.state.vaults, this.state.lastStoredItemId);
      };

      f();
    });
  }

  public update = (v: DecryptionState): void => {
    this.state = v;
  };

  public reset(): void {
    resetDecryptedItemBtn();
    $decryptedResult.classList.add('hidden');
  }

  public show(): void {
    this.reset();
  }
}
