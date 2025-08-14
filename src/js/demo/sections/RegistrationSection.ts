import { RegistrationInfo } from '@edeckers/lib1password-unofficial';
import type { Section } from '~/demo/Sections';
import { $ } from '~/demo/Utils';
import { sendEvent } from '~/Events';

const $createAccountBtn = $('#createAccount');
const $emailInput = $('#email') as HTMLInputElement;
const $passwordInput = $('#password') as HTMLInputElement;

const createRegistrationInfo = async (email: string, password: string) => {
  try {
    const registrationInfo = await RegistrationInfo.create(email, password);

    sendEvent('createdRegistrationInfo', { registrationInfo, password });
  } catch (error) {
    console.error('Secret key creation failed:', error);
    alert('Failed to create secret key. Please try again.');
  } finally {
    $createAccountBtn.textContent = 'Create Account & Generate Secret Key';
    $createAccountBtn.removeAttribute('disabled');
  }
};

const registerAccount = () => {
  const email = $emailInput.value.trim();
  const password = $passwordInput.value.trim();

  if (!email || !password) {
    alert('Please enter both email and password');
    return;
  }

  $createAccountBtn.textContent = 'Generating Secret Key...';
  $createAccountBtn.setAttribute('disabled', 'true');

  // Small delay to give the feel of processing
  setTimeout(() => {
    createRegistrationInfo(email, password);
  }, 200);
};

export class RegistrationSection implements Section {
  constructor() {
    $createAccountBtn.addEventListener('click', () => {
      registerAccount();
    });
  }

  public show(): void {
    // noop
  }

  public reset(): void {
    // noop
  }
}
