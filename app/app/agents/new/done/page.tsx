import Link from "next/link"
import { cookies } from "next/headers"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import AppShell from "@/components/AppShell"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/**
 * One-shot success view after /agents/new. Reads the
 * `op_pending_token` cookie set by the server action, displays the
 * plaintext enrollment token + ready-to-paste env block, then clears
 * the cookie. Refreshing the page clears the token (cannot be shown
 * twice).
 */
export default async function NewAgentDonePage() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | undefined)?.role
  if (role !== "ADMIN") {
    return (
      <AppShell>
        <p>ADMIN role required.</p>
      </AppShell>
    )
  }

  const cookieJar = await cookies()
  const stash = cookieJar.get("op_pending_token")?.value
  if (stash) {
    cookieJar.delete("op_pending_token")
  }

  if (!stash) {
    return (
      <AppShell>
        <div style={{ maxWidth: "560px" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 600, margin: 0, marginBottom: "8px" }}>
            Token already shown
          </h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "13px" }}>
            Enrollment tokens are shown <strong>once</strong>. If you missed it,
            revoke this agent and enroll a fresh one.
          </p>
          <Link href="/agents" style={{ fontSize: "13px" }}>
            ← Back to agents
          </Link>
        </div>
      </AppShell>
    )
  }

  const [agentId, token] = stash.split(":")
  const agent = await prisma.op_Agent.findUnique({ where: { id: agentId ?? "" } })

  if (!agent || !token) {
    return (
      <AppShell>
        <p>Agent record not found.</p>
      </AppShell>
    )
  }

  const envBlock = [
    `# /etc/pcc2k-agent.env on the host running the agent`,
    `PCC2K_GATEWAY_URL=wss://gateway.pcc2k.com/agent/v1`,
    `PCC2K_AGENT_TOKEN=${token}`,
    `PCC2K_AGENT_ID=${agent.id}`,
    `PCC2K_CLIENT_NAME=${agent.clientName}`,
    `PCC2K_HOSTNAME=${agent.hostname ?? ""}`,
    `PCC2K_ROLE=server`,
  ].join("\n")

  return (
    <AppShell>
      <div style={{ maxWidth: "720px", display: "flex", flexDirection: "column", gap: "20px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 600, margin: 0, marginBottom: "4px" }}>
            Agent enrolled — copy now
          </h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "13px", margin: 0 }}>
            This token will <strong>never</strong> be shown again. Paste the
            block below into the agent's <code>/etc/pcc2k-agent.env</code> and
            restart the service.
          </p>
        </div>

        <div
          style={{
            padding: "16px",
            borderRadius: "8px",
            border: "1px solid #c8881e",
            background: "#3a2a10",
            color: "#f0d895",
            fontSize: "13px",
          }}
        >
          ⚠ The plaintext token is on screen — anyone shoulder-surfing this
          page can impersonate this agent.
        </div>

        <div>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: 500,
              color: "var(--color-text-secondary)",
              marginBottom: "6px",
            }}
          >
            Env file ({envBlock.length} bytes)
          </label>
          <pre
            style={{
              margin: 0,
              padding: "14px",
              borderRadius: "8px",
              background: "var(--color-background-secondary)",
              border: "0.5px solid var(--color-border-secondary)",
              fontSize: "12px",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              overflowX: "auto",
              whiteSpace: "pre",
            }}
          >
            {envBlock}
          </pre>
        </div>

        <div style={{ display: "flex", gap: "12px", fontSize: "13px" }}>
          <Link href="/agents">← Back to agents</Link>
          <Link href="/agents/new">Enroll another</Link>
        </div>
      </div>
    </AppShell>
  )
}
