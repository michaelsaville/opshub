import "server-only"
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  pbkdf2Sync,
  randomBytes,
} from "node:crypto"

/**
 * Crypto primitives for agent enrollment + session establishment, per
 * fleethub/docs/AGENT-PROTOCOL.md §5.2.
 *
 * The token plaintext exists ONLY in transit (admin-to-tech via the
 * one-time-view rendered after enrollment) + on the agent's encrypted
 * local cache. Server stores two derivatives:
 *   - secretHash  = PBKDF2-HMAC-SHA256(token, salt, 600_000, 32)
 *   - proofKeyEnc = AES-256-GCM-wrap(HMAC(token, "pcc2k.proof.v1"),
 *                                    key=PCC2K_AGENT_MASTER_KEY)
 *
 * The master key is shared between OpsHub (writes proofKeyEnc at
 * enrollment) and the gateway (reads + decrypts at session start). It
 * is NOT shared with any other PCC2K app.
 */

const PROTOCOL_INFO = "pcc2k.proof.v1"
const PBKDF2_ITERATIONS = 600_000
const NONCE_BYTES = 12
const TAG_BYTES = 16

function getMasterKey(): Buffer {
  const hex = process.env.PCC2K_AGENT_MASTER_KEY
  if (!hex || hex.length !== 64) {
    throw new Error("PCC2K_AGENT_MASTER_KEY must be 32 bytes hex (openssl rand -hex 32)")
  }
  return Buffer.from(hex, "hex")
}

export function generateEnrollmentToken(): string {
  // 24 bytes → 32-char base64url, easy to copy/paste, well above the
  // brute-force-resistance floor for a token going through PBKDF2.
  return randomBytes(24).toString("base64url")
}

export function deriveProofKey(token: string): Buffer {
  return createHmac("sha256", token).update(PROTOCOL_INFO).digest()
}

export function computeSecretHash(token: string, salt: Buffer): string {
  return pbkdf2Sync(token, salt, PBKDF2_ITERATIONS, 32, "sha256").toString("hex")
}

export function wrapProofKey(proofKey: Buffer): string {
  const key = getMasterKey()
  const nonce = randomBytes(NONCE_BYTES)
  const cipher = createCipheriv("aes-256-gcm", key, nonce)
  const ct = Buffer.concat([cipher.update(proofKey), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([nonce, ct, tag]).toString("base64")
}

export function unwrapProofKey(b64: string): Buffer {
  const key = getMasterKey()
  const buf = Buffer.from(b64, "base64")
  if (buf.length < NONCE_BYTES + TAG_BYTES) {
    throw new Error("proofKeyEnc: truncated")
  }
  const nonce = buf.subarray(0, NONCE_BYTES)
  const tag = buf.subarray(buf.length - TAG_BYTES)
  const ct = buf.subarray(NONCE_BYTES, buf.length - TAG_BYTES)
  const decipher = createDecipheriv("aes-256-gcm", key, nonce)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ct), decipher.final()])
}
