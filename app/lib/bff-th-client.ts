import "server-only"
import { createHmac } from "node:crypto"

/**
 * Outbound HMAC-signed POSTs from OpsHub → TicketHub BFF.
 *
 * Uses caller-distinct headers + secret from DocHub's caller, so a
 * leaked DH or Portal secret can't forge OpsHub calls. Mirrors the
 * scheme TH expects:
 *
 *   canonical = `${timestampMs}.${rawBody}`
 *   signature = HMAC-SHA256(secret, canonical) as lowercase hex
 *   headers:
 *     X-Op-Timestamp: <unix-ms>
 *     X-Op-Signature: sha256=<hex>
 *
 * TH route handlers verify with `process.env.OP_BFF_SECRET` (Phase 1
 * adds the parallel /api/bff/op/identity/by-name/* route tree).
 */

interface CallOpts {
  /** Path under TH including leading slash, e.g. /api/bff/op/identity/by-name/status */
  path: string
  /** Optional JSON body. Empty body still gets signed. */
  body?: unknown
}

export class BffCallError extends Error {
  constructor(public status: number, public payload: unknown) {
    super(`TH BFF call failed (${status})`)
  }
}

export async function callTickethubBff<T = unknown>(opts: CallOpts): Promise<T> {
  const secret = process.env.OP_BFF_SECRET
  const baseUrl = process.env.TICKETHUB_BASE_URL
  if (!secret) throw new Error("OP_BFF_SECRET not set on OpsHub")
  if (!baseUrl) throw new Error("TICKETHUB_BASE_URL not set on OpsHub")

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
