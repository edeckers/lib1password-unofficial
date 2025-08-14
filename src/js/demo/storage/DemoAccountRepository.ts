import { InMemoryAccountRepository } from '@edeckers/lib1password-unofficial';
import type {
  KeysetRepository,
  KeysetResponse,
  Profile,
  ProfileRepository,
} from '@edeckers/lib1password-unofficial';

export class DemoAccountRepository
  implements ProfileRepository, KeysetRepository
{
  private readonly profileStorage: { [key: string]: Profile } = {};
  private readonly keysetStorage: { [key: string]: KeysetResponse } = {};

  private readonly accounts: ProfileRepository & KeysetRepository;

  constructor() {
    this.accounts = new InMemoryAccountRepository(
      this.keysetStorage,
      this.profileStorage,
    );
  }

  public readKeysetsRaw = (): Promise<KeysetResponse[]> =>
    this.accounts.readKeysetsRaw();

  public upsertKeyset = (keyset: KeysetResponse): Promise<void> =>
    this.accounts.upsertKeyset(keyset);
  public getProfile = (
    secretKeyId: string,
    secretKeyFormat: string,
    emailAddress: string,
  ): Promise<Profile> =>
    this.accounts.getProfile(secretKeyId, secretKeyFormat, emailAddress);
  public storeProfile = (
    secretKeyId: string,
    secretKeyFormat: string,
    emailAddress: string,
  ): Promise<void> =>
    this.accounts.storeProfile(secretKeyId, secretKeyFormat, emailAddress);

  public clear = (): void => {
    for (const k in this.profileStorage) {
      delete this.profileStorage[k];
    }
    for (const k in this.keysetStorage) {
      delete this.keysetStorage[k];
    }
  };
}
