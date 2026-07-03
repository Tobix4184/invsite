"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Gift, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { redeemGiftCode } from "@/app/actions/wallet"

export function GiftCodeForm() {
  const router = useRouter()
  const [code, setCode] = useState("")
  const [pending, startTransition] = useTransition()

  function handleRedeem() {
    if (!code.trim()) {
      toast.error("Enter a gift code")
      return
    }
    startTransition(async () => {
      const res = await redeemGiftCode(code)
      if (res.ok) {
        toast.success(res.message)
        setCode("")
        router.refresh()
      } else {
        toast.error(res.message)
      }
    })
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-5 px-4 py-5 animate-fade-up">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          aria-label="Back"
          className="press flex h-9 w-9 items-center justify-center rounded-xl border-2 border-ink bg-card text-foreground shadow-[2px_2px_0_0_var(--ink)]"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-black uppercase tracking-tight">Redeem Gift Code</h1>
      </div>

      <section className="relative flex flex-col items-center gap-4 overflow-hidden rounded-3xl border-2 border-ink bg-gold p-6 text-center text-gold-foreground shadow-[5px_5px_0_0_var(--ink)]">
        <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-ink bg-background">
          <Gift className="h-8 w-8 text-gold-foreground" />
        </span>
        <p className="relative text-sm font-semibold text-pretty">
          Enter a valid gift code below to instantly credit your wallet. Daily gift codes are shared in our Telegram
          channel.
        </p>
      </section>

      <div className="rounded-2xl border-2 border-ink bg-surface px-4 transition-all focus-within:ring-2 focus-within:ring-primary">
        <input
          placeholder="ENTER GIFT CODE"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="w-full bg-transparent py-4 text-center font-mono text-lg font-black tracking-widest outline-none placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-muted-foreground"
        />
      </div>

      <button
        onClick={handleRedeem}
        disabled={pending}
        className="press flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-primary py-4 text-base font-black uppercase text-primary-foreground shadow-[4px_4px_0_0_var(--ink)] disabled:opacity-60"
      >
        {pending && <Loader2 className="h-5 w-5 animate-spin" />}
        Redeem Code
      </button>
    </main>
  )
}
