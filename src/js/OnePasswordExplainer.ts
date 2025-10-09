import type { Vault } from '@edeckers/lib1password-unofficial';
import { KEY_DERIVATION_NUMBER_OF_ITERATIONS } from '~/demo/Consts';
import {
  hideAllSections,
  scrollToDecryptionSection,
} from '~/demo/DemoFlowHelpers';
import { AccountCompletionSection } from '~/demo/sections/AccountCompletion/AccountCompletionSection';
import { DecryptionSection } from '~/demo/sections/Decryption/DecryptionSection';
import {
  $accountCreationSection,
  $decryptionSection,
  $keyDerivationSection,
  $secretKeySection,
  $transition1,
  $transition2,
  $transition3,
  $transition4,
  $transition5,
  $vaultItemSection,
} from '~/demo/sections/Elements';
import { KeyDerivationSection } from '~/demo/sections/KeyDerivation/KeyDerivationSection';
import { RegistrationSection } from '~/demo/sections/RegistrationSection';
import { SecretKeySection } from '~/demo/sections/SecretKey/SecretKeySection';
import { VaultItemSection } from '~/demo/sections/VaultItem/VaultItemSection';
import { DemoAccountRepository } from '~/demo/storage/DemoAccountRepository';
import { DemoVaultRepository } from '~/demo/storage/DemoVaultRepository';
import { listenEvent } from '~/Events';

const accountRepository = new DemoAccountRepository();
const vaultRepository = new DemoVaultRepository();

const cleanRepositories = () => {
  accountRepository.clear();
  vaultRepository.clear();
};

const registrationSection = new RegistrationSection();
const keyDerivationSection = new KeyDerivationSection(
  KEY_DERIVATION_NUMBER_OF_ITERATIONS,
);

const accountCreationSection = new AccountCompletionSection(
  accountRepository,
  accountRepository,
  vaultRepository,
  cleanRepositories,
);

const secretKeySection = new SecretKeySection();
const vaultItemSection = new VaultItemSection(vaultRepository);
const decryptionSection = new DecryptionSection();

let vaults: Vault[] = [];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const onCreatedRegistrationInfo = (o: any) => {
  hideAllSections();

  // We're re-starting the demo, so clear out any existing data
  accountRepository.clear();
  vaultRepository.clear();

  // Since secret key section is only informational, the key derivation section
  // will open immediately as well

  const { registrationInfo, password } = o.detail;

  const { emailAddress, secretKey } = registrationInfo;

  secretKeySection.update({ secretKey: o.detail.registrationInfo.secretKey });

  // AccountUnlockKey is already handled by the Registration step, it's
  // just here for visualization purposes
  keyDerivationSection.update({
    secretKey,
    emailAddress,
    password,
  });
  accountCreationSection.update({
    registrationInfo,
    password,
  });

  secretKeySection.show();
  keyDerivationSection.show();

  $secretKeySection.classList.remove('hidden');
  $keyDerivationSection.classList.remove('hidden');

  $transition1.classList.remove('hidden');
  $transition2.classList.remove('hidden');

  $transition1.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

const onDerivedKeys = () => {
  hideAllSections();
  accountCreationSection.show();

  $secretKeySection.classList.remove('hidden');
  $keyDerivationSection.classList.remove('hidden');
  $accountCreationSection.classList.remove('hidden');

  $transition1.classList.remove('hidden');
  $transition2.classList.remove('hidden');
  $transition3.classList.remove('hidden');

  $transition3.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const onCompletedAccountCreation = (o: any) => {
  hideAllSections();

  vaults = o.detail.session.vaults;

  vaultItemSection.update({ vaults });

  vaultItemSection.show();

  $secretKeySection.classList.remove('hidden');
  $keyDerivationSection.classList.remove('hidden');
  $accountCreationSection.classList.remove('hidden');
  $vaultItemSection.classList.remove('hidden');

  $transition1.classList.remove('hidden');
  $transition2.classList.remove('hidden');
  $transition3.classList.remove('hidden');
  $transition4.classList.remove('hidden');

  $transition4.scrollIntoView({ behavior: 'smooth', block: 'end' });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const onStoredEncryptedItem = (o: any) => {
  hideAllSections();

  decryptionSection.update({
    vaults,
    lastStoredItemId: o.detail.itemId,
  });

  decryptionSection.show();
  $secretKeySection.classList.remove('hidden');
  $keyDerivationSection.classList.remove('hidden');
  $accountCreationSection.classList.remove('hidden');
  $vaultItemSection.classList.remove('hidden');
  $decryptionSection.classList.remove('hidden');

  $transition1.classList.remove('hidden');
  $transition2.classList.remove('hidden');
  $transition3.classList.remove('hidden');
  $transition4.classList.remove('hidden');
  $transition5.classList.remove('hidden');

  $transition5.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

const onDecryptedStoredItem = () => {
  scrollToDecryptionSection('center');
};

class OnePasswordDemo {
  public init(): void {
    listenEvent('createdRegistrationInfo', onCreatedRegistrationInfo);
    listenEvent('derivedKeys', onDerivedKeys);
    listenEvent('completedAccountCreation', onCompletedAccountCreation);
    listenEvent('storedEncryptedItem', onStoredEncryptedItem);
    listenEvent('decryptedStoredItem', onDecryptedStoredItem);

    registrationSection.reset();
    registrationSection.show();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const demo = new OnePasswordDemo();

  demo.init();
});
