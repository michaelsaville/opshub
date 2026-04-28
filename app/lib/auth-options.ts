import type { NextAuthOptions } from "next-auth"
import AzureADProvider from "next-auth/providers/azure-ad"
import { prisma } from "@/lib/prisma"

/**
 * NextAuth config. Uses the same PCC2K Entra app registration that
 * DocHub already uses (AZURE_AD_* env vars), so staff who can sign in
 * to DocHub can sign in to OpsHub — provided their email is also in
 * Op_StaffUser. Two gates: tenant-level via Entra, then per-app via
 * the StaffUser allowlist.
 *
 * Slightly diverged from DocHub's auth-options on purpose: we don't
 * use a separate StaffUser model from DocHub because OpsHub access
 * may need to be a strict subset (junior tech sees DH but not OpsHub),
 * and we don't want a DocHub schema change to silently grant OpsHub
 * access. Each app keeps its own allowlist.
 */
export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false
      try {
        const allowed = await prisma.op_StaffUser.findUnique({
          where: { email: user.email.toLowerCase() },
        })
        return !!(allowed && allowed.isActive)
      } catch {
        return false
      }
    },
    async jwt({ token, user }) {
      if (user?.email) {
        try {
          const staff = await prisma.op_StaffUser.findUnique({
            where: { email: user.email.toLowerCase() },
          })
          if (staff) {
            token.id = staff.id
            token.role = staff.role
          }
        } catch (e) {
          console.error("OpsHub JWT error:", String(e))
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as { id?: string; role?: string }).id = token.id as string
        ;(session.user as { id?: string; role?: string }).role = token.role as string
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
}
