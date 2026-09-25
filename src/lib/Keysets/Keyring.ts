import { SomeEncryptedData } from "~/lib/Keysets/Entities";
import { decryptAsymmetric, decryptSymmetric } from "~/lib/Encryption";

/**
 * Keys by the id that encrypted values name them by. Every value in the model,
 * from a keyset's own key to a vault item, is opened the same way: with the key
 * its kid names, using the algorithm its enc names.
 */
export class Keyring {
  private constructor(
    private readonly symmetricKeys: ReadonlyMap<string, CryptoKey>,
    private readonly privateKeys: ReadonlyMap<string, CryptoKey>,
  ) {}

  public static readonly empty = new Keyring(new Map(), new Map());

  public withSymmetricKey = (kid: string, key: CryptoKey): Keyring =>
    new Keyring(new Map(this.symmetricKeys).set(kid, key), this.privateKeys);

  public withPrivateKey = (kid: string, key: CryptoKey): Keyring =>
    new Keyring(this.symmetricKeys, new Map(this.privateKeys).set(kid, key));

  public canOpen = (encrypted: SomeEncryptedData): boolean =>
    encrypted.enc === "RSA-OAEP"
      ? this.privateKeys.has(encrypted.kid)
      : this.symmetricKeys.has(encrypted.kid);

  public open = async (encrypted: SomeEncryptedData): Promise<ArrayBuffer> => {
    if (encrypted.enc === "RSA-OAEP") {
      return decryptAsymmetric(
        keyFor(this.privateKeys, encrypted.kid),
        encrypted,
      );
    }

    if (encrypted.enc === "A256GCM" && "iv" in encrypted) {
      return decryptSymmetric(
        keyFor(this.symmetricKeys, encrypted.kid),
        encrypted,
      );
    }

    throw new Error("Unsupported encryption " + encrypted.enc);
  };
}

const keyFor = (keys: ReadonlyMap<string, CryptoKey>, kid: string) => {
  const key = keys.get(kid);
  if (!key) {
    throw new Error("No key found for kid " + kid);
  }

  return key;
};
