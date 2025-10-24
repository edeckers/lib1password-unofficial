import { RegistrationInfo } from "~/lib/Account/RegistrationInfo"
import { InMemoryAccountRepository } from "~/lib/Example/InMemoryAccountRepository"
import { InMemoryVaultRepository } from "~/lib/Example/InMemoryVaultRepository"

export class Fixtures {
    public static accounts = () => new InMemoryAccountRepository()
    public static vaults = () => new InMemoryVaultRepository()
    public static registrationInfo = () => RegistrationInfo.create('my@email.tld', 'password123')
}

