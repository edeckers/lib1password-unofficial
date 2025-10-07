export type ProfileStatus = "ok" | "error";

export interface ProfileAuth {
  salt: string;
  alg: string;
  iterations: number;
  method: string;
}

export interface Profile {
  accountKeyUuid: string;
  accountKeyFormat: string;
}

export type ProfileResponse = Profile & { status: ProfileStatus };
