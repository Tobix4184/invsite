"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Phone, Lock, ShieldCheck, Tag, Loader2, ArrowRight, TrendingUp, Clock, Gift } from "lucide-react"
import { toast } from "sonner"
import { Logo } from "@/components/logo"
import { Captcha } from "@/components/captcha"
import { SITE, formatNaira } from "@/lib/plans"
import { authClient } from "@/lib/auth-client"
import { initAccount, resolveLoginEmail } from "@/app/actions/account"

type Mode = "sign-in" | "sign-up"

/** Normalizes a Nigerian phone number to digits only. */
function normalizePhone(raw: string) {
  return raw.replace(/[^\d]/g, "")
}

/** Synthesizes the internal Better Auth email from a phone number. */
function phoneToEmail(phone: string) {
  return `${normalizePhone(phone)}@247incum.user`
}

function Field({
  id,
  label,
  hint,
  icon: Icon,
  type = "text",
  placeholder,
  value,
  onChange,
  inputMode,
}: {
  id: string
  label: string
  hint?: string
  icon: typeof Phone
  type?: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
  inputMode?: "text" | "numeric" | "tel"
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
        {hint && <span className="ml-1 font-normal normal-case opacity-50">({hint})</span>}
      </label>
      <div className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-card px-4 transition-all focus-within:ring-2 focus-within:ring-primary">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          id={id}
          type={type}
          inputMode={inputMode}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-muted-foreground/40"
        />
      </div>
    </div>
  )
}

export function AuthScreen({ defaultInvite = "", promoCode = "" }: { defaultInvite?: string; promoCode?: string }) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>(promoCode ? "sign-up" : "sign-in")
  const [loading, setLoading] = useState(false)
  const [captcha, setCaptcha] = useState("")
  const [captchaValid, setCaptchaValid] = useState(false)
  const [form, setForm] = useState({
    phone: "",
    password: "",
    confirm: "",
    invite: defaultInvite,
  })
  const set = (key: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [key]: v }))

  function switchMode(next: Mode) {
    if (next === mode) return
    setMode(next)
  }

  async function handleSignIn() {
    if (!form.phone || !form.password) {
      toast.error("Enter your phone number and password")
      return
    }
    setLoading(true)
    try {
      const { email } = await resolveLoginEmail(normalizePhone(form.phone))
      const loginEmail = email ?? phoneToEmail(form.phone)
      const { error } = await authClient.signIn.email({ email: loginEmail, password: form.password })
      if (error) {
        toast.error(error.message || "Invalid phone number or password")
        return
      }
      toast.success("Welcome back!")
      router.push("/dashboard")
      router.refresh()
    } catch {
      toast.error("Something went wrong. Try again.")
    } finally {
      setLoading(false)
    }
  }

  async function handleSignUp() {
    const phone = normalizePhone(form.phone)
    if (phone.length < 10) {
      toast.error("Enter a valid phone number")
      return
    }
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }
    if (form.password !== form.confirm) {
      toast.error("Passwords do not match")
      return
    }
    if (!captchaValid) {
      toast.error("The security code is incorrect")
      return
    }
    setLoading(true)
    try {
      const result = await authClient.signUp.email({
        email: phoneToEmail(phone),
        password: form.password,
        name: phone,
      })
      if (result.error) {
        const msg = result.error.message || "Could not create account"
        toast.error(/exist/i.test(msg) ? "An account with this phone number already exists" : msg)
        return
      }
      await initAccount({ phone, inviteCode: form.invite, promoCode })
      toast.success(`Welcome to ${SITE.name}!`)
      router.push("/dashboard")
      router.refresh()
    } catch {
      toast.error("Something went wrong. Try again.")
    } finally {
      setLoading(false)
    }
  }

  const isSignIn = mode === "sign-in"

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      {/* Brand */}
      <header className="relative px-5 pt-10 pb-5">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <Logo className="h-11 w-11 rounded-2xl border-2 border-ink" />
          <div className="leading-none">
            <span className="block text-lg font-black tracking-tight">{SITE.name}</span>
            <span className="mt-1 block text-[11px] font-medium text-muted-foreground">{SITE.tagline}</span>
          </div>
        </div>
      </header>

      {/* Sliding panel */}
      <main className="relative mx-auto w-full max-w-md flex-1 px-5 pb-12">
        <div
          key={mode}
          className={isSignIn ? "animate-slide-in-left" : "animate-slide-in-right"}
        >
          {/* Heading */}
          <div className="mb-6">
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-gold px-3 py-1 text-[11px] font-black uppercase tracking-widest text-gold-foreground">
              {isSignIn ? "Welcome back" : "Get started"}
            </span>
            <h1 className="mt-3 text-[2rem] font-black leading-[1.1] tracking-tight text-balance text-gradient">
              {isSignIn ? "Sign in to keep earning" : "Start earning every day"}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {isSignIn
                ? "Access your investments and daily returns."
                : `Join ${SITE.name} — invest in valued assets and earn fixed daily returns.`}
            </p>
          </div>

          {/* Sign-up perks */}
          {!isSignIn && (
            <div className="mb-6 grid grid-cols-3 gap-2.5">
              {[
                { icon: TrendingUp, val: `${SITE.packageCount}`, sub: "packages" },
                { icon: Clock, val: "45d+", sub: "earn cycle" },
                { icon: Gift, val: formatNaira(SITE.welcomeBonus), sub: "sign-up bonus" },
              ].map(({ icon: Icon, val, sub }) => (
                <div key={sub} className="card-glass flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-center">
                  <Icon className="h-4 w-4 text-primary" />
                  <p className="text-sm font-black tabular-nums">{val}</p>
                  <p className="text-[10px] text-muted-foreground">{sub}</p>
                </div>
              ))}
            </div>
          )}

          {/* Form */}
          <form
            className="card-glass flex flex-col gap-4 rounded-3xl p-5"
            onSubmit={(e) => {
              e.preventDefault()
              isSignIn ? handleSignIn() : handleSignUp()
            }}
          >
            <Field
              id="phone"
              label="Phone Number"
              icon={Phone}
              type="tel"
              inputMode="tel"
              placeholder="080XXXXXXXX"
              value={form.phone}
              onChange={set("phone")}
            />

            <Field
              id="password"
              label="Password"
              icon={Lock}
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={set("password")}
            />

            {!isSignIn && (
              <>
                <Field
                  id="confirm"
                  label="Confirm Password"
                  icon={ShieldCheck}
                  type="password"
                  placeholder="••••••••"
                  value={form.confirm}
                  onChange={set("confirm")}
                />
                <Field
                  id="invite"
                  label="Invite Code"
                  hint="required"
                  icon={Tag}
                  placeholder="Enter invite code"
                  value={form.invite}
                  onChange={set("invite")}
                />
                <Captcha value={captcha} onChange={setCaptcha} onValidChange={setCaptchaValid} />
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="press group mt-1 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-primary py-4 text-sm font-black uppercase tracking-wide text-primary-foreground shadow-[4px_4px_0_0_var(--ink)] disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {isSignIn ? "Sign In" : "Create Account"}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Switch link */}
          <p className="mt-5 text-center text-sm text-muted-foreground">
            {isSignIn ? "No account yet? " : "Already registered? "}
            <button
              onClick={() => switchMode(isSignIn ? "sign-up" : "sign-in")}
              className="font-black text-primary underline-offset-4 hover:underline"
            >
              {isSignIn ? "Register free" : "Sign in"}
            </button>
          </p>
        </div>
      </main>
    </div>
  )
}
