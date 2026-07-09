import { betterAuth, type BetterAuthOptions } from "better-auth"
import { Pool } from "pg"

function createAuth() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL is not set")

  const pool = new Pool({ connectionString: url })

  const opts: BetterAuthOptions = {
    database: pool,
    baseURL:
      process.env.BETTER_AUTH_URL ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : process.env.V0_RUNTIME_URL),
    secret: process.env.BETTER_AUTH_SECRET,
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
    },
    trustedOrigins: [
      // v0 preview runs on *.vusercontent.net — both the VM URL and the
      // project-name URL differ per session, so we trust the whole domain.
      "https://*.vusercontent.net",
      ...(process.env.V0_RUNTIME_URL ? [process.env.V0_RUNTIME_URL] : []),
      ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
      ...(process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`]
        : []),
      // localhost for local dev
      "http://localhost:3000",
      // Production domains
      "https://ipoco.xyz",
      "https://www.ipoco.xyz",
      "https://247.incumb.fun",
      "https://www.247.incumb.fun",
    ],
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    ...(process.env.NODE_ENV === "development"
      ? {
          advanced: {
            defaultCookieAttributes: {
              sameSite: "none" as const,
              secure: true,
            },
          },
        }
      : {}),
  }

  return betterAuth(opts)
}

let _auth: ReturnType<typeof betterAuth> | undefined

export const auth = new Proxy({} as ReturnType<typeof betterAuth>, {
  get(_target, prop) {
    if (!_auth) {
      _auth = createAuth()
    }
    const val = (_auth as unknown as Record<string | symbol, unknown>)[prop]
    if (typeof val === "function") {
      return val.bind(_auth)
    }
    return val
  },
})
