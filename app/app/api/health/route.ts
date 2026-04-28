import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/**
 * Liveness + readiness check. Touches the DB so a misconfigured
 * DATABASE_URL surfaces as a 503 to the operator (and to nginx, which
 * can use this for upstream health).
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({
      status: "ok",
      app: "opshub",
      phase: 0,
      ts: new Date().toISOString(),
    })
  } catch (e) {
    return NextResponse.json(
      {
        status: "error",
        app: "opshub",
        error: e instanceof Error ? e.message : "db unreachable",
        ts: new Date().toISOString(),
      },
      { status: 503 },
    )
  }
}
