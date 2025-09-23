import * as crypto from "crypto";

export class EncryptionManager {
  private static readonly ALGORITHM = "aes-256-gcm";
  private static readonly KEY_LENGTH = 32; // 256 bits
  private static readonly IV_LENGTH = 16; // 128 bits
  private static readonly SALT_LENGTH = 32;
  private static readonly TAG_LENGTH = 16;
  private static readonly PBKDF2_ITERATIONS = 100000;

  /**
   * Derives a key from password using PBKDF2
   */
  private static deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(
      password,
      salt,
      this.PBKDF2_ITERATIONS,
      this.KEY_LENGTH,
      "sha256"
    );
  }

  /**
   * Encrypts data with password
   */
  static encrypt(data: string, password: string): string {
    try {
      // Generate random salt and IV
      const salt = crypto.randomBytes(this.SALT_LENGTH);
      const iv = crypto.randomBytes(this.IV_LENGTH);

      // Derive key from password
      const key = this.deriveKey(password, salt);

      // Create cipher
      const cipher = crypto.createCipher(this.ALGORITHM, key);
      cipher.setAAD(salt); // Use salt as additional authenticated data

      // Encrypt data
      let encrypted = cipher.update(data, "utf8", "hex");
      encrypted += cipher.final("hex");

      // Get authentication tag
      const tag = cipher.getAuthTag();

      // Combine salt + iv + tag + encrypted data
      const combined = Buffer.concat([
        salt,
        iv,
        tag,
        Buffer.from(encrypted, "hex"),
      ]);

      return combined.toString("base64");
    } catch (error) {
      console.error("Encryption error:", error);
      throw new Error("Failed to encrypt data");
    }
  }

  /**
   * Decrypts data with password
   */
  static decrypt(encryptedData: string, password: string): string {
    try {
      // Parse combined data
      const combined = Buffer.from(encryptedData, "base64");

      // Extract components
      const salt = combined.subarray(0, this.SALT_LENGTH);
      const iv = combined.subarray(
        this.SALT_LENGTH,
        this.SALT_LENGTH + this.IV_LENGTH
      );
      const tag = combined.subarray(
        this.SALT_LENGTH + this.IV_LENGTH,
        this.SALT_LENGTH + this.IV_LENGTH + this.TAG_LENGTH
      );
      const encrypted = combined.subarray(
        this.SALT_LENGTH + this.IV_LENGTH + this.TAG_LENGTH
      );

      // Derive key from password
      const key = this.deriveKey(password, salt);

      // Create decipher
      const decipher = crypto.createDecipher(this.ALGORITHM, key);
      decipher.setAAD(salt);
      decipher.setAuthTag(tag);

      // Decrypt data
      let decrypted = decipher.update(encrypted, undefined, "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      console.error("Decryption error:", error);
      throw new Error("Failed to decrypt data - wrong password?");
    }
  }

  /**
   * Creates a verification token that can be used to check if password is correct
   */
  static createVerificationToken(password: string): string {
    const verificationText = "DASHBOARD_AUTH_CHECK";
    return this.encrypt(verificationText, password);
  }

  /**
   * Verifies if password is correct by decrypting the verification token
   */
  static verifyPassword(verificationToken: string, password: string): boolean {
    try {
      const decrypted = this.decrypt(verificationToken, password);
      return decrypted === "DASHBOARD_AUTH_CHECK";
    } catch {
      return false;
    }
  }
}
