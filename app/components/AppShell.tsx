"use client"

import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

/**
 * Phase 0 AppShell — minimal. Just enforces auth and renders a header
 * + content area. The DocHub-style sidebar / quick-add / search-modal
 * comes in Phase 1 once we have actual nav targets.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status, router])

  if (status === "loading") {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", color: "var(--color-text-muted)" }}>
        Loading…
      </div>
    )
  }
  if (status === "unauthenticated") return null

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 24px",
          borderBottom: "0.5px solid var(--color-border-secondary)",
          background: "var(--color-background-secondary)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ fontWeight: 600, fontSize: "15px", letterSpacing: "-0.01em" }}>OpsHub</div>
          <span
            style={{
              fontSize: "10px",
              color: "var(--color-text-muted)",
              background: "var(--color-background-tertiary)",
              padding: "2px 8px",
              borderRadius: "999px",
              border: "0.5px solid var(--color-border-tertiary)",
            }}
          >
            Phase 0 — scaffold
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
            {session?.user?.email}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            style={{
              fontSize: "11px",
              padding: "4px 10px",
              borderRadius: "5px",
              border: "0.5px solid var(--color-border-secondary)",
              background: "transparent",
              color: "var(--color-text-secondary)",
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </div>
      </header>
      <main style={{ flex: 1, padding: "32px 24px", maxWidth: "1280px", margin: "0 auto", width: "100%" }}>
        {children}
      </main>
    </div>
  )
}
