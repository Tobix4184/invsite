import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Archivo, Space_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import { getBoolSetting, SETTING_KEYS } from '@/app/actions/settings'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'
import { profile, investment } from '@/lib/db/schema'
import { eq, count } from 'drizzle-orm'
import { headers } from 'next/headers'
import './globals.css'

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-archivo',
})

const jakartaMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-jakarta-mono',
})

export const metadata: Metadata = {
  title: '247 Incum — Earn Every Hour, Every Day',
  description:
    '247 Incum — invest in real-world valued assets and earn fixed daily returns. Fund, invest, invite friends, and grow your income around the clock.',
  generator: 'v0.app',
  icons: {
    icon: '/favicon.png',
    apple: '/apple-icon.png',
    shortcut: '/favicon.png',
  },
  openGraph: {
    title: '247 Incum — Earn Every Hour, Every Day',
    description: 'Invest in valued assets and earn fixed daily returns. Join 247 Incum today.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: '247 Incum' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '247 Incum — Earn Every Hour, Every Day',
    description: 'Invest in valued assets and earn fixed daily returns. Join 247 Incum today.',
    images: ['/og.png'],
  },
}

export const viewport: Viewport = {
  themeColor: '#1a3d2b',
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
  // Auth/public paths that must NEVER be frozen
  const headersList = await headers()
  const pathname = headersList.get("x-pathname") ?? headersList.get("x-invoke-path") ?? ""
  const AUTH_PATHS = ["/", "/sign-in", "/register"]
  const isAuthPath = AUTH_PATHS.includes(pathname) || pathname.startsWith("/r/")

  // Short-circuit: no freeze check needed for auth pages
  const [frozen, session] = await Promise.all([
    isAuthPath ? Promise.resolve(false) : getBoolSetting(SETTING_KEYS.siteFrozen),
    getSession(),
  ])

  let showFreeze = false

  if (frozen && !isAuthPath) {
    const userId = session?.user?.id

    if (userId) {
      // Admin check — admins are never frozen
      const [p] = await db
        .select({ role: profile.role })
        .from(profile)
        .where(eq(profile.userId, userId))
      const isAdmin = p?.role === "admin"

      if (!isAdmin) {
        // Only freeze users who have at least one investment record (any status)
        // New users and users who have never invested are completely unaffected
        const [{ total }] = await db
          .select({ total: count() })
          .from(investment)
          .where(eq(investment.userId, userId))
        const hasInvested = total > 0
        showFreeze = hasInvested
      }
    }
    // Unauthenticated visitors — never freeze (let them reach sign-in/register)
  }

  return (
    <html lang="en" className={`${archivo.variable} ${jakartaMono.variable} bg-background`}>
      <body className="font-sans antialiased">
        {children}
        <Toaster theme="light" position="top-center" richColors />
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
