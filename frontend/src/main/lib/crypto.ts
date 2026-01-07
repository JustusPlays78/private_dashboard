import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const SALT_LENGTH = 16
const KEY_LENGTH = 32

// Argon2 parameters (Node.js argon2 requires timeCost >= 2)
const ARGON2_TIME = 2
const ARGON2_MEMORY = 64 * 1024 // 64 MB
const ARGON2_PARALLELISM = 4

let argon2: typeof import('argon2') | null = null

async function getArgon2() {
  if (!argon2) {
    argon2 = await import('argon2')
  }
  return argon2
}

/**
 * Derives a deterministic salt from password using SHA256
 * This ensures consistent key derivation across sessions
 */
export function deriveDeterministicSalt(password: string): Buffer {
  const hash = crypto.createHash('sha256').update(password).digest()
  return hash.subarray(0, SALT_LENGTH)
}

/**
 * Derives an encryption key from a password using Argon2id
 * Uses deterministic salt for consistent key derivation
 */
export async function deriveKey(password: string, salt?: Buffer): Promise<{ key: Buffer; salt: Buffer }> {
  const arg2 = await getArgon2()
  
  // Use deterministic salt for consistent key derivation
  if (!salt) {
    salt = deriveDeterministicSalt(password)
  }

  const key = await arg2.hash(password, {
    type: arg2.argon2id,
    timeCost: ARGON2_TIME,
    memoryCost: ARGON2_MEMORY,
    parallelism: ARGON2_PARALLELISM,
    hashLength: KEY_LENGTH,
    salt: salt,
    raw: true
  })

  return { key, salt }
}

/**
 * Hash password for storage verification
 * Stores base64(argon2id_raw_key) for comparison
 */
export async function hashPassword(password: string): Promise<string> {
  const { key } = await deriveKey(password)
  return key.toString('base64')
}

/**
 * Verify password against stored hash
 * Compares computed hash with stored base64(argon2id_raw_key)
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const { key } = await deriveKey(password)
    const computedHash = key.toString('base64')
    return computedHash === storedHash
  } catch {
    return false
  }
}

/**
 * Encrypt data using AES-256-GCM
 */
export function encrypt(plaintext: string, key: Buffer): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  
  let encrypted = cipher.update(plaintext, 'utf8')
  encrypted = Buffer.concat([encrypted, cipher.final()])
  
  const authTag = cipher.getAuthTag()
  
  // Format: iv + authTag + encrypted
  const result = Buffer.concat([iv, authTag, encrypted])
  return result.toString('base64')
}

/**
 * Decrypt data using AES-256-GCM
 */
export function decrypt(ciphertext: string, key: Buffer): string {
  const data = Buffer.from(ciphertext, 'base64')
  
  if (data.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Invalid ciphertext: too short')
  }
  
  const iv = data.subarray(0, IV_LENGTH)
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH)
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  
  let decrypted = decipher.update(encrypted)
  decrypted = Buffer.concat([decrypted, decipher.final()])
  
  return decrypted.toString('utf8')
}

/**
 * Generate a random salt
 */
export function generateSalt(): Buffer {
  return crypto.randomBytes(SALT_LENGTH)
}

/**
 * Generate a random UUID
 */
export function generateUUID(): string {
  return crypto.randomUUID()
}
