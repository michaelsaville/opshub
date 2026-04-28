import type { Metadata } from "next"
import { SessionProvider } from "@/components/SessionProvider"
import "./globals.css"

export const metadata: Metadata = {
  title: "OpsHub",
  description: "PCC2K operations console — multi-tenant IT admin",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
