"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Phone, Lock, ShieldCheck, Tag, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Logo } from "@/components/logo"
import { Captcha } from "@/components/captcha"
import { SITE } from "@/lib/plans"
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
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top brand strip */}
      <div className="px-5 pt-12 pb-8">
        <div className="mx-auto max-w-md">
          {/* Logo + wordmark */}
          <div className="flex items-center gap-3 mb-8">
            <Logo className="h-10 w-10 rounded-xl" />
            <span className="text-lg font-black tracking-tight">{SITE.name}</span>
          </div>

          {mode === "sign-in" ? (
            <>
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Welcome back</p>
              <h1 className="text-[2rem] font-black leading-tight tracking-tight text-balance">
                Sign in to your account
              </h1>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Access your investments and daily earnings.
              </p>
            </>
          ) : (
            <>
              <p className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Get started</p>
              <h1 className="text-[2rem] font-black leading-tight tracking-tight text-balance">
                Start earning every day
              </h1>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Join {SITE.name} — invest in valued assets and earn fixed daily returns.
              </p>

              {/* Perks row */}
              <div className="mt-4 flex gap-3">
                {[
                  { val: SITE.packageCount + "", sub: "packages" },
                  { val: "45d+", sub: "earning cycle" },
                  { val: "₦" + SITE.welcomeBonus.toLocaleString(), sub: "sign-up bonus" },
                ].map(({ val, sub }) => (
                  <div key={sub} className="flex-1 rounded-2xl border border-border bg-card px-3 py-2.5 text-center">
                    <p className="text-sm font-black text-primary">{val}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{sub}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Form card */}
      <main className="flex-1 px-5 pb-10 mx-auto w-full max-w-md">
        {/* Mode toggle */}
        <div className="flex gap-1 rounded-2xl border border-border bg-card p-1 mb-6">
          {(["sign-in", "sign-up"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition-all ${
                mode === m
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "sign-in" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            mode === "sign-in" ? handleSignIn() : handleSignUp()
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

          {mode === "sign-up" && (
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
                hint="optional"
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
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-black text-primary-foreground transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "sign-in" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {mode === "sign-in" ? "No account yet? " : "Already registered? "}
          <button
            onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
            className="font-black text-primary"
          >
            {mode === "sign-in" ? "Register free" : "Sign in"}
          </button>
        </p>
      </main>
    </div>
  )
}
