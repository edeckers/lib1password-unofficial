import { AccountUnlockKey } from "~/lib/Account/AccountUnlockKey";
import { SecretKey } from "~/lib/Account/SecretKey";
import { base64decode, base64encode } from "~/lib/Encoding";
import { exportCryptoKeyAsJwk } from "~/lib/Encryption";

const secretKey = SecretKey.generate();
const salt = new Uint8Array(32).map((_, i) => i);

const keyFor = async (password: string) => {
  const auk = await AccountUnlockKey.create(
    "my@email.tld",
    password,
    secretKey,
  );
  const derived = await auk.derive(1_000, salt);

  return (await exportCryptoKeyAsJwk(derived)).k;
};

describe("Passwords", () => {
  it("derive the same key whether an accent is composed or decomposed", async () => {
    // Act
    const composed = await keyFor("café-password");
    const decomposed = await keyFor("café-password");

    // Assert
    expect(composed).toBe(decomposed);
  });

  it("derive the same key from a compatibility form and its plain letters", async () => {
    // Act
    const ligature = await keyFor("ﬁve-password");
    const plain = await keyFor("five-password");

    // Assert
    expect(ligature).toBe(plain);
  });

  it("ignore surrounding whitespace", async () => {
    // Act
    const padded = await keyFor("  password123 \t");
    const bare = await keyFor("password123");

    // Assert
    expect(padded).toBe(bare);
  });
});

describe("Binary values", () => {
  it("are written as base64url without padding", () => {
    // Arrange
    const bytes = new Uint8Array(68).map((_, i) => (i * 7 + 251) & 0xff);

    // Act
    const encoded = base64encode(bytes);

    // Assert
    expect(/[+/=]/.test(encoded)).toBeFalse();
    expect(base64decode(encoded)).toEqual(bytes);
  });

  it("are read as base64url with or without padding", () => {
    // Act
    const unpadded = base64decode("-_8");
    const padded = base64decode("-_8=");

    // Assert
    expect(unpadded).toEqual(new Uint8Array([251, 255]));
    expect(padded).toEqual(new Uint8Array([251, 255]));
  });

  it("are also read in the standard base64 alphabet, as earlier versions wrote them", () => {
    // Act
    const standard = base64decode("+/8=");

    // Assert
    expect(standard).toEqual(new Uint8Array([251, 255]));
  });

  describe("in a browser, where atob and btoa do the work", () => {
    beforeEach(() => {
      (globalThis as { window?: unknown }).window = globalThis;
    });

    afterEach(() => {
      delete (globalThis as { window?: unknown }).window;
    });

    it("read 1Password's unpadded base64url", () => {
      // Act
      const decoded = base64decode("HRKn9UOTdCepKu6EZbfJfw");

      // Assert
      expect(decoded.length).toBe(16);
    });

    it("read the standard alphabet with padding", () => {
      // Act
      const decoded = base64decode("+/8=");

      // Assert
      expect(decoded).toEqual(new Uint8Array([251, 255]));
    });

    it("round-trip as base64url", () => {
      // Arrange
      const bytes = new Uint8Array(33).map((_, i) => (i * 37 + 250) & 0xff);

      // Act
      const encoded = base64encode(bytes);

      // Assert
      expect(/[+/=]/.test(encoded)).toBeFalse();
      expect(base64decode(encoded)).toEqual(bytes);
    });
  });
});
