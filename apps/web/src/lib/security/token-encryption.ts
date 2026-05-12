// Token Encryption — AES-256-GCM
// Server-only. Used to encrypt OAuth access/refresh tokens before DB storage.
// Key: INTEGRATION_ENCRYPTION_KEY env var (64 hex chars = 32 bytes / 256 bits)
// Format: hex(iv):hex(authTag):hex(ciphertext)

import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12      // GCM recommended
const TAG_LENGTH = 16

function getKey(): Buffer {
  const raw = process.env.INTEGRATION_ENCRYPTION_KEY
  if (!raw) throw new Error('INTEGRATION_ENCRYPTION_KEY env var is not set')
  if (raw.length !== 64) throw new Error('INTEGRATION_ENCRYPTION_KEY must be 64 hex chars (32 bytes)')
  return Buffer.from(raw, 'hex')
}

/**
 * Encrypt plaintext token → "iv:authTag:ciphertext" (all hex)
 */
export function encryptToken(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH })

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

/**
 * Decrypt "iv:authTag:ciphertext" → plaintext
 */
export function decryptToken(encrypted: string): string {
  const parts = encrypted.split(':')
  if (parts.length !== 3) throw new Error('Invalid encrypted token format')

  const [ivHex, tagHex, ciphertextHex] = parts
  const key = getKey()
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(tagHex, 'hex')
  const ciphertext = Buffer.from(ciphertextHex, 'hex')

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH })
  decipher.setAuthTag(authTag)

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf8')
}

/**
 * Safely decrypt — returns null on any failure (expired, tampered, missing key)
 */
export function safeDecryptToken(encrypted: string | null | undefined): string | null {
  if (!encrypted) return null
  try {
    return decryptToken(encrypted)
  } catch {
    return null
  }
}
