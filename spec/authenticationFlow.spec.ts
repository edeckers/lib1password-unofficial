import { AccountCreator } from "../src/lib/Account/AccountCreator";
import { RegistrationInfo } from "../src/lib/Account/RegistrationInfo";
import { InMemoryAccountRepository } from "../src/lib/Example/InMemoryAccountRepository";
import { InMemoryVaultRepository } from "../src/lib/Example/InMemoryVaultRepository";
import { base64decode, base64encode } from "../src/lib/Encoding";
import { AuthenticationFlow } from "~/lib/AuthenticationFlow";
import { AccountUnlockKey } from "~/lib/Account/AccountUnlockKey";
import { Authenticator } from "~/lib/Authentication/Authenticator";
import { exportCryptoKeyAsJwk, generateSalt } from "~/lib/Encryption";
import { KEY_DERIVATION_NUMBER_OF_ITERATIONS } from "~/Consts";

// This spec is more of a demonstration of how authentication can be
// implemented using the library, rather than a strict unit test. For
// it doesn't really test anything.
// 
// Loosely based on the example SrpxAuthenticator included in the
// Example folder.
interface ProfileAuth {
  salt: string;
  alg: string;
  iterations: number;
  method: string;
}

class DummyAuthenticator implements Authenticator {
  private readonly profileAuthStore: { [key: string]: ProfileAuth } = {};

  async login(
    accountId: string,
    accountUnlockKey: AccountUnlockKey,
  ): Promise<void> {
    const profileAuth = this.profileAuthStore[accountId]
    if (!profileAuth) {
      throw new Error(`No profile auth stored for account ${accountId}`);
    }

    console.log("DummyAuthenticator login called", { accountId, profileAuth });
    console.log(
      "We can generate an auth key here from the stored profile auth " +
      "(salt, alg, iterations) and the AUK.");

    console.log("Send authentication request to server with derived key");
    const derivedKey = await accountUnlockKey.derive(
      profileAuth.iterations,
      base64decode(profileAuth.salt),
    );
    const jwk = await exportCryptoKeyAsJwk(derivedKey);
    console.log("Derived key as JWK:", jwk);

    console.log("Assume authentication is successful, we'd throw if not");
  }

  public async storeProfileAuth(accountId: string, profileAuth: ProfileAuth): Promise<void> {
    this.profileAuthStore[accountId] = profileAuth;
  }

  public createProfileAuth(): ProfileAuth {
    return ({
      salt: base64encode(generateSalt()),
      iterations: KEY_DERIVATION_NUMBER_OF_ITERATIONS,
      alg: "PBES2g-HS256",
      method: "SRPX",
    })
  }
}

class Fixtures {
  public static accounts = () => new InMemoryAccountRepository()
  public static vaults = () => new InMemoryVaultRepository()
  public static registrationInfo = () => RegistrationInfo.create('my@email.tld', 'password123')
  public static authenticator = () => new DummyAuthenticator();
}

describe("Authentication flow", () => {
  let registrationInfo: RegistrationInfo
  let accounts: InMemoryAccountRepository;
  let vaults: InMemoryVaultRepository;

  let accountCreator: AccountCreator;

  let authenticationFlow: AuthenticationFlow;
  let authenticator: DummyAuthenticator;


  beforeEach(async () => {
    registrationInfo = await Fixtures.registrationInfo();
    accounts = Fixtures.accounts();
    vaults = Fixtures.vaults();
    authenticator = Fixtures.authenticator();

    accountCreator = new AccountCreator(
      accounts,
      accounts,
      vaults
    );

    authenticationFlow = new AuthenticationFlow(
      authenticator,
      accounts,
      accounts,
      vaults
    );
  });

  describe("Needs an authenticator that offloads user authentication from the library", () => {

    it("to succeed", async () => {
      // Arrange
      authenticator.storeProfileAuth(
        registrationInfo.secretKey.accountId,
        authenticator.createProfileAuth(),
      );
      await accountCreator.create(
        registrationInfo
      );

      // Act
      const session = await authenticationFlow.login(
        registrationInfo.emailAddress,
        "password123",
        registrationInfo.secretKey
      );

      // Assert
      expect(session.vaults.length).toBe(1);
    });

    it("or otherwise it fails", async () => {
      // Arrange

      // We forget to store profile auth
      // authenticator.storeProfileAuth(
      //   registrationInfo.secretKey.accountId,
      //   authenticator.createProfileAuth(),
      // );

      await accountCreator.create(
        registrationInfo
      );

      // Act
      const test0 = expectAsync(authenticationFlow.login(
        registrationInfo.emailAddress,
        "password123",
        registrationInfo.secretKey
      ))

      // Assert
      await test0.toBeRejectedWithError();

    });

  });

});