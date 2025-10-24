import { Profile } from "~/lib/Profile/Entities";

const accountKeyFormat = "A3";

export const createProfile = (accountKeyUuid: string): Profile => ({
  accountKeyUuid,
  accountKeyFormat,
});

export interface ProfileRepository {
  getProfile: (
    secretKeyId: string,
    secretKeyFormat: string,
    emailAddress: string,
  ) => Promise<Profile>;
  storeProfile: (
    secretKeyId: string,
    secretKeyFormat: string,
    emailAddress: string,
  ) => Promise<void>;
}
