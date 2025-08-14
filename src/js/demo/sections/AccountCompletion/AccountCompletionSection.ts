import {
  AccountCreator,
  AccountUnlockKey,
  AuthenticationFlow,
  Session,
  type Authenticator,
  type KeysetRepository,
  type ProfileAuth,
  type ProfileRepository,
  type RegistrationInfo,
  type SecretKey,
  type VaultRepository,
} from '@edeckers/lib1password-unofficial';
import { type Section, type WithUpdate } from '~/demo/Sections';

import { TemplateRenderer } from '~/TemplateRenderer';
import { sendEvent } from '~/Events';
import { $ } from '~/demo/Utils';

const $accountProgress = $('#accountProgress');
const $accountSummary = $('#accountSummary');
const $completeAccountBtn = $('#completeAccountBtn');
const $mpPreview = $('#mpPreview');
const $publicKeyPreview = $('#publicKeyPreview');
const $privateKeyPreview = $('#privateKeyPreview');
const $vaultKeyPreview = $('#vaultKeyPreview');

const resetCompleteAccountBtn = () => {
  $completeAccountBtn.textContent = 'Generate Keysets and Your Personal Vault';
  $completeAccountBtn.classList.remove(
    'bg-green-600',
    'hover:bg-green-700',
    'disabled',
  );
  $completeAccountBtn.classList.add(
    'bg-gradient-to-r',
    'from-purple-600',
    'to-pink-600',
  );

  $publicKeyPreview.textContent = '...';
  $privateKeyPreview.textContent = '...';
  $vaultKeyPreview.textContent = '...';
};

const activateCompleteAccountBtn = () => {
  $completeAccountBtn.textContent = '✅ Account Created Successfully';
  $completeAccountBtn.classList.add('bg-green-600', 'hover:bg-green-700');
  $completeAccountBtn.classList.remove(
    'bg-gradient-to-r',
    'from-purple-600',
    'to-pink-600',
  );
};

const updateProgressStep = (
  step: string,
  status: 'pending' | 'in-progress' | 'completed',
): void => {
  const stepElement = document.querySelector(`[data-step="${step}"]`);
  if (!stepElement) return;

  const circle = stepElement.querySelector('.w-6.h-6') as HTMLElement;
  const text = stepElement.querySelector('span') as HTMLElement;

  if (!circle || !text) return;

  switch (status) {
    case 'in-progress':
      circle.className =
        'w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center animate-pulse';
      circle.innerHTML = '<div class="w-2 h-2 bg-white rounded-full"></div>';
      text.className = 'text-sm font-medium text-blue-800';
      break;

    case 'completed':
      circle.className =
        'w-6 h-6 bg-green-500 rounded-full flex items-center justify-center';
      circle.innerHTML = `<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                </svg>`;
      text.className = 'text-sm font-medium text-green-800';
      break;
  }
};

const displayGeneratedKeys = async (
  accountRepository: KeysetRepository,
  vaultRepository: VaultRepository,
): Promise<void> => {
  try {
    const keysets = await accountRepository.readKeysetsRaw();
    const masterKeyset = keysets[0];

    if (masterKeyset) {
      $mpPreview.textContent = `${masterKeyset.encSymKey?.data.substring(0, 16)}... (Encrypted, ${masterKeyset.encSymKey.alg})`;
      $publicKeyPreview.textContent = `${masterKeyset.pubKey.kid.substring(0, 16)}... (${masterKeyset.pubKey?.alg || 'RSA'})`;
      $privateKeyPreview.textContent = `${masterKeyset.encPriKey?.data.substring(0, 16)}... (Encrypted, ${masterKeyset.encPriKey.enc})`;
    }

    const vaults = await vaultRepository.list();
    const firstVault = vaults[0];
    if (!firstVault) {
      throw new Error('No vaults found');
    }

    const vaultAccess = firstVault.access[0];
    if (vaultAccess?.encVaultKey?.data) {
      const encData = vaultAccess.encVaultKey.data.substring(0, 16);
      $vaultKeyPreview.textContent = `${encData}... (Encrypted, ${vaultAccess.encVaultKey.enc})`;
    }
  } catch (error) {
    console.error('Failed to display keys:', error);

    $publicKeyPreview.textContent = 'Key generation completed';
    $privateKeyPreview.textContent = 'Key generation completed';
    $vaultKeyPreview.textContent = 'Vault key encrypted';
  }
};

