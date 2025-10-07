import { KEY_DERIVATION_NUMBER_OF_ITERATIONS } from "~/Consts";
import { Profile, ProfileAuth } from "~/lib/Profile/Entities";
import { base64encode } from "~/lib/Encoding";

const accountKeyFormat = "A3";
const alg = "PBES2g-HS256";
const iterations = KEY_DERIVATION_NUMBER_OF_ITERATIONS;
const method = "SRPg-4096";

export const createProfileAuth = (
  saltBytes: Uint8Array<ArrayBuffer>,
): ProfileAuth => ({
  salt: base64encode(saltBytes),
  alg,
  iterations,
  method,
});

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
