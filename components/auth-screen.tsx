"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Mail, Phone, Lock, ShieldCheck, Tag, User, Loader2, TrendingUp, Zap, Shield } from "lucide-react"
import { toast } from "sonner"
import { Logo } from "@/components/logo"
import { SITE } from "@/lib/plans"
import { authClient } from "@/lib/auth-client"
import { initAccount, resolveLoginEmail } from "@/app/actions/account"

type Mode = "sign-in" | "sign-up"

function Field({
  id,
  label,
  hint,
  icon: Icon,
  type = "text",
  placeholder,
  value,
  onChange,
}: {
  id: string
  label: string
  hint?: string
  icon: typeof Mail
  type?: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {label} {hint && <span className="font-normal normal-case opacity-60">({hint})</span>}
      </label>
      <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/60 px-4 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30 transition-all">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground/60"
        />
      </div>
    </div>
  )
}

export function AuthScreen({ defaultInvite = "", promoCode = "" }: { defaultInvite?: string; promoCode?: string }) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>(promoCode ? "sign-up" : "sign-in")
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: "",
    identifier: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
    invite: defaultInvite,
  })
  const set = (key: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [key]: v }))

  async function handleSignIn() {
    if (!form.identifier || !form.password) {
      toast.error("Enter your email/phone and password")
      return
    }
    setLoading(true)
    try {
      const { email } = await resolveLoginEmail(form.identifier)
      if (!email) {
        toast.error("No account found with that email or phone")
        return
      }
      const { error } = await authClient.signIn.email({ email, password: form.password })
      if (error) {
        toast.error(error.message || "Invalid login details")
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
    if (!form.name || !form.email || !form.phone || !form.password) {
      toast.error("Please fill in all required fields")
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
    setLoading(true)
    try {
      const result = await authClient.signUp.email({
        email: form.email.toLowerCase(),
        password: form.password,
        name: form.name,
      })
      if (result.error) {
        toast.error(result.error.message || "Could not create account")
        return
      }
      await initAccount({ phone: form.phone, inviteCode: form.invite, promoCode })
      toast.success(`Welcome to ${SITE.name}! ₦${SITE.welcomeBonus.toLocaleString()} bonus added.`)
      router.push("/dashboard")
      router.refresh()
    } catch {
      toast.error("Something went wrong. Try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero strip */}
      <div className="bg-card border-b border-border px-4 pt-10 pb-8">
        <div className="mx-auto max-w-md">
          <div className="flex items-center gap-3 mb-6">
            <Logo className="h-10 w-10" />
            <span className="text-xl font-black tracking-tight">{SITE.name}</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-balance leading-tight">
            {mode === "sign-in" ? "Welcome back" : "Start earning daily"}
          </h1>
          <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
            {mode === "sign-in"
              ? "Sign in to access your investments and daily earnings."
              : `Join ${SITE.name} and earn daily returns on device-tier investment plans.`}
          </p>

          {mode === "sign-up" && (
            <div className="mt-5 flex gap-4">
              {[
                { icon: TrendingUp, label: "Up to 5% daily" },
                { icon: Zap, label: "8 device tiers" },
                { icon: Shield, label: "Secure platform" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  {label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Form */}
      <main className="flex-1 px-4 py-6 mx-auto w-full max-w-md">
        {/* Tab toggle */}
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-secondary/40 p-1 mb-6">
          {(["sign-in", "sign-up"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-lg py-2.5 text-sm font-bold transition-all ${
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
          {mode === "sign-up" && (
            <Field id="name" label="Full Name" icon={User} placeholder="John Doe" value={form.name} onChange={set("name")} />
          )}

          {mode === "sign-in" ? (
            <Field id="identifier" label="Email or Phone" icon={Mail} placeholder="email@example.com or 080..." value={form.identifier} onChange={set("identifier")} />
          ) : (
            <>
              <Field id="email" label="Email Address" icon={Mail} type="email" placeholder="example@email.com" value={form.email} onChange={set("email")} />
              <Field id="phone" label="Phone Number" icon={Phone} type="tel" placeholder="080XXXXXXXX" value={form.phone} onChange={set("phone")} />
            </>
          )}

          <Field id="password" label="Password" icon={Lock} type="password" placeholder="••••••••" value={form.password} onChange={set("password")} />

          {mode === "sign-up" && (
            <>
              <Field id="confirm" label="Confirm Password" icon={ShieldCheck} type="password" placeholder="••••••••" value={form.confirm} onChange={set("confirm")} />
              <Field id="invite" label="Invite Code" hint="optional" icon={Tag} placeholder="Enter invite code" value={form.invite} onChange={set("invite")} />
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "sign-in" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {mode === "sign-in" ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")} className="font-bold text-primary">
            {mode === "sign-in" ? "Register" : "Sign in"}
          </button>
        </p>
      </main>
    </div>
  )
}
