export const ENCRYPTED_ITEM_DEFAULT_CTY = "b5+jwk+json";

// Symmetric key encryption uses AES-GCM with 256 bit keys and
// a 96 bit IV per section 7.1 in NIST SP 800-38D)
export const SYMMETRIC_KEY_IV_NUMBER_OF_BYTES = 12;
export const SYMMETRIC_KEY_ENCRYPTION_ALGORITHM = "AES-GCM";
export const SYMMETRIC_KEY_ENCRYPTION_ALGORITHM_LENGTH_BITS = 256;

// As per 1Password White Paper page 11 and OWASP recommendations
export const KEY_DERIVATION_NUMBER_OF_ITERATIONS = 650_000;
