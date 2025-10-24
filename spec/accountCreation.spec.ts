import { AccountCreator } from "../src/lib/Account/AccountCreator";
import { RegistrationInfo } from "../src/lib/Account/RegistrationInfo";
import { InMemoryAccountRepository } from "../src/lib/Example/InMemoryAccountRepository";
import { InMemoryVaultRepository } from "../src/lib/Example/InMemoryVaultRepository";
import { Vault } from "../src/lib/Vault/Vault";
import { KeysetDecryptor } from "../src/lib/Keysets/KeysetDecryptor";
import { arrayBufferToString, stringToArrayBuffer } from "../src/lib/Encoding";
import { Fixtures } from "./fixtures";

describe("Account creation", () => {
  let registrationInfo: RegistrationInfo
  let accounts: InMemoryAccountRepository;
  let vaults: InMemoryVaultRepository;

  let accountCreatorService: AccountCreator;

  beforeEach(async () => {
    registrationInfo = await Fixtures.registrationInfo();
    accounts = Fixtures.accounts();
    vaults = Fixtures.vaults();
    accountCreatorService = new AccountCreator(
      accounts,
      accounts,
      vaults
    );
  });

  describe("Creating an account", () => {


    it("creates a master keyset", async () => {
      // Arrange
      const keysetsBefore = await accounts.readKeysetsRaw();

      // Act
      await accountCreatorService.create(
        registrationInfo
      );

      // Assert
      const keysetsAfter = await accounts.readKeysetsRaw();

      expect(keysetsBefore.length).toBe(0);
      expect(keysetsAfter.length).toBe(1);
    });

    it("creates a personal vault", async () => {
      // Arrange
      const vaultsBefore = await vaults.list();

      // Act
      await accountCreatorService.create(
        registrationInfo
      );

      // Assert
      const vaultsAfter = await vaults.list();

      expect(vaultsBefore.length).toBe(0);
      expect(vaultsAfter.length).toBe(1);
    });
  });

  describe("The master keyset", () => {
    it("can decrypt the personal vault", async () => {
      // Arrange
      const {
        auk: accountUnlockKey,
      } = registrationInfo;


      await accountCreatorService.create(
        registrationInfo
      );

      const keysetsResponse = await accounts.readKeysetsRaw();

      const decryptor = await KeysetDecryptor.unlock(accountUnlockKey, keysetsResponse);

      const vx = await vaults.list();

      const firstVault = vx[0];

      // Act
      const vault = await Vault.using(vaults).unlock(
        decryptor,
        firstVault
      );


      // Assert
      expect(vault.name).toBe("My Vault");
    });
  })

  describe("Written vault items", () => {
    it("are stored encrypted by the vaults symmetric key", async () => {
      // Arrange
      const {
        auk: accountUnlockKey,
      } = registrationInfo;

      await accountCreatorService.create(
        registrationInfo
      );

      const keysetsResponse = await accounts.readKeysetsRaw();

      const decryptor = await KeysetDecryptor.unlock(accountUnlockKey, keysetsResponse);

      const vx = await vaults.list();

      const firstVault = vx[0];

      const vault = await Vault.using(vaults).unlock(
        decryptor,
        firstVault
      );

      const anyVaultItemId = crypto.randomUUID();

      const testSensitiveData: string = crypto.randomUUID();

      // Act
      await vault.writeItem(
        anyVaultItemId,
        stringToArrayBuffer(testSensitiveData)
      );

      // Assert
      const storedVaultItem = await vaults.readItemFromVault(vault.uuid, anyVaultItemId);

      const vaultKeyBytes = await decryptor.decrypt(firstVault.access[0].encVaultKey)

      const vaultKeyJson = JSON.parse(arrayBufferToString(vaultKeyBytes))

      expect(storedVaultItem.kid).toBe(vaultKeyJson["kid"]);
    });

    it("can be read decrypted using the vaults symmetric key", async () => {
      // Arrange
      const {
        auk: accountUnlockKey,
      } = registrationInfo;

      await accountCreatorService.create(
        registrationInfo
      );

      const keysetsResponse = await accounts.readKeysetsRaw();

      const encryptedKeyset = await KeysetDecryptor.unlock(accountUnlockKey, keysetsResponse);

      const vx = await vaults.list();

      const firstVault = vx[0];

      const vault = await Vault.using(vaults).unlock(
        encryptedKeyset,
        firstVault
      );

      const anyVaultItemId = crypto.randomUUID();

      const testSensitiveData: string = crypto.randomUUID();

      // Act
      await vault.writeItem(
        anyVaultItemId,
        stringToArrayBuffer(testSensitiveData)
      );

      // Assert
      const vaultItem = await vault.readItem(anyVaultItemId);

      const vaultItemText = arrayBufferToString(vaultItem.data);

      expect(vaultItemText).toBe(testSensitiveData);
    });
  });
});