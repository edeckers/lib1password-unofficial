import {
  ENCRYPTED_ITEM_DEFAULT_CTY,
  KEY_DERIVATION_NUMBER_OF_ITERATIONS,
} from "~/Consts";
import { logger } from "~/Deps";
import { KeysetRepository } from "~/lib/Account/AccountRepository";
import { RegistrationInfo } from "~/lib/Account/RegistrationInfo";
import {
  encryptSymmetric,
  exportCryptoKeyAsJwk,
  generateSalt,
  generateSymKey,
} from "~/lib/Encryption";
import { base64encode, stringToArrayBuffer } from "~/lib/Encoding";
import { EncryptedKeyset } from "~/lib/Keysets/EncryptedKeyset";
import { ProfileRepository } from "~/lib/Profile/ProfileRepository";
import { KeyWithMeta, AsymEncryptedData } from "~/lib/Vault/Entities";
import { VaultRepository } from "~/lib/Vault/VaultRepository";

const createVaultKey = async (
  pub: KeyWithMeta,
): Promise<[AsymEncryptedData, KeyWithMeta]> => {
  const vaultKey = await generateSymKey();

  const encVaultKey = await encryptVaultKey(pub, vaultKey);

  return [encVaultKey, vaultKey];
};

const encryptVaultKey = async (
  pub: KeyWithMeta,
  vaultKey: KeyWithMeta,
): Promise<AsymEncryptedData> => {
  const vaultJwk = await exportCryptoKeyAsJwk(vaultKey.k);

  const vaultJwkBytes = stringToArrayBuffer(
    JSON.stringify({
      ...vaultJwk,
      kid: vaultKey.kid,
    }),
  );

  const data = await crypto.subtle.encrypt(
    pub.k.algorithm,
    pub.k,
    vaultJwkBytes,
  );

  return {
    cty: ENCRYPTED_ITEM_DEFAULT_CTY,
    kid: pub.kid,
    enc: pub.k.algorithm.name,
    data: base64encode(new Uint8Array(data)),
  };
};

export class AccountCreator {
  constructor(
    private readonly keysetRepository: KeysetRepository,
    private readonly profileRepository: ProfileRepository,
    private readonly vaultRepository: VaultRepository,
  ) {}

  public create = async (registration: RegistrationInfo) => {
    const aukSalt = generateSalt();

    const { secretKey, auk, emailAddress } = registration;

    logger.info("Generate keyset");
    const saltedAukCryptoKey = await auk.derive(
      KEY_DERIVATION_NUMBER_OF_ITERATIONS,
      aukSalt,
    );
    const newKeyset = await EncryptedKeyset.create(
      "mp",
      saltedAukCryptoKey,
      aukSalt,
    );

    await this.keysetRepository.upsertKeyset(newKeyset.keyset);
    logger.info("Generated keyset");

    // Verify we can read it back
    logger.info("Retrieving keyset");
    const encryptedKeysetResponses =
      await this.keysetRepository.readKeysetsRaw();

    const masterKeyset = encryptedKeysetResponses.find(
      (ks) => ks.uuid === newKeyset.keyset.uuid,
    );
    if (!masterKeyset) {
      throw new Error("Failed to read back created keyset");
    }

    const encryptedKeyset = EncryptedKeyset.fromResponse(masterKeyset);

    const { pub } = await encryptedKeyset.decryptMaster(auk);
    logger.info("Retrieved keyset");

    logger.info("Creating profile");
    await this.profileRepository.storeProfile(
      secretKey.accountId,
      secretKey.version,
      emailAddress,
    );
    logger.info("Created profile");

    logger.info("Creating Vault Access");
    const [encVaultKey, vaultKey] = await createVaultKey(pub);
    logger.info("Created Vault Access");

    logger.info("Creating Personal Vault");

    logger.info("Creating Personalt Vault Attributes");
    const encAttrs = await encryptSymmetric(
      vaultKey,
      stringToArrayBuffer(JSON.stringify({ name: "My Vault" })),
    );
    logger.info("Created Personalt Vault Attributes");

    const access = {
      encryptedBy: pub.kid,
      encVaultKey,
    };

    await this.vaultRepository.create(
      crypto.randomUUID(),
      "P",
      encAttrs,
      access,
    );
    logger.info("Created Personal Vault");
  };
}
