import { ProfileRepository } from "~/lib/Profile/ProfileRepository";
import { KeysetResponse } from "~/lib/Keysets/Entities";

export interface KeysetRepository {
  readKeysetsRaw: () => Promise<KeysetResponse[]>;
  upsertKeyset: (keyset: KeysetResponse) => Promise<void>;
}

export interface AccountRepository
  extends ProfileRepository,
    KeysetRepository {}
