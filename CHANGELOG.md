# [3.1.0](https://github.com/edeckers/lib1password-unofficial/compare/v3.0.0...v3.1.0) (2026-09-26)


### Features

* name stringToBytes after what it returns ([5b20459](https://github.com/edeckers/lib1password-unofficial/commit/5b204595e67db1392282e69b9821c2c31ca139cd))

# [3.0.0](https://github.com/edeckers/lib1password-unofficial/compare/v2.1.0...v3.0.0) (2026-09-25)


### Bug Fixes

* unlock group keysets, which 1Password seals to their parent's public key ([3338d58](https://github.com/edeckers/lib1password-unofficial/commit/3338d5819118659ac624b2c78c7c686c57591685))


### BREAKING CHANGES

* KeysetResponse.encSymKey may be sealed with RSA-OAEP and then has no iv, alg, p2c or p2s, so code reading those fields must check which kind it has first. Vault items open only when their kid names the vault key, and Keyset.sym.kid is the keyset's own uuid instead of the id of the key that sealed it.

# [2.1.0](https://github.com/edeckers/lib1password-unofficial/compare/v2.0.0...v2.1.0) (2026-09-25)


### Bug Fixes

* **deps:** bump all dependencies ([c86ee97](https://github.com/edeckers/lib1password-unofficial/commit/c86ee979dfc52e29baf569f4ff45cce690f821c9))
* export SrpxAuthenticator referenced in the README ([3e9eaa1](https://github.com/edeckers/lib1password-unofficial/commit/3e9eaa13384b7aa8627bd769c94813394f150653))


### Features

* move example implementations to a separate examples entry point ([9630fba](https://github.com/edeckers/lib1password-unofficial/commit/9630fbae7d63a34babe4e3cf652b5637faf44c8c))

# [2.0.0](https://github.com/edeckers/lib1password-unofficial/compare/v1.2.1...v2.0.0) (2026-09-25)


### Bug Fixes

* normalize passwords with NFKD and write binary values as base64url ([#13](https://github.com/edeckers/lib1password-unofficial/issues/13)) ([8cb9616](https://github.com/edeckers/lib1password-unofficial/commit/8cb9616a0010b510684cbfdf71178e3114e74a1f))


### BREAKING CHANGES

* passwords are now NFKD-normalized before key derivation. A password containing characters that NFKD rewrites, such as a precomposed é or a ligature like ﬁ, derives a different key than before, so accounts created with one on an earlier version no longer unlock. ASCII passwords are unaffected.

## [1.2.1](https://github.com/edeckers/lib1password-unofficial/compare/v1.2.0...v1.2.1) (2026-03-28)


### Bug Fixes

* **deps:** bump all dependencies ([#12](https://github.com/edeckers/lib1password-unofficial/issues/12)) ([43d491c](https://github.com/edeckers/lib1password-unofficial/commit/43d491c606c913a0a27e31aa1ff7b508c569d87a))

# [1.2.0](https://github.com/edeckers/lib1password-unofficial/compare/v1.1.6...v1.2.0) (2026-02-28)


### Bug Fixes

* deprecate Session.secretKey ([#11](https://github.com/edeckers/lib1password-unofficial/issues/11)) ([33424a5](https://github.com/edeckers/lib1password-unofficial/commit/33424a580ff7da45bde193f7b701599a9f632bfa))
* **deps:** bump npm dependencies to latest major pin ([#9](https://github.com/edeckers/lib1password-unofficial/issues/9)) ([1df7de0](https://github.com/edeckers/lib1password-unofficial/commit/1df7de0ab377610243a7172e8478cc6682d13591))


### Features

* support rotation of secret key and credentials ([#8](https://github.com/edeckers/lib1password-unofficial/issues/8)) ([778dc3b](https://github.com/edeckers/lib1password-unofficial/commit/778dc3b367cfa3fe77a9a5fa8bc7be612fda15d4))

## [1.1.6](https://github.com/edeckers/lib1password-unofficial/compare/v1.1.5...v1.1.6) (2025-10-24)


### Bug Fixes

* mark AuthenticationFlow fields private ([#6](https://github.com/edeckers/lib1password-unofficial/issues/6)) ([ea5293b](https://github.com/edeckers/lib1password-unofficial/commit/ea5293b32ebcc38c9540232afc5da4cbbdf04e65))

## [1.1.5](https://github.com/edeckers/lib1password-unofficial/compare/v1.1.4...v1.1.5) (2025-10-24)


### Bug Fixes

* disconnect session creation from auth flow ([#5](https://github.com/edeckers/lib1password-unofficial/issues/5)) ([10f7e00](https://github.com/edeckers/lib1password-unofficial/commit/10f7e00dd8addb96777a6a16d384a66e46b5157d))

## [1.1.4](https://github.com/edeckers/lib1password-unofficial/compare/v1.1.3...v1.1.4) (2025-10-24)


### Bug Fixes

* leaky abstraction of ProfileAuth ([#4](https://github.com/edeckers/lib1password-unofficial/issues/4)) ([5789df5](https://github.com/edeckers/lib1password-unofficial/commit/5789df558b78198e4330052dbecc274a2e1ad5a4))

## [1.1.3](https://github.com/edeckers/lib1password-unofficial/compare/v1.1.2...v1.1.3) (2025-10-24)


### Bug Fixes

* vault.readAllItems error bc missing bind ([#3](https://github.com/edeckers/lib1password-unofficial/issues/3)) ([14ac5dd](https://github.com/edeckers/lib1password-unofficial/commit/14ac5dd9f66d5aa941a278c289cdc0d957663a25))

## [1.1.2](https://github.com/edeckers/lib1password-unofficial/compare/v1.1.1...v1.1.2) (2025-10-24)


### Bug Fixes

* mov aukSalt from RegistrationInfo to AccountCreator ([#2](https://github.com/edeckers/lib1password-unofficial/issues/2)) ([3c2122f](https://github.com/edeckers/lib1password-unofficial/commit/3c2122ffd3063dd6944ea589d0855f472635a63f))

## [1.1.1](https://github.com/edeckers/lib1password-unofficial/compare/v1.1.0...v1.1.1) (2025-10-09)


### Bug Fixes

* add 1Password compatibility test scenario ([#1](https://github.com/edeckers/lib1password-unofficial/issues/1)) ([d22ca8e](https://github.com/edeckers/lib1password-unofficial/commit/d22ca8e6e969961a0e2db71305cc8fcd41c1ba54))

# [1.1.0](https://github.com/edeckers/lib1password-unofficial/compare/v1.0.1...v1.1.0) (2025-10-08)


### Features

* support registration and full round trip ([91a97c5](https://github.com/edeckers/lib1password-unofficial/commit/91a97c56666695b36a3373c76503f7f8c575c013))
