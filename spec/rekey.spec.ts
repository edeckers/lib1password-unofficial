import { AccountCreator } from "~/lib/Account/AccountCreator";
import { RegistrationInfo } from "~/lib/Account/RegistrationInfo";
import { InMemoryAccountRepository } from "~/lib/Example/InMemoryAccountRepository";
import { InMemoryVaultRepository } from "~/lib/Example/InMemoryVaultRepository";
import { AuthenticationFlow } from "~/lib/AuthenticationFlow";
import { Authenticator } from "~/lib/Authentication/Authenticator";
import { AccountUnlockKey } from "~/lib/Account/AccountUnlockKey";
import { Fixtures } from "./fixtures";
import { base64encode } from "~/lib/Encoding";
import { generateSalt } from "~/lib/Encryption";
import { KEY_DERIVATION_NUMBER_OF_ITERATIONS } from "~/Consts";

interface ProfileAuth {
  salt: string;
  alg: string;
  iterations: number;
  method: string;
}

class TestAuthenticator implements Authenticator {
  private readonly profileAuthStore: { [key: string]: ProfileAuth } = {};

  async login(
    accountId: string,
    accountUnlockKey: AccountUnlockKey,
  ): Promise<void> {
    const profileAuth = this.profileAuthStore[accountId];
    if (!profileAuth) {
      throw new Error(`No profile auth stored for account ${accountId}`);
    }
  }

  public async storeProfileAuth(
    accountId: string,
    profileAuth: ProfileAuth,
  ): Promise<void> {
    this.profileAuthStore[accountId] = profileAuth;
  }

  public createProfileAuth(): ProfileAuth {
    return {
      salt: base64encode(generateSalt()),
      iterations: KEY_DERIVATION_NUMBER_OF_ITERATIONS,
      alg: "PBES2g-HS256",
      method: "SRPX",
    };
  }
}

