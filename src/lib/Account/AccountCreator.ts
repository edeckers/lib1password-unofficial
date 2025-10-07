import {
  ENCRYPTED_ITEM_DEFAULT_CTY,
  KEY_DERIVATION_NUMBER_OF_ITERATIONS,
  SYMMETRIC_KEY_ENCRYPTION_ALGORITHM,
} from "~/Consts";
import { logger } from "~/Deps";
import { KeysetRepository } from "~/lib/Account/AccountRepository";
import { RegistrationInfo } from "~/lib/Account/RegistrationInfo";
import {
  encryptSymmetric,
  exportCryptoKeyAsJwk,
  generateIV,
  generateSymKey,
} from "~/lib/Encryption";
import { base64encode, stringToArrayBuffer } from "~/lib/Encoding";
import { EncryptedKeyset } from "~/lib/Keysets/EncryptedKeyset";
import { ProfileRepository } from "~/lib/Profile/ProfileRepository";
import { KeyWithMeta, AsymEncryptedData } from "~/lib/Vault/Entities";
import { KeysetResponse } from "~/lib/Keysets/Entities";
import { VaultRepository } from "~/lib/Vault/VaultRepository";

// White paper page 12
//
// Key sets are fairly high-level abstractions; the actual keys within them have a finer structure that
// includes the specifications for the algorithms, such as initialization vectors. Symmetric encryption is
// AES-256-GCM, and public key encryption is RSA-OAEP with 2048-bit moduli and a public exponent of
// 65537.

// Static / config
const alg = "PBES2g-HS256";
const cty = ENCRYPTED_ITEM_DEFAULT_CTY;
const iterations = KEY_DERIVATION_NUMBER_OF_ITERATIONS;

// The BigInteger typedef is a Uint8Array that holds an arbitrary magnitude
// unsigned integer in big-endian order. 1*256*256 + 1 = 65_537
const publicExponent = new Uint8Array([1, 0, 1]);
const modulusLength = 2_048;

const hash = "SHA-1";

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

const generateKeyPair = () =>
  crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength,
      publicExponent,
      hash,
    },
    true,
    ["encrypt", "decrypt"],
  );

const generateEncryptedMasterSymKey = async (
  auk: CryptoKey,
  symKey: CryptoKey,
  p2s: Uint8Array,
) => {
  const iv = generateIV();

  const symKeyJwk = await exportCryptoKeyAsJwk(symKey);

  const symKeyEncryptedBytes = await crypto.subtle.encrypt(
    { name: SYMMETRIC_KEY_ENCRYPTION_ALGORITHM, iv },
    auk,
    stringToArrayBuffer(JSON.stringify(symKeyJwk)),
  );
  const symKeyEncryptedJson = base64encode(
    new Uint8Array(symKeyEncryptedBytes),
  );

  return {
    kid: "mp",
    data: symKeyEncryptedJson,
    cty,
    iv: base64encode(iv),
    alg,
    p2c: iterations,
    enc: "A256GCM",
    p2s: base64encode(p2s),
  };
};

const generateMasterKeyset = async (
  auk: CryptoKey,
  p2s: Uint8Array,
): Promise<KeysetResponse> => {
  const { privateKey, publicKey } = await generateKeyPair();

  const mp = await generateSymKey();

  const uuid = crypto.randomUUID();

  const encryptedSymKey = await generateEncryptedMasterSymKey(auk, mp.k, p2s);

  const priKeyJwk = await exportCryptoKeyAsJwk(privateKey);
  const pubKeyJwk = await exportCryptoKeyAsJwk(publicKey);

  const iv = generateIV();

  const priKeyEncryptedBytes = await crypto.subtle.encrypt(
    { name: SYMMETRIC_KEY_ENCRYPTION_ALGORITHM, iv },
    mp.k,
    stringToArrayBuffer(JSON.stringify(priKeyJwk)),
  );

  const priKeyEncryptedJson = base64encode(
    new Uint8Array(priKeyEncryptedBytes),
  );

  return {
    uuid,
    encryptedBy: "mp",
    encSymKey: encryptedSymKey,
    encPriKey: {
      kid: uuid,
      enc: "A256GCM",
      cty,
      data: priKeyEncryptedJson,
      iv: base64encode(iv),
    },
    pubKey: {
      ...pubKeyJwk,
      kid: uuid,
    },
  };
};

export class AccountCreator {
  constructor(
    private readonly keysetRepository: KeysetRepository,
    private readonly profileRepository: ProfileRepository,
    private readonly vaultRepository: VaultRepository,
  ) {}

  public create = async (registration: RegistrationInfo) => {
    const { secretKey, aukSalt, auk, emailAddress } = registration;

    logger.info("Generate keyset");
    const saltedAukCryptoKey = await auk.derive(
      KEY_DERIVATION_NUMBER_OF_ITERATIONS,
      aukSalt,
    );
    const newKeyset = await generateMasterKeyset(saltedAukCryptoKey, aukSalt);

    await this.keysetRepository.upsertKeyset(newKeyset);
    logger.info("Generated keyset");

    // Verify we can read it back
    logger.info("Retrieving keyset");
    const encryptedKeysetResponses =
      await this.keysetRepository.readKeysetsRaw();

    const masterKeyset = encryptedKeysetResponses.find(
      (ks) => ks.uuid === newKeyset.uuid,
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
