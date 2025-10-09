import { SecretKey } from "~/lib/Account/SecretKey";

describe("The secret key", () => {
  describe("always", () => {
    it("is 34 characters long when dashes are removed", () => {
      // Arrange
      const secretKey = SecretKey.generate()

      // Act
      const key = secretKey.fullWithDashes.replace(/-/g, "")

      // Assert
      expect(key.length).toBe(34)
    });

    it("has a secret consisting of 26 alphanumeric uppercase characters", () => {
      // Arrange
      const secretKey = SecretKey.generate()

      // Act
      const key = secretKey.secret

      // Assert
      expect(key.length).toBe(26)
      expect(/^[A-Z0-9]+$/.test(key)).toBeTrue()
    });

    it("starts with a version number", () => {
      // Arrange
      const secretKey = SecretKey.generate()

      // Act
      const key = secretKey.fullWithDashes

      // Assert

      // Currently version number is always A3, so lets test for that here,
      // even though it might change in future
      expect(key.startsWith("A3")).toBeTrue()
      expect(key.substring(0, 2)).toBe(secretKey.version)
    });

    it("contains a 6 digit identifier", () => {
      // Arrange
      const secretKey = SecretKey.generate()

      // Act
      const [_, id, ..._rest] = secretKey.fullWithDashes.split("-")

      // Assert
      expect(id.length).toBe(6)
      expect(id).toBe(secretKey.accountId)
    });

    it("has a secret consisting of 1 chunk of 6 characters followed by 4 of 5 characters", () => {
      // Arrange
      const secretKey = SecretKey.generate()

      // Act
      const [_version, _id, head, ...chunks] = secretKey.fullWithDashes.split("-")

      // Assert
      expect(head.length).toBe(6)
      expect(chunks.length).toBe(4)

      chunks.forEach(c => expect(c.length).toBe(5))
    })
  });

  describe("has a method to be", () => {
    it("obfuscated", async () => {
      // Arrange
      const secretKey = SecretKey.generate()

      // Act
      const obfuscated = await secretKey.obfuscate()

      // Assert
      expect(JSON.stringify(obfuscated).indexOf(secretKey.fullWithDashes) === -1).toBeTruthy()
      expect(JSON.stringify(obfuscated).indexOf(secretKey.fullWithDashes.replace("-", "")) === -1).toBeTruthy()
      expect(obfuscated.kid).toBe("obf-v1")
    })

    it("de-obfuscated", async () => {
      // Arrange
      const secretKey = SecretKey.generate()
      const obfuscated = await secretKey.obfuscate()

      // Act
      const deobfuscated = await SecretKey.fromObfuscated(obfuscated)

      // Assert
      expect(deobfuscated.fullWithDashes).toBe(secretKey.fullWithDashes)
    })
  });
});