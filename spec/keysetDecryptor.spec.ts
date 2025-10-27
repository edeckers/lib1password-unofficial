import { RegistrationInfo } from "~/lib/Account/RegistrationInfo";
import { generateSalt } from "~/lib/Encryption";
import { EncryptedKeyset } from "~/lib/Keysets/EncryptedKeyset";
import { KeysetDecryptor } from "~/lib/Keysets/KeysetDecryptor";

describe("KeysetDecryptor", () => {
  describe("Which are decrypted", () => {
    it("can have an item added", async () => {
      // Arrange
      const mpSalt = generateSalt();

      const { auk } = await RegistrationInfo.create("a@b.com", "password");


      const mpKey = await auk.derive(
        650_000,
        mpSalt,
      );

      const mpKeyset = await EncryptedKeyset.create("mp", mpKey, mpSalt);

      const a = await mpKeyset.decrypt(mpKey);


      const anotherSalt = generateSalt();
      const anotherKeyset = await EncryptedKeyset.create(
        mpKeyset.keyset.uuid,
        a.sym.k,
        anotherSalt
      );

      // Act
      const decryptor = await KeysetDecryptor.unlock(
        auk,
        [mpKeyset.keyset, anotherKeyset.keyset],
      );

      // Assert

      console.log(decryptor.contains(mpKeyset.keyset.uuid), decryptor);
    });
  });
});