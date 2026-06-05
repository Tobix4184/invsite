import { Clock3, Wallet, ArrowDownToLine, Users } from 'lucide-react'
import { SITE, formatNaira } from '@/lib/plans'

export function HeroInfo({ isPromoter = false }: { isPromoter?: boolean }) {
  const level1Rate = isPromoter ? SITE.promoterLevel1 : SITE.referralLevel1

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card">
      <div className="relative bg-gradient-to-r from-success/25 via-primary/15 to-primary/30 p-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-success">
          IHH Earnings
        </p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-balance">
          Income Drops Every 24 Hours
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Withdrawal window: {SITE.withdrawalHours}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-px bg-border">
        <Stat
          icon={ArrowDownToLine}
          tint="text-success"
          label="Min. Deposit"
          value={formatNaira(SITE.minDeposit)}
        />
        <Stat
          icon={Wallet}
          tint="text-amber-400"
          label="Min. Withdrawal"
          value={formatNaira(SITE.minWithdrawal)}
        />
        <Stat
          icon={Users}
          tint={isPromoter ? "text-amber-400" : "text-primary"}
          label={isPromoter ? "Referral L1 (Promoter)" : "Referral L1"}
          value={`${level1Rate}%`}
        />
        <Stat
          icon={Users}
          tint="text-sky-400"
          label="Referral L2"
          value={`${SITE.referralLevel2}%`}
        />
      </div>

      <div className="flex items-center justify-center gap-2 bg-card px-4 py-3 text-xs text-muted-foreground">
        <Clock3 className="h-4 w-4 text-success" />
        Sign-in bonus {formatNaira(SITE.signInBonus)} daily • Withdrawal charge {SITE.withdrawalCharge}%
      </div>
    </section>
  )
}

function Stat({
  icon: Icon,
  tint,
  label,
  value,
}: {
  icon: typeof Wallet
  tint: string
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 bg-card p-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
        <Icon className={`h-4 w-4 ${tint}`} />
      </span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-bold tabular-nums">{value}</p>
      </div>
    </div>
  )
}
