import {
  AccountUnlockKey,
  type SecretKey,
} from '@edeckers/lib1password-unofficial';
import { TemplateRenderer } from '~/TemplateRenderer';

import { type Section, type WithUpdate } from '~/demo/Sections';
import { $ } from '~/demo/Utils';
import { sendEvent } from '~/Events';

const $deriveKeysBtn = $('#deriveKeysBtn');
const $aukPreview = $('#aukPreview');
const $derivationMetrics = $('#derivationMetrics');

const $passwordPreview = $('#passwordPreview');
const $secretKeyPreview = $('#secretKeyPreview');
const $pbkdf2Parameters = $('#pbkdf2-parameters');

const resetDeriveKeysBtn = () => {
  $deriveKeysBtn.textContent = 'Derive Account Unlock Key';
  $deriveKeysBtn.removeAttribute('disabled');
};

const deriveAccountUnlockKey = async (
  secretKey: SecretKey,
  emailAddress: string,
  password: string,
  numberOfIterations: number,
): Promise<void> => {
  $deriveKeysBtn.textContent = 'Deriving Keys...';
  $deriveKeysBtn.setAttribute('disabled', 'true');

  try {
    const startTime = performance.now();

    const auk = await AccountUnlockKey.create(
      emailAddress,
      password,
      secretKey,
    );

    // Generate mock salt for demo (32 bytes)
    const mockSalt = new Uint8Array(32);
    crypto.getRandomValues(mockSalt);

    const accountUnlockKey = await auk.derive(numberOfIterations, mockSalt);

    const endTime = performance.now();
    const timeTaken = Math.round(endTime - startTime);

    // Display the derived key using external template
    const keyArray = new Uint8Array(
      await crypto.subtle.exportKey('raw', accountUnlockKey),
    );
    const keyHex = Array.from(keyArray.slice(0, 16))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    TemplateRenderer.renderToElement(
      'auk-preview',
      {
        keyHex: keyHex + '...',
      },
      $aukPreview,
    );

    TemplateRenderer.renderToElement(
      'derivation-metrics',
      {
        derivationTime: `${timeTaken}ms`,
        iterationCount: numberOfIterations.toLocaleString('en-us', {
          useGrouping: true,
        }),
      },
      $derivationMetrics,
    );

    $derivationMetrics.classList.remove('hidden');

    sendEvent('derivedKeys', { auk });
  } catch (error) {
    console.error('Key derivation failed:', error);
    $aukPreview.innerHTML = `
                <div class="text-xs text-red-600">❌ Derivation failed</div>
                <div class="text-xs text-red-500">${error}</div>
            `;
  } finally {
    resetDeriveKeysBtn();
  }
};

type KeyDerivationState = {
  secretKey: SecretKey | null;
  emailAddress: string | null;
  password: string | null;
};

export class KeyDerivationSection
  implements Section, WithUpdate<KeyDerivationState>
{
  private state: KeyDerivationState = {
    secretKey: null,
    emailAddress: null,
    password: null,
  };

  constructor(private readonly numberOfIterations: number) {
    $deriveKeysBtn.addEventListener('click', () => {
      const secretKey = this.state.secretKey;
      if (!secretKey) {
        throw new Error('Secret key is not set');
      }

      if (!this.state.emailAddress) {
        throw new Error('Email address is not set');
      }

      if (!this.state.password) {
        throw new Error('Password is not set');
      }

      deriveAccountUnlockKey(
        secretKey,
        this.state.emailAddress,
        this.state.password,
        numberOfIterations,
      );
    });
  }

  public update = (v: KeyDerivationState): void => {
    this.state = v;
  };

  public reset(): void {
    resetDeriveKeysBtn();
    $aukPreview.innerHTML = 'Click "Derive Account Unlock Key" to generate';
    $derivationMetrics.classList.add('hidden');

    $passwordPreview.textContent = this.state.password ?? '';
    $secretKeyPreview.textContent = this.state.secretKey?.fullWithDashes ?? '';

    TemplateRenderer.renderToElement(
      'pbkdf2-parameters',
      {
        iterationCount:
          this.numberOfIterations?.toLocaleString('en-us', {
            useGrouping: true,
          }) || 'N/A',
      },
      $pbkdf2Parameters,
    );
  }

  public show(): void {
    this.reset();
  }
}