const authenticateAndUnlockVaults = async (
  keysetRepository: KeysetRepository,
  profileRepository: ProfileRepository,
  vaultRepository: VaultRepository,
  secretKey: SecretKey,
  email: string,
  password: string,
): Promise<Session> => {
  try {
    const mockAuthenticator: Authenticator = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      login: async (_profile: any, _auker: AccountUnlockKey) => {
        console.info('Mock SRP authentication completed');
      },
      createProfileAuth: (): ProfileAuth => ({
        salt: 'dummy',
        alg: 'dummy',
        iterations: 0,
        method: 'dummy',
      }),
      storeProfileAuth: async (
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        accountId: string,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        profileAuth: ProfileAuth,
      ): Promise<void> => {
        // noop
      },
    };

    const authFlow = new AuthenticationFlow(
      mockAuthenticator,
      keysetRepository,
      profileRepository,
      vaultRepository,
    );

    return await authFlow.login(email, password, secretKey);
  } catch (error) {
    console.error('Authentication failed:', error);
    throw error;
  }
};

const completeAccountCreation = async (
  keysetRepository: KeysetRepository,
  profileRepository: ProfileRepository,
  vaultRepository: VaultRepository,
  registrationInfo: RegistrationInfo,
  password: string,
): Promise<void> => {
  TemplateRenderer.renderToElement('account-progress', {}, $accountProgress);
  $accountProgress.classList.remove('hidden');

  $completeAccountBtn.textContent = 'Creating Account...';

  try {
    if (!registrationInfo) {
      throw new Error('Registration info not available');
    }

    updateProgressStep('keyset', 'in-progress');

    const accountCreator = new AccountCreator(
      keysetRepository,
      profileRepository,
      vaultRepository,
    );

    await accountCreator.create(registrationInfo);

    updateProgressStep('keyset', 'completed');

    await displayGeneratedKeys(keysetRepository, vaultRepository);

    updateProgressStep('vault', 'completed');

    updateProgressStep('profile', 'completed');

    const vaults = await vaultRepository.list();
    const summaryData = {
      email: registrationInfo.emailAddress,
      accountId: registrationInfo.secretKey.accountId,
      vaultId: vaults[0]?.uuid || 'No vault created',
    };

    TemplateRenderer.renderToElement(
      'account-summary',
      summaryData,
      $accountSummary,
    );

    $accountSummary.classList.remove('hidden');

    activateCompleteAccountBtn();

    const session = await authenticateAndUnlockVaults(
      keysetRepository,
      profileRepository,
      vaultRepository,
      registrationInfo.secretKey,
      registrationInfo.emailAddress,
      password,
    );

    sendEvent('completedAccountCreation', { session });
  } catch (error) {
    console.error('Account creation failed:', error);
    resetCompleteAccountBtn();
  }
};

type AccountCompletionState = {
  registrationInfo: RegistrationInfo | null;
  password: string | null;
};

export class AccountCompletionSection
  implements Section, WithUpdate<AccountCompletionState>
{
  private state: AccountCompletionState = {
    registrationInfo: null,
    password: null,
  };

  constructor(
    keysetRepository: KeysetRepository,
    profileRepository: ProfileRepository,
    vaultRepository: VaultRepository,
    cleanRepositories: () => void,
  ) {
    $completeAccountBtn.addEventListener('click', () => {
      const registrationInfo = this.state.registrationInfo;
      if (!registrationInfo) {
        throw Error('Registration info not available');
      }

      const password = this.state.password;
      if (!password) {
        throw Error('Password not available');
      }

      cleanRepositories();

      completeAccountCreation(
        keysetRepository,
        profileRepository,
        vaultRepository,
        registrationInfo,
        password,
      );
    });
  }

  public update = (v: AccountCompletionState): void => {
    this.state = v;
  };

  public reset(): void {
    resetCompleteAccountBtn();
    $accountProgress.classList.add('hidden');
    $accountSummary.classList.add('hidden');
  }

  public show(): void {
    this.reset();
  }
}
