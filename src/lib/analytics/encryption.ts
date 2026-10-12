import crypto from 'node:crypto'
import { EncryptedSecret } from '@/types/analytics'

// 256-bit key derived from server secret or fallback dev key
const MASTER_KEY = crypto
  .createHash('sha256')
  .update(process.env.ENCRYPTION_MASTER_KEY || 'desynthic_master_sales_secret_key_2026')
  .digest()

/**
 * Encrypts sensitive provider API keys using AES-256-GCM.
 * Returns ciphertext, IV, authentication tag, and safe masked preview.
 */
export function encryptSecret(plaintext: string): EncryptedSecret {
  const iv = crypto.randomBytes(12) // 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', MASTER_KEY, iv)

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const tag = cipher.getAuthTag().toString('hex')

  // Generate safe masked display (e.g. sk_live_...a8f2)
  const trimmed = plaintext.trim()
  const maskedKey =
    trimmed.length > 8
      ? `${trimmed.substring(0, 4)}••••••••${trimmed.substring(trimmed.length - 4)}`
      : '••••••••'

  return {
    ciphertext: encrypted,
    iv: iv.toString('hex'),
    tag,
    maskedKey,
  }
}

/**
 * Decrypts ciphertext using AES-256-GCM and verifies authentication tag.
 * Never called directly by client UI.
 */
export function decryptSecret(encrypted: EncryptedSecret): string {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    MASTER_KEY,
    Buffer.from(encrypted.iv, 'hex')
  )
  decipher.setAuthTag(Buffer.from(encrypted.tag, 'hex'))

  let decrypted = decipher.update(encrypted.ciphertext, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
