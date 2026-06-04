"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowDownToLine, ArrowUpFromLine, Gift, LogIn, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { dailySignIn } from "@/app/actions/account"

export function QuickActions({ signedInToday = false }: { signedInToday?: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(signedInToday)

  function handleSignIn() {
    if (done) {
      toast.info("You already claimed your sign-in bonus today")
      return
    }
    startTransition(async () => {
      const res = await dailySignIn()
      if (res.ok) {
        toast.success(res.message)
        setDone(true)
        router.refresh()
      } else if ('requiresInvestment' in res && res.requiresInvestment) {
        toast.error(res.message, {
          action: {
            label: "Invest Now",
            onClick: () => router.push("/products"),
          },
        })
      } else {
        toast.info(res.message)
        setDone(true)
      }
    })
  }

  const linkActions = [
    { label: "Topup", icon: ArrowDownToLine, href: "/topup", tint: "text-success", bg: "bg-success/15" },
    { label: "Withdraw", icon: ArrowUpFromLine, href: "/withdraw", tint: "text-amber-400", bg: "bg-amber-400/15" },
    { label: "Gift Code", icon: Gift, href: "/gift-code", tint: "text-pink-400", bg: "bg-pink-400/15" },
  ]

  return (
    <section className="grid grid-cols-5 gap-2">
      {linkActions.map((action) => (
        <button
          key={action.label}
          onClick={() => router.push(action.href)}
          className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-2.5 text-center transition-colors hover:bg-secondary"
        >
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${action.bg}`}>
            <action.icon className={`h-5 w-5 ${action.tint}`} />
          </span>
          <span className="text-[11px] font-medium leading-tight text-muted-foreground">{action.label}</span>
        </button>
      ))}

      <button
        onClick={handleSignIn}
        disabled={pending}
        className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-2.5 text-center transition-colors hover:bg-secondary disabled:opacity-60"
      >
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${done ? "bg-success/15" : "bg-sky-400/15"}`}>
          <LogIn className={`h-5 w-5 ${done ? "text-success" : "text-sky-400"}`} />
        </span>
        <span className="text-[11px] font-medium leading-tight text-muted-foreground">
          {done ? "Claimed" : "Sign In"}
        </span>
      </button>

      <button
        onClick={() => router.push("/team")}
        className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card p-2.5 text-center transition-colors hover:bg-secondary"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
          <UserPlus className="h-5 w-5 text-primary" />
        </span>
        <span className="text-[11px] font-medium leading-tight text-muted-foreground">Invite</span>
      </button>
    </section>
  )
}
