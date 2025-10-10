# lib1password-unofficial

[![License: MPL 2.0](https://img.shields.io/badge/License-MPL%202.0-brightgreen.svg)](https://opensource.org/licenses/MPL-2.0)
[![Build](https://github.com/edeckers/lib1password-unofficial/actions/workflows/deploy.yml/badge.svg?branch=develop)](https://github.com/edeckers/lib1password-unofficial/actions/workflows/deploy.yml)

This repository contains an educational TypeScript implementation of 1Password's cryptographic security model, including an interactive explainer that is available at [https://passwords.lgtm.it](https://passwords.lgtm.it)

> ⚠️ While the 1Password Team greenlit publication of this library and the accompanying demo, neither is an official product developed or maintained by AgileBits, Inc.

The interactive explainer aims to clarify how 1Password protects your data by exploring a working implementation of:

1. Secret Key generation and validation
1. PBKDF2 key derivation
1. AES-256-GCM vault encryption
1. Master/Account keyset architecture

---

- **Blogpost:** https://medium.com/@edeckers/stopping-bad-actors-inside-1passwords-security-model-8c65c6acb9ff
- **Explainer source:** https://github.com/edeckers/lib1password-unofficial/tree/gh-pages

## Disclaimers

This is an **educational project** created to understand how password managers and 1Password in particular work under the hood.

**NOT for production use:**

- Built by someone who is not a security expert or cryptographer
- Not affiliated with 1Password
- Not audited or reviewed by security professionals
- May contain implementation errors or vulnerabilities

## Rationale

For years, I've used password managers, which got me curious about how they work under the hood. And to me the best way to truly understand something is to actually build it. So I created this library to:

1. Understand the model: how do Secret Keys, Keysets and Vaults work together?
1. Share knowledge: an interactive demo helps others learn too

## Features

- Accurate implementation of 1Password's documented security model: you could copy your actual encrypted vault items from 1Password and decrypt them using your credentials and this library (don't do this, obviously)
- Interactive demo showing each step from account creations, to encryption and decryption

## Installation

```bash
npm install @edeckers/lib1password-unofficial
```

## Quick Start

### PHASE 0: Preparation

```ts
// Library is storage-agnostic, so user profiles, keysets,
// and vaults can live anywhere, and storage is abstracted
// using repositories
const keysets = new InMemoryKeysetRepository();
const profiles = new InMemoryProfileRepository();
const vaults = new InMemoryVaultRepository();

// Library is not concerned with authentication, so you can use
// an authentication backend of your choosing by implementing the
// Authenticator interface, e.g. authentication through SRP, which
// is what 1Password uses.
const authenticator = new SrpxAuthenticator();
```

### PHASE 1: Create and store an account

```ts
const accountCreator = new AccountCreator(keysets, profiles, vaults);

// Generate a secret key and store it in a RegistrationInfo-object
// together with the provided email address
const registrationInfo = await RegistrationInfo.create(
  "user@example.com",
  "super-secret-password",
);

// The previous step generates the secret key, which
// should never leave the device it was generated
// on, and be stored securely by the user. We'll
// use it to unlock our vault in PHASE 2
const { secretKey } = registrationInfo;

// Generate a master keyset and an empty personal vault, encrypted
// with your Account User Token (AUK, combination of
// password + secret key). Store this encrypted data in the provided
// repositories
await accountCreator.create(registrationInfo);
```

### PHASE 2: Retrieve and unlock an account

```ts
// The AuthenticationFlow is a convenience class that
// runs you through every step, from authentication to
// unlocking your vaults in a single call
const auth = new AuthenticationFlow(authenticator, keysets, profiles, vaults);

// A successful login returns a Session object, which
// contains a SecretKey and a list of Vault-objects. Each
// of the Vault objects represents an unlocked Vault
// which allows you to directly list, decrypt and modify
// every item it contains
const session = await auth.login(
  "user@example.com",
  "super-secret-password",
  secretKey,
);
```

### PHASE 3: List and decrypt items

```ts
// Take any vault from session.vaults, or use the
// convenience method session.getPersonalVault() to
// retrieve your primary Vault
const vault = session.getPersonalVault();

// Decrypt all vault items, and return them as a list
const items = await vault.readAllItems();

// Each item has an id (string) and encrypted
// data (ArrayBuffer). Use .serialize() to get
// the plaintext string
console.log(
  items.map((i) => ({
    id: i.id,
    data: i.serialize(), // ArrayBuffer -> string
  })),
);
```

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## Code of Conduct

This project follows the [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to abide by its terms.

## Security issues

The security policy of this project is described in [SECURITY.md](SECURITY.md)

## Acknowledgments

- **1Password** for building an awesome product and publicly documenting their security model in [their excellent white paper](https://1passwordstatic.com/files/security/1password-white-paper.pdf)
- **David Schuetz** [whose blog series on the 1Password model](https://darthnull.org/inside-1password/) popped up a little late on my radar in my own learning process, but their examples definitely filled some missing pieces

## License

[MPL-2.0](LICENSE)
