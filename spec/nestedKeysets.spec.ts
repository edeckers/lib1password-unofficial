import { AccountCreator } from "~/lib/Account/AccountCreator";
import { RegistrationInfo } from "~/lib/Account/RegistrationInfo";
import { ENCRYPTED_ITEM_DEFAULT_CTY } from "~/Consts";
import { base64encode, stringToBytes } from "~/lib/Encoding";
import {
  encryptSymmetric,
  exportCryptoKeyAsJwk,
  generateSymKey,
} from "~/lib/Encryption";
import { InMemoryAccountRepository } from "~/lib/Example/InMemoryAccountRepository";
import { InMemoryVaultRepository } from "~/lib/Example/InMemoryVaultRepository";
import { Keyset, KeysetResponse } from "~/lib/Keysets/Entities";
import { KeysetDecryptor } from "~/lib/Keysets/KeysetDecryptor";
import {
  AsymEncryptedData,
  KeyWithMeta,
  VaultInfo,
} from "~/lib/Vault/Entities";
import { Vault } from "~/lib/Vault/Vault";
import { Fixtures } from "./fixtures";

type Generated = { response: KeysetResponse; keyset: Keyset };

const sealKey = async (
  publicKey: KeyWithMeta,
  key: KeyWithMeta,
): Promise<AsymEncryptedData> => ({
  kid: publicKey.kid,
  enc: "RSA-OAEP",
  cty: ENCRYPTED_ITEM_DEFAULT_CTY,
  data: base64encode(
    new Uint8Array(
      await crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        publicKey.k,
        stringToBytes(
          JSON.stringify({
            ...(await exportCryptoKeyAsJwk(key.k)),
            kid: key.kid,
          }),
        ),
      ),
    ),
  ),
});

const sealedTo = async (parent: Generated): Promise<Generated> => {
  const uuid = crypto.randomUUID();
  const pair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-1",
    },
    true,
    ["encrypt", "decrypt"],
  );
  const sym = await generateSymKey();

  return {
    response: {
      uuid,
      encryptedBy: parent.response.uuid,
      encSymKey: await sealKey(parent.keyset.pub, { kid: uuid, k: sym.k }),
      encPriKey: await encryptSymmetric(
        { kid: uuid, k: sym.k },
        stringToBytes(
          JSON.stringify(await exportCryptoKeyAsJwk(pair.privateKey)),
        ),
      ),
      pubKey: { ...(await exportCryptoKeyAsJwk(pair.publicKey)), kid: uuid },
    },
    keyset: {
      sym: { kid: uuid, k: sym.k },
      pri: { kid: uuid, k: pair.privateKey },
      pub: { kid: uuid, k: pair.publicKey },
    },
  };
};

const vaultSharedWith = async (owner: Generated): Promise<VaultInfo> => {
  const vaultKey = await generateSymKey();

  return {
    uuid: crypto.randomUUID(),
    type: "U",
    encAttrs: await encryptSymmetric(
      vaultKey,
      stringToBytes(JSON.stringify({ name: "Shared" })),
    ),
    access: [
      {
        encryptedBy: owner.response.uuid,
        encVaultKey: await sealKey(owner.keyset.pub, vaultKey),
      },
    ],
  };
};

// 1Password seals a group keyset's symmetric key with RSA-OAEP to its parent
// keyset's public key.
describe("Nested keysets", () => {
  let registrationInfo: RegistrationInfo;
  let master: Generated;
  let group: Generated;
  let subgroup: Generated;

  beforeEach(async () => {
    registrationInfo = await Fixtures.registrationInfo();
    const accounts = new InMemoryAccountRepository();
    await new AccountCreator(
      accounts,
      accounts,
      new InMemoryVaultRepository(),
    ).create(registrationInfo);

    const [response] = await accounts.readKeysetsRaw();
    const decryptor = await KeysetDecryptor.unlock(registrationInfo.auk, [
      response,
    ]);
    master = { response, keyset: decryptor.encryptedKeyset[response.uuid] };
    group = await sealedTo(master);
    subgroup = await sealedTo(group);
  });

  it("unlock when sealed to their parent's public key", async () => {
    // Arrange
    const keysets = [master, group, subgroup].map((g) => g.response);

    // Act
    const decryptor = await KeysetDecryptor.unlock(
      registrationInfo.auk,
      keysets,
    );

    // Assert
    expect(keysets.every((ks) => decryptor.contains(ks.uuid))).toBeTrue();
  });

  it("unlock whatever order they are listed in", async () => {
    // Arrange
    const keysets = [subgroup, group, master].map((g) => g.response);

    // Act
    const decryptor = await KeysetDecryptor.unlock(
      registrationInfo.auk,
      keysets,
    );

    // Assert
    expect(keysets.every((ks) => decryptor.contains(ks.uuid))).toBeTrue();
  });

  it("open a vault shared with a nested group", async () => {
    // Arrange
    const decryptor = await KeysetDecryptor.unlock(
      registrationInfo.auk,
      [master, group, subgroup].map((g) => g.response),
    );

    // Act
    const vault = await Vault.using(new InMemoryVaultRepository()).unlock(
      decryptor,
      await vaultSharedWith(subgroup),
    );

    // Assert
    expect(vault.name).toBe("Shared");
    expect(vault.meta.unlockedBy).toBe(subgroup.response.uuid);
  });
});
