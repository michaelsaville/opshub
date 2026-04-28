import "server-only"
import { createHmac } from "node:crypto"

/**
 * Outbound HMAC-signed POSTs from OpsHub → DocHub BFF.
 *
 * Phase 0 unused — DocHub doesn't expose any inbound BFF routes for
 * OpsHub yet. Phase 1+ will add them as needed (e.g. fetch the assets
 * for a client to show alongside Op_AuditLog entries). Same scheme as
 * the TH caller; different secret + base URL.
 */

interface CallOpts {
  path: string
  body?: unknown
}

export class BffCallError extends Error {
  constructor(public status: number, public payload: unknown) {
    super(`DH BFF call failed (${status})`)
  }
}

export async function callDochubBff<T = unknown>(opts: CallOpts): Promise<T> {
  const secret = process.env.OP_BFF_SECRET_DH
  const baseUrl = process.env.DOCHUB_BASE_URL
  if (!secret) throw new Error("OP_BFF_SECRET_DH not set on OpsHub")
  if (!baseUrl) throw new Error("DOCHUB_BASE_URL not set on OpsHub")

  const rawBody = opts.body === undefined ? "" : JSON.stringify(opts.body)
  const ts = Date.now().toString()
  const sig = createHmac("sha256", secret).update(`${ts}.${rawBody}`).digest("hex")

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}${opts.path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Op-Timestamp": ts,
      "X-Op-Signature": `sha256=${sig}`,
    },
    body: rawBody,
    cache: "no-store",
  })

  const text = await res.text()
  let parsed: unknown
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    parsed = text
  }
  if (!res.ok) throw new BffCallError(res.status, parsed)
  return parsed as T
}
