import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import { getBoolSetting, SETTING_KEYS } from '@/app/actions/settings'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { profile } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import './globals.css'

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
})

export const metadata: Metadata = {
  title: 'incomehh — Investment Platform',
  description:
    'incomehh (IHH) — daily income drops every 24 hours. Topup, withdraw, invite, and grow your earnings.',
  generator: 'v0.app',
  icons: {
    icon: '/favicon.png',
    apple: '/logo.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#1a1730',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Check site freeze — only show overlay to non-admin users
  const [frozen, session] = await Promise.all([
    getBoolSetting(SETTING_KEYS.siteFrozen),
    getSession(),
  ])
  const userId = session?.user?.id
  let isAdmin = false
  if (userId && frozen) {
    const [p] = await db.select({ role: profile.role }).from(profile).where(eq(profile.userId, userId))
    isAdmin = p?.role === "admin"
  }
  const showFreeze = frozen && !isAdmin

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} bg-background`}>
      <body className="font-sans antialiased">
        {children}
        <Toaster theme="dark" position="top-center" richColors />
        {process.env.NODE_ENV === 'production' && <Analytics />}

        {/* Site freeze overlay — covers everything, non-admins cannot interact */}
        {showFreeze && (
          <div
            style={{ position: "fixed", inset: 0, zIndex: 9999, backdropFilter: "blur(6px)", backgroundColor: "rgba(0,0,0,0.85)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", padding: "24px" }}
          >
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ color: "#fff", fontWeight: 900, fontSize: "1.1rem", margin: 0 }}>Service Temporarily Unavailable</p>
              <p style={{ color: "#9ca3af", fontSize: "0.85rem", marginTop: "8px", lineHeight: 1.5 }}>
                We are performing maintenance. Please check back shortly.
              </p>
            </div>
          </div>
        )}
      </body>
    </html>
  )
}
