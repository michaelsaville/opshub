import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { getServerSession } from "next-auth"
import { randomBytes } from "node:crypto"
import { authOptions } from "@/lib/auth-options"
import AppShell from "@/components/AppShell"
import { prisma } from "@/lib/prisma"
import {
  computeSecretHash,
  deriveProofKey,
  generateEnrollmentToken,
  wrapProofKey,
} from "@/lib/agent-crypto"

export const dynamic = "force-dynamic"

/**
 * Agent enrollment — generates a one-time bearer token, stores its
 * derivatives (PBKDF2 secretHash + AES-GCM-wrapped proofKey), and
 * shows the plaintext token ONCE on the success page. Per protocol
 * §4.2 the token never persists plaintext server-side.
 *
 * Form posts to a server action defined in this file. On success the
 * action stashes the token in a single-use cookie and redirects to
 * /agents/new/done; that page reads the cookie, displays it, then
 * deletes it. The cookie is HttpOnly + same-site so it doesn't leak.
 */
export default async function NewAgentPage() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | undefined)?.role
  if (role !== "ADMIN") {
    return (
      <AppShell>
        <p>ADMIN role required.</p>
      </AppShell>
    )
  }

  async function createAgent(formData: FormData) {
    "use server"
    const s = await getServerSession(authOptions)
    const r = (s?.user as { role?: string } | undefined)?.role
    if (r !== "ADMIN") return

    const clientName = (formData.get("clientName")?.toString() ?? "").trim()
    const hostname = (formData.get("hostname")?.toString() ?? "").trim()
    const os = formData.get("os")?.toString() || null
    const capabilitiesRaw = (formData.get("capabilities")?.toString() ?? "agent,inventory,alerts").trim()

    if (!clientName || !hostname) {
      throw new Error("clientName and hostname are required")
    }

    const capabilities = capabilitiesRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)

    const token = generateEnrollmentToken()
    const salt = randomBytes(16)
    const secretHash = computeSecretHash(token, salt)
    const proofKey = deriveProofKey(token)
    const proofKeyEnc = wrapProofKey(proofKey)

    const agent = await prisma.op_Agent.create({
      data: {
        clientName,
        hostname,
        os,
        secretHash,
        salt: salt.toString("base64"),
        proofKeyEnc,
        capabilitiesJson: JSON.stringify(capabilities),
        isActive: true,
      },
      select: { id: true },
    })

    const cookieJar = await cookies()
    cookieJar.set("op_pending_token", `${agent.id}:${token}`, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/agents",
      maxAge: 120,
    })

    redirect("/agents/new/done")
  }

  return (
    <AppShell>
      <div style={{ maxWidth: "560px", display: "flex", flexDirection: "column", gap: "20px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 600, margin: 0, marginBottom: "4px" }}>
            Enroll new agent
          </h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "13px", margin: 0 }}>
            Generate a one-time enrollment token. The token will be shown <strong>once</strong>
            {" "}on the next page — copy it directly into the agent's <code>/etc/pcc2k-agent.env</code>.
          </p>
        </div>

        <form action={createAgent} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px" }}>
            <span style={{ fontWeight: 500 }}>Client name</span>
            <span style={{ color: "var(--color-text-muted)", fontSize: "12px" }}>
              Must match TH_Client.name (and FleetHub clientName).
            </span>
            <input
              name="clientName"
              required
              defaultValue="PCC2K (Internal)"
              style={inputStyle}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px" }}>
            <span style={{ fontWeight: 500 }}>Hostname</span>
            <input name="hostname" required style={inputStyle} />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px" }}>
            <span style={{ fontWeight: 500 }}>OS</span>
            <select name="os" defaultValue="linux" style={inputStyle}>
              <option value="linux">linux</option>
              <option value="windows">windows</option>
              <option value="darwin">darwin</option>
            </select>
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px" }}>
            <span style={{ fontWeight: 500 }}>Capabilities</span>
            <span style={{ color: "var(--color-text-muted)", fontSize: "12px" }}>
              Comma-separated namespaces the agent advertises.
            </span>
            <input
              name="capabilities"
              defaultValue="agent,inventory,alerts"
              style={inputStyle}
            />
          </label>

          <button type="submit" style={submitStyle}>
            Generate token
          </button>
        </form>
      </div>
    </AppShell>
  )
}

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: "6px",
  border: "0.5px solid var(--color-border-secondary)",
  background: "var(--color-background-secondary)",
  fontSize: "13px",
  fontFamily: "inherit",
}

const submitStyle: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: "6px",
  background: "var(--color-accent)",
  color: "white",
  fontSize: "13px",
  fontWeight: 500,
  border: "none",
  cursor: "pointer",
  alignSelf: "flex-start",
}
