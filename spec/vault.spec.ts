import { Vault } from "~/lib/Vault/Vault";
import { AccountCreator } from "../src/lib/Account/AccountCreator";
import { RegistrationInfo } from "../src/lib/Account/RegistrationInfo";
import { InMemoryAccountRepository } from "../src/lib/Example/InMemoryAccountRepository";
import { InMemoryVaultRepository } from "../src/lib/Example/InMemoryVaultRepository";
import { Fixtures } from "./fixtures";
import { KeysetDecryptor } from "~/lib/Keysets/KeysetDecryptor";

describe("Vaults", () => {
  let registrationInfo: RegistrationInfo
  let accounts: InMemoryAccountRepository;
  let vaults: InMemoryVaultRepository;

  let accountCreatorService: AccountCreator;

  let personalVault: Vault

  beforeEach(async () => {
    registrationInfo = await Fixtures.registrationInfo();
    accounts = Fixtures.accounts();
    vaults = Fixtures.vaults();
    accountCreatorService = new AccountCreator(
      accounts,
      accounts,
      vaults
    );

    const {
      auk: accountUnlockKey,
    } = registrationInfo;

    await accountCreatorService.create(
      registrationInfo
    );

    await accountCreatorService.create(
      registrationInfo
    );

    const keysetsResponse = await accounts.readKeysetsRaw();

    const decryptor = await KeysetDecryptor.unlock(accountUnlockKey, keysetsResponse);

    const vx = await vaults.list();

    const firstVault = vx[0]!!;

    // Act
    personalVault = await Vault.using(vaults).unlock(
      decryptor,
      firstVault
    );
  });

  describe("Which are decrypted", () => {


    it("can have an item added", async () => {
      // Arrange
      const randomSecret = crypto.getRandomValues(new Uint8Array(16));
      const randomAlphaNumericKey = Array.from(randomSecret).map(b => ('0' + b.toString(16)).slice(-2)).join('').slice(0, 12);

      // Act
      await personalVault.writeItem(randomAlphaNumericKey, randomSecret);

      // Assert
      const items = await personalVault.readAllItems()

      const maybeItem = items?.find(i => i.id === randomAlphaNumericKey);

      expect(maybeItem).toBeDefined();
      expect(maybeItem?.data).toEqual(randomSecret.buffer);
    });
  });
});