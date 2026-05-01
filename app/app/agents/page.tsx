import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-options"
import AppShell from "@/components/AppShell"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/**
 * Agent enrollment hub. Lists every Op_Agent row (active + revoked)
 * and links to /agents/new for the next enrollment. ADMIN-only — the
 * page is the single-pane view of who can connect to the gateway, so
 * non-admin techs don't get to see the fleet roster.
 */
export default async function AgentsPage() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | undefined)?.role
  if (role !== "ADMIN") {
    return (
      <AppShell>
        <p>ADMIN role required.</p>
      </AppShell>
    )
  }

  const agents = await prisma.op_Agent.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  })

  return (
    <AppShell>
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: 600, margin: 0, marginBottom: "4px" }}>
              Agents
            </h1>
            <p style={{ color: "var(--color-text-secondary)", fontSize: "13px", margin: 0 }}>
              PCC2K-Agent enrollments. {agents.length} total · {agents.filter((a) => a.isActive).length} active.
            </p>
          </div>
          <Link
            href="/agents/new"
            style={{
              padding: "8px 14px",
              borderRadius: "6px",
              background: "var(--color-accent)",
              color: "white",
              fontSize: "13px",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            + Enroll new agent
          </Link>
        </header>

        {agents.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>
            No agents enrolled yet. Click <strong>Enroll new agent</strong> to mint
            the first token.
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "0.5px solid var(--color-border-secondary)" }}>
                <th style={{ padding: "8px 6px" }}>Status</th>
                <th style={{ padding: "8px 6px" }}>Client</th>
                <th style={{ padding: "8px 6px" }}>Hostname</th>
                <th style={{ padding: "8px 6px" }}>OS</th>
                <th style={{ padding: "8px 6px" }}>Capabilities</th>
                <th style={{ padding: "8px 6px" }}>Last seen</th>
                <th style={{ padding: "8px 6px" }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                  <td style={{ padding: "8px 6px" }}>
                    {a.isActive ? (
                      <span style={{ color: "#1e9e5a" }}>active</span>
                    ) : (
                      <span style={{ color: "var(--color-text-muted)" }}>revoked</span>
                    )}
                  </td>
                  <td style={{ padding: "8px 6px" }}>{a.clientName}</td>
                  <td style={{ padding: "8px 6px", fontFamily: "monospace" }}>{a.hostname ?? "—"}</td>
                  <td style={{ padding: "8px 6px" }}>{a.os ?? "—"}</td>
                  <td style={{ padding: "8px 6px", fontSize: "12px", color: "var(--color-text-secondary)" }}>
                    {a.capabilitiesJson ? (JSON.parse(a.capabilitiesJson) as string[]).join(", ") : "—"}
                  </td>
                  <td style={{ padding: "8px 6px" }}>
                    {a.lastSeenAt ? new Date(a.lastSeenAt).toLocaleString() : "never"}
                  </td>
                  <td style={{ padding: "8px 6px" }}>{new Date(a.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  )
}
