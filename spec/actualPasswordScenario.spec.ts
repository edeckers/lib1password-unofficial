import { arrayBufferToString } from "~/lib/Encoding";
import { AccountUnlockKey } from "~/lib/Account/AccountUnlockKey";
import { SecretKey } from "~/lib/Account/SecretKey";
import { KeysetDecryptor } from "~/lib/Keysets/KeysetDecryptor";
import { decryptSymmetric, importCryptoKeyFromJwk } from "~/lib/Encryption";

describe("Given an actual encrypted 1Password keyset, and a list of vaults", () => {
  describe("we can leverage lib1password-unofficial", () => {
    it("to decrypt them using AUK", async () => {
      // All data below was retrieved from an actual 1Password account (don't bother trying
      // to access it, I've since closed this account that never contained anything useful, since
      // I only created it for this test), using Burp Suite and the 1Password Session Analyzer
      // plugin (https://github.com/1Password/burp-1password-session-analyzer) because data in
      // transit is encrypted with a Session Key on top of TLS-encryption.

      // Actual retrieval of the Session Key is an exercise left for the reader: see the
      // README.md of the mentioned plugin for the reason why, and a tip on how to retrieve it.

      // Arrange
      const secretKey = SecretKey.fromReadableString("A3-9XQLKE-4Q7EQ6-C3CJR-RD25C-RGMWZ-7KG3S")

      const accountUnlockKey = await AccountUnlockKey.create(
        "ohhimark@branie.it",
        "mkh6mru4hdk5udt@MQV",
        secretKey
      );

      // The actual HTTP response for the keysets endpoint contains JSON with format
      // { "keysets": [ ... ] }, but the library expects the raw list, so we're simply
      // ditching the "keysets" wrapper here. Reason: the wrapper is a presentation choice,
      // not something that concerns the library.

      // GET /api/v2/account/keysets
      const keyset =
        [{
          uuid: "rv4ge63poeyompbhty2efk5xxi",
          encryptedBy: "mp",
          sn: 1,
          encSymKey: {
            alg: "PBES2g-HS256",
            cty: "b5+jwk+json",
            data: "xKj4pR0Ws-FyikpQGSxGk-8hlulkLXFfT0zR4rk8SQ4t5GrYG__Oo_ddN21b6iJueoCHLiXojdnBSZagTs7ER2iw5QOlXP4R2uHEUHf0odSDnz0Cs280l1W4dhwxrB1A54siE_ZHl6h6x2tGc9mVLPAuaEoQcFH8Ddg3iOesmyj3XLLuDolFhH-88PXZvDCRxPEBSiGFBeaULk6B5_EN-8bCGD4Fci6PqkI-S0k",
            enc: "A256GCM",
            iv: "9R5ZTx1dXSCthu_1",
            kid: "mp",
            p2c: 650_000,
            p2s: "HRKn9UOTdCepKu6EZbfJfw"
          },
          encPriKey: {
            cty: "b5+jwk+json",
            data: "UN1mx3kJh_Qeqdyt-7JvqPOGvFoqih3o5aC9jcqfOdkawdi1EAAYXdLoH1gOrlwlO7CnBckVpur3Rofb5TuoWj6E2eURqPuxGQ1gvJ39MeB1Xib6nnw9Jpk7SeBj832fJm_WT-7SHHgtE2XnAnoLJbQzcvqPFvj4Plg-XdaAMdIdMrj_xTaOsYLTFGw2a91sE48RhJXk5wxitk3Zb3oCnxh6z7BbMB8CW7N8P-oTAU4d18gJoNR7JQ6fQ-_L0ilGzslg8p2JT5Q-HKr0xQgvmyi3DPPdop2m_uiaMILipHkjLvw9HauPw-pCk0qn4S5Y2FPRKDBLg734grA-jxQ-ER25zM7JwoPvqYm7Fi08dOh1lci1yvxWNL1Tdq7AZUg5TI2CkganqtdcVEi0Eg23vX1rKsU_XnnLmwBiXKk1UWhyHIKhPY6WVq0Xg2DDQXKVht4r0T0Nn2MeQDjFbDAmxK23tZhqyGg3_gskKKH6QZ_x1HrTpTCvnl-1m9iM_OICkyPwukKXGJH-IyGD0o1ppnqQdHf3t5uPR9ar2tPem2QthvhdkfYPDwTxdeXMYDhsPldjifpBD3JEp3rxiHdbzHvdfGsRXDJuZd03zSytu1XhN30qOngnuzjNCfBqb5W3iCdD_NZk4bv-QB9wm0QFus3N9bU8eJKWB33roIqqwjkwaOmdGj8B_vPrQsAO2NYxcb-DSse2DfM8MO45eWvJcB8wYIhax3mN0XKoLMu4A2V2wjIFQ4KrcQm5huyjx7eBpcIsmeoQbef7B_MFIByhsPoyygRK_XMyHAeuSTVpA0s8BMmIYqwyaovnkerXUh1tliIoAwCwnxlBxPK1RlVVX2fEr6N4sf0cERgyjx91GvaXJaMBqQJAJzH2YKn9944qItXI8vgPCA_6nt-zSkb1ThVkzKvpprLE63YpmU9fReRahKOjaBFLm-RBR1gf4Pk6EJPK_hZSUxtghGYmOLSN4qOqrNpECsmobFtzPTQzbAUbqKVTd-QO1CfSZB1PyztszuzfcfC5fG38Qv9bEeOcy1R5JDSqNOjkvSezAp-m5mfrCcD8InIAWPcYzbZhXpX79h6t57zEfPlh0ExQNPEIfXEG_nQRfZjzCYyflEVjHosBo0gmI2XbQqjoe9hb5SoH7UpVQOW1hbl3Sm-AypIjO2hALR73xwTs2PqlNBRCVscyL4Z35cvxNBRlsstuNbI7HFdJ_PUbWi1zqeXSAfj2LEG9Y5zKwrcB9WwN7x2fNKgp9ZANWRxD7tONDN8uQ6FgjnFacdHAyVkPo0RcuFUpgkY_SfzntAhSIj7HcPqHJ1k5vplscErmLwlTpBNPUiKKC_53nLLqxG1Yvyvq3aBX4bjxAi7CxV4BUbZzrrF1o5jbM7vPrK3hhSx2CY6mjaoZwOugopx5VFPg_u4XttJFGqfbfJylTkA4RN86yOIlZ5UMhiNbNQ_-r9cS-TEXehV9Y7fqABf97X6YnjmqtszaCL-yQ8KrScr3wTEIlD-Mxu8BEYrHprW9mJckbevLp0RJ9NuCOzstRMRw0s0symlg2Dr1Um-6pFHux28VC4yDmH05xm3qywxlSnCEFM3q0U5qcZH2Dq3YMjvVWBkP_FOqNcydv4tnEQ6qZRZE-NxGqo9JaCuezxJB6JMhe65gg-GYSBRScSyePp1NCYPUF2XuTmN3M2JzwFoj5bsM9smIPmOkoZa60p9vHH_TEfxVSpIIVWkQ-bI7BocMvU1gvD5DnfHHqADBY3fh8poEy3zkcUFi5uPdpCzxnSt00lsRvKWhNf32Zj3FEYQchgsx-pZoKiVbOJllgtls8nZNxcbJV2stZlWEMPqnhwvYA2ZKvTOH5S4dpuwcW-C_ACEqvATKpj29ospKRNoeoIh-cKGy2yiZBOx7uTjBIBIQDVaTR58MN5wSh8_TksLjiCEV79M9gFyWgIyd50w2xknHFUzA3n856nOoM-je-0mKW_lDXrxIJWTfUNbsBcY1bbXwHJ3sxjVE0d2VLArXIpS-dVkYd4udjbzCjseYcBfkQNLfzF9nZPdsCeKNMSpV6YqPV9vA3VTBw20H08mQntohRbwk9raYvrELPo92-v607nk2KW0EHuvT0abt0scOOsrXbN6BrANcjzPz598zcjpmhXHe1bc7vQ41P3LdP8yO5BopadXt8TjfgNwjPMKSgZWTXGj92pr3lV1zHzvUoB7gT08dyLMtismEhzHkTqfdT8G-TbUFoEqrYNLv5r8JvNLYOHPXUrjQkLtHHK0gEcfvOgs5ID6HGg",
            enc: "A256GCM",
            iv: "g6PQw_zRI5tkUhF0",
            kid: "rv4ge63poeyompbhty2efk5xxi"
          },
          pubKey: {
            alg: "RSA-OAEP",
            e: "AQAB",
            ext: true,
            key_ops: ["encrypt"],
            kid: "rv4ge63poeyompbhty2efk5xxi",
            kty: "RSA",
            n: "rwVd9EM4bEwLAI4QWzJhqppD8TgU3KlCdr4TPL0kESoRku334zYZ5b5qPcZjql0JCd8CMkRUlP1tz0iyjbuSS9WIMj_iKhcCrhenSdZlJvrIGpG1T4d-2UtxnEL2LmjebHAh54Rh6kuwyulxvY6cgaFovIVu8CBfbdzT4-1YCRbSAS-tpDYNYNOb3adqUdWeE3pFLFtMvdgp51R9GntpX3OBIODLpjOzTMdDD9K4Dt2lawQFr3-fULGJyqaT4QZE5cre9L_pdbcHXECmwO_-Jsh56WQM04UMX1Z71rRW203tpGjyODeSy5mteiJbmfCKG35c1CtScsic3Shm46jb9Q"
          },

          // Left out a couple of fields, such as encSPriKey and spubKey, which are out of scope

        },

        // Actually a couple more keysets in the real response, but we're only interested
        // in the Master keyset here (encryptedBy: "mp")

      ]

      // GET /api/v1/vault/personal
      const vaults = [{
        uuid: "4dmm5j5k2pp6pt74hrzbat6iu4",
        type: "P",
        createdAt: "2025-10-09T18:37:12Z",
        updatedAt: "2025-10-09T18:37:14Z",
        attrVersion: 1,
        contentVersion: 2,
        itemAttrsVersion: 0,
        encAttrs: {
          cty: "b5+jwk+json",
          data: "wSdxH6ajyJC6wdzcmso5wEsO5BAPFjF_1MTYbX5areipx0Jlu8561saQjrCPTWJW4PSImKXXVn6pISGcwU2rWC45HoXcPqnxBVUJ9z8XJi4FZ4wwBcNjJhrweOC9NzoMiVNZ1EUoCHC2mHsWIbk5N4NcVoIkyR_v",
          enc: "A256GCM",
          iv: "VnyGhL8ZjIjl301R",
          kid: "c4djrbcgr6sobgz4oxnhuj3bxa"
        },
        activeKeyUuid: "c4djrbcgr6sobgz4oxnhuj3bxa",
        activeItemCount: 2,
        clientAccess: 4294967295,
        access: [{
          vaultUuid: "4dmm5j5k2pp6pt74hrzbat6iu4",
          accessorType: "user",
          accessorUuid: "MBW26THYY5A7PHHRST3QBGHTWE",
          acl: 15730674,
          leaseTimeout: 0,
          vaultKeySN: 1,
          encryptedBy: "rv4ge63poeyompbhty2efk5xxi",
          encVaultKey: {
            cty: "b5+jwk+json",
            data: "BDd-oLqjF9mSJI9E4QMObkM3Zr4lyC--NRy4010XLJf7-HssH2iDPKHK2-xa89sk3tzO-KFj97_naDg6FkBuMYQg4oaU99o1UVbX0yU32KB_vJK9P3KKy4VYe5wvJvxnr46ggZyEFEFDx_4211DJ3SZdNE-Bbub7sUVOnAIvOmmobfFhBvZjI_UZKhzYJpu8S0HSEo7G59c92Mvl-y3lPJH7TkVBaJAy1Pbs5_C4_TZOkRegIsU8I3tCoNWtx8wiqu8s8TzoWIVYYTtdYCno69G2cdChPHBjvVqlcw2vR60T5yCklEBy6WRbKLUA8f7Hgd6pGY-Nn3B1Hk2SxSEVJA",
            enc: "RSA-OAEP",
            kid: "rv4ge63poeyompbhty2efk5xxi"
          }
        }]
      }]


      // Act
      const keysetDecryptor = await KeysetDecryptor.unlock(accountUnlockKey, keyset)

      const personalVault = vaults[0]

      const vaultKeyBytes = await keysetDecryptor.decrypt(personalVault.access[0].encVaultKey)

      const vaultKeyJson = JSON.parse(arrayBufferToString(vaultKeyBytes));
      const vaultKey = await importCryptoKeyFromJwk(vaultKeyJson, false);

      const attrsBytes = await decryptSymmetric(vaultKey, personalVault.encAttrs);

      // Assert

      const attrs = JSON.parse(arrayBufferToString(attrsBytes));

      expect(attrs.name).toBe("Personal");
    });

  });
});