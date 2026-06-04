'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, Phone, Lock, ShieldCheck, Tag } from 'lucide-react'
import { Logo } from '@/components/logo'
import { SITE } from '@/lib/plans'

function Field({
  id,
  label,
  hint,
  icon: Icon,
  type = 'text',
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
      <label
        htmlFor={id}
        className="mb-2 block text-xs font-bold uppercase tracking-wide text-muted-foreground"
      >
        {label}{' '}
        {hint && <span className="font-normal normal-case text-muted-foreground/60">({hint})</span>}
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

export default function RegisterPage() {
  const [form, setForm] = useState({
    email: '',
    phone: '',
    password: '',
    confirm: '',
    invite: SITE.inviteCode,
  })

  const set = (key: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [key]: v }))

  return (
    <div className="flex min-h-screen flex-col px-4 py-8">
      <main className="mx-auto w-full max-w-md">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo className="h-14 w-14" />
          <h1 className="text-3xl font-extrabold tracking-tight">Create Account</h1>
          <p className="text-muted-foreground">Join {SITE.name} today</p>
        </div>

        <form
          className="mt-8 flex flex-col gap-5 rounded-3xl border border-border bg-card/60 p-6"
          onSubmit={(e) => e.preventDefault()}
        >
          <Field
            id="email"
            label="Email Address"
            icon={Mail}
            type="email"
            placeholder="example@email.com"
            value={form.email}
            onChange={set('email')}
          />
          <Field
            id="phone"
            label="Phone Number"
            icon={Phone}
            type="tel"
            placeholder="080XXXXXXXX"
            value={form.phone}
            onChange={set('phone')}
          />
          <Field
            id="password"
            label="Password"
            icon={Lock}
            type="password"
            placeholder="••••••••"
            value={form.password}
            onChange={set('password')}
          />
          <Field
            id="confirm"
            label="Confirm Password"
            icon={ShieldCheck}
            type="password"
            placeholder="••••••••"
            value={form.confirm}
            onChange={set('confirm')}
          />
          <Field
            id="invite"
            label="Invite Code"
            hint="optional"
            icon={Tag}
            placeholder="Enter invite code"
            value={form.invite}
            onChange={set('invite')}
          />

          <button
            type="submit"
            className="mt-2 w-full rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Create Account
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/sign-in" className="font-bold text-primary">
            Sign in here
          </Link>
        </p>
      </main>
    </div>
  )
}
