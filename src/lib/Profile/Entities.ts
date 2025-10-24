export type ProfileStatus = "ok" | "error";

export interface Profile {
  accountKeyUuid: string;
  accountKeyFormat: string;
}

export type ProfileResponse = Profile & { status: ProfileStatus };
