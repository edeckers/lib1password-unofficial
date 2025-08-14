import type { SecretKey } from '@edeckers/lib1password-unofficial';
import { TemplateRenderer } from '~/TemplateRenderer';
import { type Section, type WithUpdate } from '~/demo/Sections';
import { $secretKeySection } from '~/demo/sections/Elements';
import { $ } from '~/demo/Utils';

const $secretKeyDisplay = $('#secretKeyDisplay');
const $keyAnatomy = $('#keyAnatomy');

const displaySecretKey = (secretKey: SecretKey): void => {
  $secretKeySection.classList.remove('hidden');

  $secretKeyDisplay.textContent = secretKey.fullWithDashes;

  $keyAnatomy.innerHTML = '';

  const anatomyData = {
    version: secretKey.version,
    accountId: secretKey.accountId,
    secret: secretKey.secret,
  };

  TemplateRenderer.appendToElement(
    'secret-key-anatomy',
    anatomyData,
    $keyAnatomy,
  );
  TemplateRenderer.appendToElement('key-breakdown', anatomyData, $keyAnatomy);
};

type SecretKeyState = {
  secretKey: SecretKey | null;
};
export class SecretKeySection implements Section, WithUpdate<SecretKeyState> {
  private state: SecretKeyState = {
    secretKey: null,
  };

  public show(): void {
    const secretKey = this.state.secretKey;
    if (!secretKey) {
      throw new Error('Registration info is not set');
    }

    displaySecretKey(secretKey);
  }

  public reset(): void {
    // noop
  }

  public update(v: SecretKeyState): void {
    this.state = v;
  }
}
