import { KeysetRepository } from "~/lib/Account/AccountRepository";
import { AccountUnlockKey } from "~/lib/Account/AccountUnlockKey";
import { SecretKey } from "~/lib/Account/SecretKey";
import { KeysetDecryptor } from "~/lib/Keysets/KeysetDecryptor";
import { Vault } from "~/lib/Vault/Vault";
import { VaultRepository } from "~/lib/Vault/VaultRepository";
import {
  base64decode,
  base64encode,
  stringToArrayBuffer,
} from "~/lib/Encoding";
import { exportCryptoKeyAsJwk, generateIV } from "~/lib/Encryption";
import { SYMMETRIC_KEY_ENCRYPTION_ALGORITHM } from "~/Consts";

class Rekeyer {
  private constructor(
    private readonly keysetRepository: KeysetRepository,
    private readonly decryptor: KeysetDecryptor,
    private readonly masterKeysetUuid: string,
  ) {}

  public rekey = async (
    secretKey: SecretKey,
    emailAddress: string,
    password: string,
  ): Promise<void> => {
    const keysets = await this.keysetRepository.readKeysetsRaw();
    const masterKeyset = keysets.find(
      (ks) => ks.uuid === this.masterKeysetUuid,
    );

    if (!masterKeyset) {
      throw new Error("No master keyset found");
    }

    const decryptedMasterKeyset =
      this.decryptor.encryptedKeyset[this.masterKeysetUuid];

    if (!decryptedMasterKeyset) {
      throw new Error("Master keyset not found in decryptor");
    }

    const newAuk = await AccountUnlockKey.create(
      emailAddress,
      password,
      secretKey,
    );

    const { encSymKey } = masterKeyset;
    const originalSalt = base64decode(encSymKey.p2s);
    const iterations = encSymKey.p2c;

    const newDerivedKey = await newAuk.derive(iterations, originalSalt);

    const symKeyJwk = await exportCryptoKeyAsJwk(decryptedMasterKeyset.sym.k);
    const iv = generateIV();

    const encryptedSymKeyBytes = await crypto.subtle.encrypt(
      { name: SYMMETRIC_KEY_ENCRYPTION_ALGORITHM, iv },
      newDerivedKey,
      stringToArrayBuffer(JSON.stringify(symKeyJwk)),
    );

    const updatedMasterKeyset = {
      ...masterKeyset,
      encSymKey: {
        ...encSymKey,
        data: base64encode(new Uint8Array(encryptedSymKeyBytes)),
        iv: base64encode(iv),
      },
    };

    await this.keysetRepository.upsertKeyset(updatedMasterKeyset);
  };

  public static using = (keysetRepository: KeysetRepository) => ({
    create: (decryptor: KeysetDecryptor, masterKeysetUuid: string): Rekeyer =>
      new Rekeyer(keysetRepository, decryptor, masterKeysetUuid),
  });
}

export class Session {
  constructor(
    /**
     * @deprecated We don't use this anywhere, best not to be exposed if not absolutely necessary
     */
    public readonly secretKey: SecretKey,
    public readonly vaults: Vault[],
    private readonly rekeyer: Rekeyer,
  ) {}

  public getPersonalVault = (): Vault | undefined =>
    this.vaults.length > 0 ? this.vaults[0] : undefined;

  public rekey = (emailAddress: string, password: string): Promise<void> =>
    this.rekeyer.rekey(this.secretKey, emailAddress, password);

  public static using = (
    keysetRepository: KeysetRepository,
    vaultRepository: VaultRepository,
  ) => ({
    start: async (
      accountUnlockKey: AccountUnlockKey,
      secretKey: SecretKey,
    ): Promise<Session> => {
      const keysets = await keysetRepository.readKeysetsRaw();

      const decryptor = await KeysetDecryptor.unlock(accountUnlockKey, keysets);

      const vaults = await vaultRepository.list();

      const unlockedVaults = await Promise.all(
        vaults.map((v) => Vault.using(vaultRepository).unlock(decryptor, v)),
      );

      const masterKeyset = keysets.find((ks) => ks.encryptedBy === "mp");
      if (!masterKeyset) {
        throw new Error("No master keyset found");
      }

      const rekeyer = Rekeyer.using(keysetRepository).create(
        decryptor,
        masterKeyset.uuid,
      );

      return new Session(secretKey, unlockedVaults, rekeyer);
    },
  });
}
