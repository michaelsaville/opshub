import AppShell from "@/components/AppShell"

export default function Home() {
  return (
    <AppShell>
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 600, margin: 0, marginBottom: "4px" }}>
            Welcome to OpsHub
          </h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "14px", margin: 0 }}>
            Multi-tenant IT operations console for PCC2K — Phase 0 scaffold.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "16px",
          }}
        >
          <ScaffoldCard
            title="Phase 1 — M365 admin"
            body="Mailboxes, distribution lists, Teams, licenses, sign-in logs. Reads through TicketHub's Identity feature."
            status="pending"
          />
          <ScaffoldCard
            title="Phase 2 — On-prem agent"
            body="Cross-platform Go agent for AD password reset, service control, Event Logs, scheduled tasks."
            status="pending"
          />
          <ScaffoldCard
            title="Phase 3 — Monitoring + alerts"
            body="Per-client uptime checks (ping/TCP/HTTPS/SNMP/DNS) with web push, ntfy, and email routing."
            status="pending"
          />
          <ScaffoldCard
            title="Phase 4 — Remote access"
            body="In-browser RDP/VNC/SSH via Apache Guacamole tunneled through the agent. Session recording on."
            status="pending"
          />
        </div>
      </div>
    </AppShell>
  )
}

function ScaffoldCard({
  title,
  body,
  status,
}: {
  title: string
  body: string
  status: "pending" | "active" | "done"
}) {
  const chipColor =
    status === "done" ? "#16a34a" : status === "active" ? "#3b82f6" : "#64748b"
  return (
    <div
      style={{
        background: "var(--color-background-secondary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "8px",
        padding: "16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <div style={{ fontWeight: 600, fontSize: "13px" }}>{title}</div>
        <span
          style={{
            fontSize: "10px",
            padding: "1px 8px",
            borderRadius: "999px",
            background: `${chipColor}1A`,
            color: chipColor,
          }}
        >
          {status}
        </span>
      </div>
      <div style={{ color: "var(--color-text-secondary)", fontSize: "12px", lineHeight: 1.5 }}>{body}</div>
    </div>
  )
}
