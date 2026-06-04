"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Mail, Phone, Lock, ShieldCheck, Tag, User, Loader2 } from "lucide-react"
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
      <label htmlFor={id} className="mb-2 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {label} {hint && <span className="font-normal normal-case text-muted-foreground/60">({hint})</span>}
      </label>
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/50 px-4 focus-within:border-primary">
        <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
    </div>
  )
}

export function AuthScreen({ defaultInvite = "" }: { defaultInvite?: string }) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>("sign-in")
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
      console.log("[v0] Starting signup for:", form.email)
      const result = await authClient.signUp.email({
        email: form.email.toLowerCase(),
        password: form.password,
        name: form.name,
      })
      console.log("[v0] Signup result:", result)
      if (result.error) {
        console.log("[v0] Signup error:", result.error)
        toast.error(result.error.message || "Could not create account")
        return
      }
      console.log("[v0] Signup success, initializing account")
      await initAccount({ phone: form.phone, inviteCode: form.invite })
      toast.success(`Welcome to ${SITE.name}! ₦${SITE.welcomeBonus} bonus added.`)
      router.push("/dashboard")
      router.refresh()
    } catch (err) {
      console.log("[v0] Signup exception:", err)
      toast.error("Something went wrong. Try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col px-4 py-8">
      <main className="mx-auto w-full max-w-md">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo className="h-16 w-16" />
          <h1 className="text-3xl font-extrabold tracking-tight text-balance">
            {mode === "sign-in" ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="text-muted-foreground">
            {mode === "sign-in" ? `Sign in to your ${SITE.name} account` : `Join ${SITE.name} today`}
          </p>
        </div>

        {/* Mode toggle */}
        <div className="mt-7 grid grid-cols-2 gap-1 rounded-2xl border border-border bg-secondary/40 p-1">
          {(["sign-in", "sign-up"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-xl py-2.5 text-sm font-bold transition-colors ${
                mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {m === "sign-in" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        <form
          className="mt-5 flex flex-col gap-4 rounded-3xl border border-border bg-card/60 p-6"
          onSubmit={(e) => {
            e.preventDefault()
            mode === "sign-in" ? handleSignIn() : handleSignUp()
          }}
        >
          {mode === "sign-up" && (
            <Field
              id="name"
              label="Full Name"
              icon={User}
              placeholder="John Doe"
              value={form.name}
              onChange={set("name")}
            />
          )}

          {mode === "sign-in" ? (
            <Field
              id="identifier"
              label="Email or Phone"
              icon={Mail}
              placeholder="email@example.com or 080..."
              value={form.identifier}
              onChange={set("identifier")}
            />
          ) : (
            <>
              <Field
                id="email"
                label="Email Address"
                icon={Mail}
                type="email"
                placeholder="example@email.com"
                value={form.email}
                onChange={set("email")}
              />
              <Field
                id="phone"
                label="Phone Number"
                icon={Phone}
                type="tel"
                placeholder="080XXXXXXXX"
                value={form.phone}
                onChange={set("phone")}
              />
            </>
          )}

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
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-5 w-5 animate-spin" />}
            {mode === "sign-in" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "sign-in" ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")}
            className="font-bold text-primary"
          >
            {mode === "sign-in" ? "Register here" : "Sign in here"}
          </button>
        </p>
      </main>
    </div>
  )
}
