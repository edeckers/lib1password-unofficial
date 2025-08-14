import secretKeyAnatomyTemplate from '~/demo/sections/SecretKey/Templates/secret-key-anatomy.html?raw';
import keyBreakdownTemplate from '~/demo/sections/SecretKey/Templates/key-breakdown.html?raw';
import aukPreviewTemplate from '~/demo/sections/KeyDerivation/Templates/auk-preview.html?raw';
import derivationMetricsTemplate from '~/demo/sections/KeyDerivation/Templates/derivation-metrics.html?raw';
import pbkdf2ParametersTemplate from '~/demo/sections/KeyDerivation/Templates/pbkdf2-parameters.html?raw';
import accountProgressTemplate from '~/demo/sections/AccountCompletion/Templates/account-progress.html?raw';
import accountSummaryTemplate from '~/demo/sections/AccountCompletion/Templates/account-summary.html?raw';
import stortedItemTemplate from '~/demo/sections/VaultItem/Templates/stored-item.html?raw';
import decryptedItemTemplate from '~/demo/sections/Decryption/Templates/decrypted-item.html?raw';

export class TemplateRenderer {
  private static templates: Record<string, string> = {
    'account-progress': accountProgressTemplate,
    'account-summary': accountSummaryTemplate,
    'auk-preview': aukPreviewTemplate,
    'decrypted-item': decryptedItemTemplate,
    'derivation-metrics': derivationMetricsTemplate,
    'key-breakdown': keyBreakdownTemplate,
    'pbkdf2-parameters': pbkdf2ParametersTemplate,
    'secret-key-anatomy': secretKeyAnatomyTemplate,
    'stored-item': stortedItemTemplate,
  };

  private static createElementFromHTML(htmlString: string): DocumentFragment {
    const template = document.createElement('template');
    template.innerHTML = htmlString.trim();
    return template.content;
  }

  private static populateFields(
    element: DocumentFragment | HTMLElement,
    data: Record<string, string>,
  ): void {
    const fields = element.querySelectorAll('[data-field]');
    fields.forEach((field) => {
      const fieldName = field.getAttribute('data-field');
      if (fieldName && data[fieldName] !== undefined) {
        field.textContent = data[fieldName];
      }
    });
  }

  static render(
    templateId: string,
    data: Record<string, string> = {},
  ): DocumentFragment {
    const templateHTML = this.templates[templateId];
    if (!templateHTML) {
      throw new Error(`Template with id "${templateId}" not found`);
    }

    const element = this.createElementFromHTML(templateHTML);
    this.populateFields(element, data);
    return element;
  }

  static renderToElement(
    templateId: string,
    data: Record<string, string>,
    container: HTMLElement,
  ): void {
    const rendered = this.render(templateId, data);
    container.innerHTML = '';
    container.appendChild(rendered);
  }

  static appendToElement(
    templateId: string,
    data: Record<string, string>,
    container: HTMLElement,
  ): void {
    const rendered = this.render(templateId, data);
    container.appendChild(rendered);
  }
}
