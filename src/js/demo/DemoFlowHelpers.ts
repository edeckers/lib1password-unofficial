import {
  $accountCreationSection,
  $decryptionSection,
  $keyDerivationSection,
  $secretKeySection,
  $transition2,
  $transition1,
  $transition3,
  $transition4,
  $transition5,
  $vaultItemSection,
} from '~/demo/sections/Elements';

const allSections = [
  $accountCreationSection,
  $secretKeySection,
  $vaultItemSection,
  $keyDerivationSection,
  $decryptionSection,
];

const allTransitions = [
  $transition2,
  $transition1,
  $transition3,
  $transition4,
  $transition5,
];

export const hideAllSections = () => {
  allSections.forEach((s) => s.classList.add('hidden'));
  allTransitions.forEach((t) => t.classList.add('hidden'));
};

export const scrollToSecretKeySection = (
  where: ScrollLogicalPosition = 'start',
): void => {
  $secretKeySection.scrollIntoView({ behavior: 'smooth', block: where });
};

export const scrollToDecryptionSection = (
  where: ScrollLogicalPosition = 'start',
): void => {
  $decryptionSection.scrollIntoView({ behavior: 'smooth', block: where });
};
export const scrollToAccountCreationSection = (
  where: ScrollLogicalPosition = 'start',
): void => {
  $accountCreationSection.scrollIntoView({
    behavior: 'smooth',
    block: where,
  });
};