describe("Session Rekeying", () => {
  let registrationInfo: RegistrationInfo;
  let accounts: InMemoryAccountRepository;
  let vaults: InMemoryVaultRepository;
  let accountCreator: AccountCreator;
  let authenticator: TestAuthenticator;
  let authenticationFlow: AuthenticationFlow;

  const originalPassword = "password123";
  const newPassword = "newPassword456";

  beforeEach(async () => {
    registrationInfo = await Fixtures.registrationInfo();
    accounts = Fixtures.accounts();
    vaults = Fixtures.vaults();
    authenticator = new TestAuthenticator();

    accountCreator = new AccountCreator(accounts, accounts, vaults);
    authenticationFlow = new AuthenticationFlow(
      authenticator,
      accounts,
      vaults,
    );

    // Store auth profile and create account
    authenticator.storeProfileAuth(
      registrationInfo.secretKey.accountId,
      authenticator.createProfileAuth(),
    );
    await accountCreator.create(registrationInfo);
  });

  describe("Changing password via rekey", () => {
    it("should allow login with new password after rekeying", async () => {
      // Arrange
      const session = await authenticationFlow.login(
        registrationInfo.emailAddress,
        originalPassword,
        registrationInfo.secretKey,
      );

      expect(session.vaults.length).toBe(1);

      // Act
      await session.changeCredentials(registrationInfo.emailAddress, newPassword);

      // Assert
      const newSession = await authenticationFlow.login(
        registrationInfo.emailAddress,
        newPassword,
        registrationInfo.secretKey,
      );

      expect(newSession.vaults.length).toBe(1);
      expect(newSession.secretKey.accountId).toBe(
        registrationInfo.secretKey.accountId,
      );
    });

    it("should maintain vault access after rekeying", async () => {
      // Arrange
      const session = await authenticationFlow.login(
        registrationInfo.emailAddress,
        originalPassword,
        registrationInfo.secretKey,
      );

      const vault = session.getPersonalVault();
      expect(vault).toBeDefined();

      const testData = crypto.getRandomValues(new Uint8Array(16));
      const testKey = crypto.randomUUID();
      await vault!.writeItem(testKey, testData);

      // Act
      await session.changeCredentials(registrationInfo.emailAddress, newPassword);

      // Assert
      const newSession = await authenticationFlow.login(
        registrationInfo.emailAddress,
        newPassword,
        registrationInfo.secretKey,
      );

      const newVault = newSession.getPersonalVault();
      expect(newVault).toBeDefined();

      const items = await newVault!.readAllItems();
      const retrievedItem = items?.find((i) => i.id === testKey);

      expect(retrievedItem).toBeDefined();
      expect(new Uint8Array(retrievedItem!.data)).toEqual(testData);
    });

    it("should fail to login with old password after rekeying", async () => {
      // Arrange
      const session = await authenticationFlow.login(
        registrationInfo.emailAddress,
        originalPassword,
        registrationInfo.secretKey,
      );

      // Act
      await session.changeCredentials(registrationInfo.emailAddress, newPassword);

      // Assert
      await expectAsync(
        authenticationFlow.login(
          registrationInfo.emailAddress,
          originalPassword,
          registrationInfo.secretKey,
        ),
      ).toBeRejected();
    });

    it("should allow vault operations from the same session after rekeying", async () => {
      // Arrange
      const session = await authenticationFlow.login(
        registrationInfo.emailAddress,
        originalPassword,
        registrationInfo.secretKey,
      );

      const vault = session.getPersonalVault();
      expect(vault).toBeDefined();

      // Act
      await session.changeCredentials(registrationInfo.emailAddress, newPassword);

      // Assert
      const testData = crypto.getRandomValues(new Uint8Array(16));
      const testKey = crypto.randomUUID();
      await vault!.writeItem(testKey, testData);

      const items = await vault!.readAllItems();
      const retrievedItem = items?.find((i) => i.id === testKey);

      expect(retrievedItem).toBeDefined();
      expect(new Uint8Array(retrievedItem!.data)).toEqual(testData);
    });
  });

  describe("Changing email via rekey", () => {
    const newEmail = "new@email.tld";

    it("should allow login with new email after rekeying", async () => {
      // Arrange
      const session = await authenticationFlow.login(
        registrationInfo.emailAddress,
        originalPassword,
        registrationInfo.secretKey,
      );

      expect(session.vaults.length).toBe(1);

      // Act
      await session.changeCredentials(newEmail, originalPassword);

      // Assert
      const newSession = await authenticationFlow.login(
        newEmail,
        originalPassword,
        registrationInfo.secretKey,
      );

      expect(newSession.vaults.length).toBe(1);
      expect(newSession.secretKey.accountId).toBe(
        registrationInfo.secretKey.accountId,
      );
    });

    it("should maintain vault access after rekeying", async () => {
      // Arrange
      const session = await authenticationFlow.login(
        registrationInfo.emailAddress,
        originalPassword,
        registrationInfo.secretKey,
      );

      const vault = session.getPersonalVault();
      expect(vault).toBeDefined();

      const testData = crypto.getRandomValues(new Uint8Array(16));
      const testKey = crypto.randomUUID();
      await vault!.writeItem(testKey, testData);

      // Act
      await session.changeCredentials(newEmail, originalPassword);

      // Assert
      const newSession = await authenticationFlow.login(
        newEmail,
        originalPassword,
        registrationInfo.secretKey,
      );

      const newVault = newSession.getPersonalVault();
      expect(newVault).toBeDefined();

      const items = await newVault!.readAllItems();
      const retrievedItem = items?.find((i) => i.id === testKey);

      expect(retrievedItem).toBeDefined();
      expect(new Uint8Array(retrievedItem!.data)).toEqual(testData);
    });

    it("should fail to login with old email after rekeying", async () => {
      // Arrange
      const session = await authenticationFlow.login(
        registrationInfo.emailAddress,
        originalPassword,
        registrationInfo.secretKey,
      );

      // Act
      await session.changeCredentials(newEmail, originalPassword);

      // Assert
      await expectAsync(
        authenticationFlow.login(
          registrationInfo.emailAddress,
          originalPassword,
          registrationInfo.secretKey,
        ),
      ).toBeRejected();
    });

    it("should allow vault operations from the same session after rekeying", async () => {
      // Arrange
      const session = await authenticationFlow.login(
        registrationInfo.emailAddress,
        originalPassword,
        registrationInfo.secretKey,
      );

      const vault = session.getPersonalVault();
      expect(vault).toBeDefined();

      // Act
      await session.changeCredentials(newEmail, originalPassword);

      // Assert
      const testData = crypto.getRandomValues(new Uint8Array(16));
      const testKey = crypto.randomUUID();
      await vault!.writeItem(testKey, testData);

      const items = await vault!.readAllItems();
      const retrievedItem = items?.find((i) => i.id === testKey);

      expect(retrievedItem).toBeDefined();
      expect(new Uint8Array(retrievedItem!.data)).toEqual(testData);
    });
  });

  describe("Changing both email and password via rekey", () => {
    const newEmail = "new@email.tld";

    it("should allow login with new email and new password after rekeying both", async () => {
      // Arrange
      const session = await authenticationFlow.login(
        registrationInfo.emailAddress,
        originalPassword,
        registrationInfo.secretKey,
      );

      // Act
      await session.changeCredentials(newEmail, newPassword);

      // Assert
      const newSession = await authenticationFlow.login(
        newEmail,
        newPassword,
        registrationInfo.secretKey,
      );
      expect(newSession.vaults.length).toBe(1);
      expect(newSession.secretKey.accountId).toBe(
        registrationInfo.secretKey.accountId,
      );
    });

    it("should fail to login with old email and new password after rekeying both", async () => {
      // Arrange
      const session = await authenticationFlow.login(
        registrationInfo.emailAddress,
        originalPassword,
        registrationInfo.secretKey,
      );

      // Act
      await session.changeCredentials(newEmail, newPassword);

      // Assert
      await expectAsync(
        authenticationFlow.login(
          registrationInfo.emailAddress,
          newPassword,
          registrationInfo.secretKey,
        ),
      ).toBeRejected();
    });

    it("should fail to login with new email and old password after rekeying both", async () => {
      // Arrange
      const session = await authenticationFlow.login(
        registrationInfo.emailAddress,
        originalPassword,
        registrationInfo.secretKey,
      );

      // Act
      await session.changeCredentials(newEmail, newPassword);

      // Assert
      await expectAsync(
        authenticationFlow.login(
          newEmail,
          originalPassword,
          registrationInfo.secretKey,
        ),
      ).toBeRejected();
    });
  });

  describe("Changing secret key via rekey", () => {
    it("should allow login with rotated secret key", async () => {
      // Arrange
      const session = await authenticationFlow.login(
        registrationInfo.emailAddress,
        originalPassword,
        registrationInfo.secretKey,
      );

      // Act
      const newSession = await session.rotateSecretKey();

      // Assert
      const verifySession = await authenticationFlow.login(
        registrationInfo.emailAddress,
        originalPassword,
        newSession.secretKey,
      );

      expect(verifySession).toBeDefined();
      expect(verifySession.vaults.length).toBe(1);
    });

    it("should maintain vault access after secret key rotation", async () => {
      // Arrange
      const session = await authenticationFlow.login(
        registrationInfo.emailAddress,
        originalPassword,
        registrationInfo.secretKey,
      );

      const vault = session.getPersonalVault()!;
      const testData = new Uint8Array([1, 2, 3, 4, 5]);

      await vault.writeItem("test-item", testData);

      // Act
      const newSession = await session.rotateSecretKey();

      // Assert
      const verifySession = await authenticationFlow.login(
        registrationInfo.emailAddress,
        originalPassword,
        newSession.secretKey,
      );

      const newVault = verifySession.getPersonalVault()!;
      const retrievedItem = await newVault.readItem("test-item");

      expect(retrievedItem).toBeDefined();
      expect(new Uint8Array(retrievedItem.data)).toEqual(testData);
    });

    it("should fail to login with old secret key after rotation", async () => {
      // Arrange
      const session = await authenticationFlow.login(
        registrationInfo.emailAddress,
        originalPassword,
        registrationInfo.secretKey,
      );

      // Act
      await session.rotateSecretKey();

      // Assert
      await expectAsync(
        authenticationFlow.login(
          registrationInfo.emailAddress,
          originalPassword,
          registrationInfo.secretKey,
        ),
      ).toBeRejected();
    });

    it("should allow changing all credentials including secret key", async () => {
      // Arrange
      const newEmail = "new@email.tld";
      const newPassword = "NewSecurePassword123!";

      const session = await authenticationFlow.login(
        registrationInfo.emailAddress,
        originalPassword,
        registrationInfo.secretKey,
      );

      // Act - rotate secret key first, then change email/password
      const sessionAfterRotation = await session.rotateSecretKey();
      await sessionAfterRotation.changeCredentials(newEmail, newPassword);

      // Assert
      const newSession = await authenticationFlow.login(
        newEmail,
        newPassword,
        sessionAfterRotation.secretKey,
      );

      expect(newSession).toBeDefined();
      expect(newSession.vaults.length).toBe(1);

      // Old credentials should not work
      await expectAsync(
        authenticationFlow.login(
          registrationInfo.emailAddress,
          originalPassword,
          registrationInfo.secretKey,
        ),
      ).toBeRejected();
    });
  });
});
