"use client"

import { useState, useTransition, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Users,
  Wallet,
  ArrowUpFromLine,
  TrendingUp,
  Check,
  X,
  Gift,
  Plus,
  Home,
  Loader2,
  Building2,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Eye,
  Star,
  Trophy,
  Receipt,
  SlidersHorizontal,
  ArrowDownToLine,
  Pause,
  Play,
  Megaphone,
  Copy,
  Link2,
  Percent,
  RefreshCw,
  BarChart3,
  Dices,
  Ticket,
  Lock,
  CalendarCheck,
  Ban,
  CalendarPlus,
} from "lucide-react"
import { toast } from "sonner"
import { SITE, formatNaira } from "@/lib/plans"
import {
  approveWithdrawal,
  rejectWithdrawal,
  adjustBalance,
  createGiftCode,
  processAllIncome,
  addBankAccount,
  updateBankAccount,
  deleteBankAccount,
  toggleBankAccountStatus,
  togglePromoter,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  toggleMilestoneStatus,
  setDepositsPaused,
  setWithdrawalsPaused,
  createPromoterCode,
  updatePromoterCode,
  togglePromoterCode,
  deletePromoterCode,
  setPromoterCommission,
  getAdminData,
  adminCancelInvestment,
  adminDeleteInvestment,
  adminExtendInvestment,
  executeLuckyDraw,
} from "@/app/actions/admin"
import { approveDeposit, rejectDeposit } from "@/app/actions/deposit"

const POLL_INTERVAL = 20_000 // 20 seconds

type Stats = {
  users: number
  totalDeposited: number
  totalWithdrawn: number
  totalBalance: number
  activeInvestments: number
  pendingWithdrawals: number
}

type Withdrawal = {
  id: number
  amount: string
  charge: string
  netAmount: string
  bankName: string | null
  accountNumber: string | null
  accountName: string | null
  status: string
  createdAt: Date | string
  userName: string | null
  userEmail: string | null
}

type AdminUser = {
  id: string
  name: string | null
  email: string | null
  role: string | null
  isPromoter: boolean | null
  promoterCommission: number | null
  balance: string | null
  totalDeposited: string | null
  referralEarnings: string | null
  referralCount: number
}

type GiftCode = {
  id: number
  code: string
  amount: string
  maxUses: number
  uses: number
  active: boolean
}

type Deposit = {
  id: number
  amount: string
  reference: string
  status: string
  createdAt: Date | string
  userEmail: string | null
  senderName: string | null
  assignedBankName: string | null
  assignedAccountNumber: string | null
  assignedAccountName: string | null
}

type BankAccount = {
  id: number
  accountNumber: string
  bankName: string
  accountName: string
  label: string | null
  isActive: boolean
  weight: number
  totalDeposits: string
  depositCount: number
  createdAt: Date | string
}

type Milestone = {
  id: number
  referralCount: number
  rewardAmount: string
  isActive: boolean
}

type Controls = {
  depositsPaused: boolean
  withdrawalsPaused: boolean
}

type Txn = {
  id: number
  userId: string
  type: string
  amount: string
  status: string
  description: string | null
  reference: string | null
  createdAt: Date | string
  userName: string | null
  userEmail: string | null
}

type PromoterCode = {
  id: number
  code: string
  label: string | null
  isActive: boolean
  signups: number
  maxSignups: number | null
  commissionRate: number | null
  createdAt: Date | string
}

const TABS = [
  "Overview",
  "Financials",
  "Games",
  "Investments",
  "Transactions",
  "Withdrawals",
  "Lucky Draw",
  "Users",
  "Gift Codes",
  "Promoter Codes",
  "Deposits",
  "Bank Accounts",
  "Milestones",
] as const
type Tab = (typeof TABS)[number]

type SpinRow = {
  id: number
  userId: string
  stakeAmount: string
  outcome: string
  multiplier: string
  winAmount: string
  createdAt: Date | string
  userName: string | null
  userEmail: string | null
}

type VaultRow = {
  id: number
  userId: string
  amount: string
  lockDays: number
  bonusPercent: string
  bonusAmount: string
  status: string
  unlocksAt: Date | string
  penaltyAmount: string | null
  createdAt: Date | string
  completedAt: Date | string | null
  userName: string | null
  userEmail: string | null
}

type DrawSlotRow = {
  id: number
  userId: string
  source: string
  purchaseAmount: string | null
  drawDate: string
  createdAt: Date | string
  userName: string | null
  userEmail: string | null
}

type GameStats = {
  spin: { total: number; wins: number; losses: number; winRate: number; totalStaked: number; totalPaidOut: number; houseProfit: number }
  vault: { total: number; active: number; totalLocked: number }
  draw: { totalSlots: number; paidSlots: number; revenue: number }
}

type InvestmentRow = {
  id: number
  userId: string
  planName: string
  price: string
  dailyEarning: string
  totalEarning: string
  amountEarned: string
  daysPaid: number
  durationDays: number
  status: string
  createdAt: Date | string
  userName: string | null
  userEmail: string | null
}

type Financials = {
  withdrawalCharges: number
  totalPayouts: number
  pendingPayouts: number
  totalDeposits: number
  activeInvestments: number
  activeInvestmentVolume: number
  platformTotalEarned: number
  platformTotalWithdrawn: number
  platformRevenue: number
}

type DrawRound = {
  id: number
  drawDate: string
  prizePool: string
  status: string
  winner1Id: string | null
  winner2Id: string | null
  winner3Id: string | null
  executedAt: Date | string | null
}

type AdminData = {
  stats: Stats
  withdrawals: Withdrawal[]
  users: AdminUser[]
  giftCodes: GiftCode[]
  deposits: Deposit[]
  bankAccounts: BankAccount[]
  milestones: Milestone[]
  controls: Controls
  transactions: Txn[]
  promoterCodes: PromoterCode[]
  investments: InvestmentRow[]
  financials: Financials
  drawRounds: DrawRound[]
  spins: SpinRow[]
  vaults: VaultRow[]
  drawSlots: DrawSlotRow[]
  gameStats: GameStats
}

export function AdminDashboard(initial: AdminData) {
  const [data, setData] = useState<AdminData>(initial)
  const [tab, setTab] = useState<Tab>("Overview")
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refresh = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true)
    try {
      const fresh = await getAdminData()
      setData(fresh)
      setLastUpdated(new Date())
    } catch {
      // silently ignore — data stays stale
    } finally {
      if (showSpinner) setRefreshing(false)
    }
  }, [])

  // Start polling on mount
  useEffect(() => {
    timerRef.current = setInterval(() => refresh(), POLL_INTERVAL)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [refresh])

  const { stats, withdrawals, users, giftCodes, deposits, bankAccounts, milestones, controls, transactions, promoterCodes, investments, financials, drawRounds, spins, vaults, drawSlots, gameStats } = data

  return (
    <div className="min-h-screen pb-10">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Admin Console</h1>
            <p className="text-xs text-muted-foreground">
              Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refresh(true)}
              disabled={refreshing}
              className="flex h-9 items-center gap-1.5 rounded-full border border-border bg-secondary px-3 text-xs font-semibold text-muted-foreground disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Loading..." : "Refresh"}
            </button>
            <Link
              href="/dashboard"
              className="flex h-9 items-center gap-1.5 rounded-full border border-border bg-secondary px-3 text-xs font-semibold text-muted-foreground"
            >
              <Home className="h-4 w-4" /> App
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-5">
        {/* Live pulse indicator */}
        <div className="mb-4 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          <span className="text-xs text-muted-foreground">Live — auto-refreshes every 20 seconds</span>
        </div>

        <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                tab === t ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "Overview" && <Overview stats={stats} controls={controls} onAction={() => refresh()} />}
        {tab === "Financials" && <FinancialsTab data={financials} />}
        {tab === "Games" && <GamesAdminTab spins={spins} vaults={vaults} drawSlots={drawSlots} drawRounds={drawRounds} gameStats={gameStats} onAction={() => refresh()} />}
        {tab === "Investments" && <InvestmentsTab items={investments} onAction={() => refresh()} />}
        {tab === "Transactions" && <TransactionsTab items={transactions} />}
        {tab === "Withdrawals" && <Withdrawals items={withdrawals} onAction={() => refresh()} />}
        {tab === "Lucky Draw" && <LuckyDrawTab rounds={drawRounds} onAction={() => refresh()} />}
        {tab === "Users" && <UsersTab items={users} />}
        {tab === "Gift Codes" && <GiftCodesTab items={giftCodes} />}
        {tab === "Promoter Codes" && <PromoterCodesTab items={promoterCodes} onAction={() => refresh()} />}
        {tab === "Deposits" && <DepositsTab items={deposits} onAction={() => refresh()} />}
        {tab === "Bank Accounts" && <BankAccountsTab items={bankAccounts} />}
        {tab === "Milestones" && <MilestonesTab items={milestones} />}
      </div>
    </div>
  )
}

function TransactionsTab({ items }: { items: Txn[] }) {
  const [filter, setFilter] = useState<string>("all")
  const types = ["all", "deposit", "withdrawal", "earning", "bonus", "referral", "adjustment"]
  const filtered = filter === "all" ? items : items.filter((t) => t.type === filter)

  const tint = (type: string) => {
    if (type === "deposit" || type === "earning" || type === "bonus" || type === "referral") return "text-success"
    if (type === "withdrawal") return "text-amber-400"
    if (type === "adjustment") return "text-sky-400"
    return "text-muted-foreground"
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Receipt className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold">Live Transactions</h3>
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} shown</span>
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
              filter === t ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No transactions</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((t) => (
            <div key={t.id} className="rounded-2xl border border-border bg-card p-3">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase ${tint(t.type)}`}>{t.type}</span>
                <span className={`text-sm font-bold tabular-nums ${tint(t.type)}`}>
                  {formatNaira(Number(t.amount))}
                </span>
              </div>
              <p className="mt-1 truncate text-sm font-medium">{t.userName ?? t.userEmail ?? t.userId.slice(0, 10)}</p>
              {t.description && <p className="truncate text-xs text-muted-foreground">{t.description}</p>}
              <p className="mt-1 text-[10px] text-muted-foreground">
                {new Date(t.createdAt).toLocaleString()}
                {t.status ? ` · ${t.status}` : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Overview({ stats, controls, onAction }: { stats: Stats; controls: Controls; onAction: () => void }) {
  const [pending, startTransition] = useTransition()
  const [depositsPaused, setDepPaused] = useState(controls.depositsPaused)
  const [withdrawalsPaused, setWdPaused] = useState(controls.withdrawalsPaused)
  const [savingDep, startDepTransition] = useTransition()
  const [savingWd, startWdTransition] = useTransition()

  // Keep local pause state in sync when polled data arrives
  useEffect(() => { setDepPaused(controls.depositsPaused) }, [controls.depositsPaused])
  useEffect(() => { setWdPaused(controls.withdrawalsPaused) }, [controls.withdrawalsPaused])

  function handleProcessIncome() {
    startTransition(async () => {
      const res = await processAllIncome()
      if (res.ok) toast.success(res.message)
      else toast.error(res.message ?? "Failed")
      onAction()
    })
  }

  function toggleDeposits() {
    const next = !depositsPaused
    setDepPaused(next)
    startDepTransition(async () => {
      const res = await setDepositsPaused(next)
      if (res.ok) toast.success(res.message)
      else {
        toast.error("Failed")
        setDepPaused(!next)
      }
      onAction()
    })
  }

  function toggleWithdrawals() {
    const next = !withdrawalsPaused
    setWdPaused(next)
    startWdTransition(async () => {
      const res = await setWithdrawalsPaused(next)
      if (res.ok) toast.success(res.message)
      else {
        toast.error("Failed")
        setWdPaused(!next)
      }
      onAction()
    })
  }

  const cards = [
    { label: "Total Users", value: String(stats.users), icon: Users, tint: "text-primary" },
    { label: "Total Deposited", value: formatNaira(stats.totalDeposited), icon: Wallet, tint: "text-success" },
    { label: "Total Withdrawn", value: formatNaira(stats.totalWithdrawn), icon: ArrowUpFromLine, tint: "text-amber-400" },
    { label: "User Balances", value: formatNaira(stats.totalBalance), icon: Wallet, tint: "text-sky-400" },
    { label: "Active Investments", value: String(stats.activeInvestments), icon: TrendingUp, tint: "text-success" },
    { label: "Pending Withdrawals", value: String(stats.pendingWithdrawals), icon: ArrowUpFromLine, tint: "text-destructive" },
  ]
  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={handleProcessIncome}
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
        Process All Income
      </button>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold">Site Controls</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Pausing hides the action from users entirely and blocks new requests.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <button
            onClick={toggleDeposits}
            disabled={savingDep}
            className={`flex items-center justify-between rounded-xl border px-3 py-3 text-sm font-semibold transition-colors disabled:opacity-60 ${
              depositsPaused
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "border-success/40 bg-success/10 text-success"
            }`}
          >
            <span className="flex items-center gap-2">
              <ArrowDownToLine className="h-4 w-4" /> Deposits
            </span>
            <span className="flex items-center gap-1.5">
              {savingDep ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : depositsPaused ? (
                <>
                  <Pause className="h-4 w-4" /> Paused
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" /> Active
                </>
              )}
            </span>
          </button>
          <button
            onClick={toggleWithdrawals}
            disabled={savingWd}
            className={`flex items-center justify-between rounded-xl border px-3 py-3 text-sm font-semibold transition-colors disabled:opacity-60 ${
              withdrawalsPaused
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "border-success/40 bg-success/10 text-success"
            }`}
          >
            <span className="flex items-center gap-2">
              <ArrowUpFromLine className="h-4 w-4" /> Withdrawals
            </span>
            <span className="flex items-center gap-1.5">
              {savingWd ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : withdrawalsPaused ? (
                <>
                  <Pause className="h-4 w-4" /> Paused
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" /> Active
                </>
              )}
            </span>
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card p-4">
            <c.icon className={`h-5 w-5 ${c.tint}`} />
            <p className="mt-2 text-xl font-bold tabular-nums">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function Withdrawals({ items, onAction }: { items: Withdrawal[]; onAction: () => void }) {
  const [pending, startTransition] = useTransition()

  function act(id: number, kind: "approve" | "reject") {
    startTransition(async () => {
      const res = kind === "approve" ? await approveWithdrawal(id) : await rejectWithdrawal(id)
      if (res.ok) toast.success(res.message)
      else toast.error(res.message)
      onAction()
    })
  }

  function copyAcct(value: string) {
    navigator.clipboard.writeText(value)
    toast.success("Account number copied")
  }

  if (items.length === 0) return <Empty label="No withdrawals" />

  return (
    <div className="flex flex-col gap-3">
      {items.map((w) => (
        <div key={w.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold">{formatNaira(Number(w.amount))}</p>
              <p className="text-xs text-muted-foreground">
                Net {formatNaira(Number(w.netAmount))} · Fee {formatNaira(Number(w.charge))}
              </p>
            </div>
            <StatusBadge status={w.status} />
          </div>
          <div className="mt-3 rounded-xl bg-secondary/50 p-3 text-xs">
            <p className="font-semibold">{w.userName ?? "User"} · {w.userEmail}</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="text-muted-foreground">
                {w.bankName} · <span className="font-mono font-semibold text-foreground">{w.accountNumber}</span> · {w.accountName}
              </p>
              {w.accountNumber && (
                <button
                  onClick={() => copyAcct(w.accountNumber!)}
                  className="shrink-0 rounded-lg border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                  title="Copy account number"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          {w.status === "pending" && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => act(w.id, "approve")}
                disabled={pending}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-success py-2.5 text-sm font-bold text-success-foreground disabled:opacity-60"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Approve
              </button>
              <button
                onClick={() => act(w.id, "reject")}
                disabled={pending}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-destructive/40 bg-destructive/10 py-2.5 text-sm font-bold text-destructive disabled:opacity-60"
              >
                <X className="h-4 w-4" /> Reject
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function UsersTab({ items }: { items: AdminUser[] }) {
  const [pending, startTransition] = useTransition()
  const [editing, setEditing] = useState<string | null>(null)
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [commissionEditing, setCommissionEditing] = useState<string | null>(null)
  const [commissionVal, setCommissionVal] = useState("")
  const router = useRouter()

  function submit(userId: string) {
    startTransition(async () => {
      const res = await adjustBalance(userId, Number(amount), note)
      if (res.ok) {
        toast.success(res.message)
        setEditing(null)
        setAmount("")
        setNote("")
        router.refresh()
      } else {
        toast.error(res.message)
      }
    })
  }

  function handleSetCommission(userId: string) {
    startTransition(async () => {
      const rate = commissionVal.trim() === "" ? null : Number(commissionVal)
      const res = await setPromoterCommission(userId, rate)
      if (res.ok) { toast.success(res.message); setCommissionEditing(null); setCommissionVal(""); router.refresh() }
      else toast.error(res.message)
    })
  }

  function handleTogglePromoter(userId: string) {
    startTransition(async () => {
      const res = await togglePromoter(userId)
      if (res.ok) toast.success(res.message)
      else toast.error(res.message)
      router.refresh()
    })
  }

  if (items.length === 0) return <Empty label="No users" />

  return (
    <div className="flex flex-col gap-3">
      {items.map((u) => (
        <div key={u.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 truncate font-semibold">
                {u.name}
                {u.role === "admin" && (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                    admin
                  </span>
                )}
                {u.isPromoter && (
                  <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-400">
                    <Star className="mr-0.5 inline h-2.5 w-2.5" />promoter
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-muted-foreground">{u.email}</p>
              <p className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" /> {u.referralCount} referrals
                </span>
                <span>·</span>
                <span className="text-success">{formatNaira(Number(u.referralEarnings ?? 0))} earned</span>
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold tabular-nums">{formatNaira(Number(u.balance ?? 0))}</p>
              <p className="text-[10px] text-muted-foreground">
                dep {formatNaira(Number(u.totalDeposited ?? 0))}
              </p>
            </div>
          </div>

          {editing === u.id ? (
            <div className="mt-3 flex flex-col gap-2">
              <input
                type="number"
                placeholder="Amount (+ credit / - debit)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              <input
                placeholder="Note (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(null)}
                  className="flex-1 rounded-xl border border-border bg-secondary py-2.5 text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => submit(u.id)}
                  disabled={pending}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
                >
                  {pending && <Loader2 className="h-4 w-4 animate-spin" />} Save
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setEditing(u.id)}
                className="flex-1 rounded-xl border border-border bg-secondary py-2 text-xs font-bold text-muted-foreground"
              >
                Adjust Balance
              </button>
              <button
                onClick={() => handleTogglePromoter(u.id)}
                disabled={pending}
                className={`flex items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-bold ${
                  u.isPromoter
                    ? "border border-amber-400/40 bg-amber-400/10 text-amber-400"
                    : "border border-border bg-secondary text-muted-foreground"
                }`}
              >
                <Star className="h-3 w-3" />
                {u.isPromoter ? "Remove" : "Promoter"}
              </button>
              {u.isPromoter && (
                <button
                  onClick={() => { setCommissionEditing(u.id); setCommissionVal(u.promoterCommission != null ? String(u.promoterCommission) : "") }}
                  className="flex items-center justify-center gap-1 rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-bold text-muted-foreground"
                >
                  <Percent className="h-3 w-3" /> {u.promoterCommission != null ? `${u.promoterCommission}%` : "Rate"}
                </button>
              )}
            </div>
          )}
          {commissionEditing === u.id && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="100"
                placeholder={`Commission % (default ${SITE.promoterLevel1}%)`}
                value={commissionVal}
                onChange={(e) => setCommissionVal(e.target.value)}
                className="flex-1 rounded-xl border border-border bg-secondary/50 px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button onClick={() => setCommissionEditing(null)} className="rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-bold">
                Cancel
              </button>
              <button onClick={() => handleSetCommission(u.id)} disabled={pending} className="flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-60">
                {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function GiftCodesTab({ items }: { items: GiftCode[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({ code: "", amount: "", maxUses: "1" })

  function create() {
    startTransition(async () => {
      const res = await createGiftCode({
        code: form.code,
        amount: Number(form.amount),
        maxUses: Number(form.maxUses),
      })
      if (res.ok) {
        toast.success(res.message)
        setForm({ code: "", amount: "", maxUses: "1" })
        router.refresh()
      } else {
        toast.error(res.message)
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-3 flex items-center gap-2 text-sm font-bold">
          <Plus className="h-4 w-4 text-primary" /> Create Gift Code
        </p>
        <div className="flex flex-col gap-2">
          <input
            placeholder="CODE (e.g. IHH500)"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
            className="rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm font-mono outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Amount ₦"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="flex-1 rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
            <input
              type="number"
              placeholder="Max uses"
              value={form.maxUses}
              onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
              className="w-28 rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={create}
            disabled={pending}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Create Code
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <Empty label="No gift codes yet" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {items.map((g, i) => (
            <div
              key={g.id}
              className={`flex items-center justify-between p-4 ${i !== items.length - 1 ? "border-b border-border" : ""}`}
            >
              <div className="flex items-center gap-3">
                <Gift className="h-4 w-4 text-pink-400" />
                <div>
                  <p className="font-mono font-bold">{g.code}</p>
                  <p className="text-xs text-muted-foreground">
                    {g.uses}/{g.maxUses} used
                  </p>
                </div>
              </div>
              <span className="font-bold text-success tabular-nums">{formatNaira(Number(g.amount))}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PromoterCodesTab({ items, onAction }: { items: PromoterCode[]; onAction: () => void }) {
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({ code: "", label: "", maxSignups: "", commissionRate: "" })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editVals, setEditVals] = useState({ maxSignups: "", commissionRate: "" })

  const create = () => {
    startTransition(async () => {
      const res = await createPromoterCode({
        code: form.code,
        label: form.label,
        maxSignups: form.maxSignups ? Number(form.maxSignups) : null,
        commissionRate: form.commissionRate ? Number(form.commissionRate) : null,
      })
      if (res.ok) {
        toast.success(res.message)
        setForm({ code: "", label: "", maxSignups: "", commissionRate: "" })
        onAction()
      } else {
        toast.error(res.message)
      }
    })
  }

  const saveEdit = (id: number) => {
    startTransition(async () => {
      const res = await updatePromoterCode(id, {
        maxSignups: editVals.maxSignups !== "" ? Number(editVals.maxSignups) : null,
        commissionRate: editVals.commissionRate !== "" ? Number(editVals.commissionRate) : null,
      })
      if (res.ok) { toast.success(res.message); setEditingId(null); onAction() }
      else toast.error(res.message)
    })
  }

  const toggle = (id: number) => {
    startTransition(async () => {
      const res = await togglePromoterCode(id)
      if (res.ok) toast.success(res.message)
      else toast.error(res.message)
      onAction()
    })
  }

  const remove = (id: number) => {
    startTransition(async () => {
      const res = await deletePromoterCode(id)
      if (res.ok) toast.success(res.message)
      else toast.error(res.message)
      onAction()
    })
  }

  const copyLink = (code: string) => {
    if (typeof window !== "undefined") {
      const link = `${window.location.origin}/?promo=${encodeURIComponent(code)}`
      navigator.clipboard.writeText(link)
      toast.success("Promoter link copied")
    }
  }

  const inputCls = "rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary"

  return (
    <div className="flex flex-col gap-4">
      {/* Create form */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-1 flex items-center gap-2 text-sm font-bold">
          <Megaphone className="h-4 w-4 text-primary" /> Create Promoter Code
        </p>
        <p className="mb-3 text-xs text-muted-foreground">
          Anyone who registers with this link is tagged as a promoter. Leave max signups blank for unlimited.
        </p>
        <div className="flex flex-col gap-2">
          <input
            placeholder="Code (leave blank to auto-generate)"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
            className={`${inputCls} font-mono`}
          />
          <input
            placeholder="Label (optional, e.g. Instagram campaign)"
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            className={inputCls}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min="1"
              placeholder="Max signups (blank = unlimited)"
              value={form.maxSignups}
              onChange={(e) => setForm((f) => ({ ...f, maxSignups: e.target.value }))}
              className={inputCls}
            />
            <input
              type="number"
              min="1"
              max="100"
              placeholder={`Commission % (default ${SITE.promoterLevel1}%)`}
              value={form.commissionRate}
              onChange={(e) => setForm((f) => ({ ...f, commissionRate: e.target.value }))}
              className={inputCls}
            />
          </div>
          <button
            onClick={create}
            disabled={pending}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Create Code
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          No promoter codes yet
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((c) => (
            <div key={c.id} className="rounded-2xl border border-border bg-card p-4">
              {/* Header row */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-mono font-bold">
                    <Megaphone className="h-4 w-4 text-primary" />
                    {c.code}
                    {!c.isActive && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                        inactive
                      </span>
                    )}
                  </p>
                  {c.label && <p className="mt-0.5 truncate text-xs text-muted-foreground">{c.label}</p>}
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      <span className="font-semibold text-foreground">{c.signups}</span>
                      {c.maxSignups != null ? ` / ${c.maxSignups}` : ""} signups
                    </span>
                    <span>·</span>
                    <span>
                      L1 commission:{" "}
                      <span className="font-semibold text-foreground">
                        {c.commissionRate ?? SITE.promoterLevel1}%
                      </span>
                      {c.commissionRate == null && <span className="text-muted-foreground"> (default)</span>}
                    </span>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${c.isActive ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                  {c.isActive ? "active" : "off"}
                </span>
              </div>

              {/* Link preview */}
              <div className="mt-3 flex items-center gap-2 overflow-hidden rounded-xl bg-secondary/50 px-3 py-2">
                <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate text-xs text-muted-foreground">
                  {typeof window !== "undefined" ? `${window.location.origin}/?promo=${c.code}` : `/?promo=${c.code}`}
                </span>
              </div>

              {/* Inline edit for limits */}
              {editingId === c.id ? (
                <div className="mt-3 flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min="1"
                      placeholder="Max signups (blank = unlimited)"
                      value={editVals.maxSignups}
                      onChange={(e) => setEditVals((v) => ({ ...v, maxSignups: e.target.value }))}
                      className={inputCls}
                    />
                    <input
                      type="number"
                      min="1"
                      max="100"
                      placeholder={`Commission % (default ${SITE.promoterLevel1}%)`}
                      value={editVals.commissionRate}
                      onChange={(e) => setEditVals((v) => ({ ...v, commissionRate: e.target.value }))}
                      className={inputCls}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingId(null)} className="flex-1 rounded-xl border border-border bg-secondary py-2 text-xs font-bold">
                      Cancel
                    </button>
                    <button onClick={() => saveEdit(c.id)} disabled={pending} className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground disabled:opacity-60">
                      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex gap-2">
                  <button onClick={() => copyLink(c.code)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary py-2 text-xs font-bold text-muted-foreground">
                    <Copy className="h-3.5 w-3.5" /> Copy Link
                  </button>
                  <button
                    onClick={() => { setEditingId(c.id); setEditVals({ maxSignups: c.maxSignups != null ? String(c.maxSignups) : "", commissionRate: c.commissionRate != null ? String(c.commissionRate) : "" }) }}
                    className="flex items-center justify-center gap-1 rounded-xl border border-border bg-secondary px-3 py-2 text-xs font-bold text-muted-foreground"
                  >
                    Edit
                  </button>
                  <button onClick={() => toggle(c.id)} disabled={pending} className={`flex items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-60 ${c.isActive ? "border border-amber-400/40 bg-amber-400/10 text-amber-400" : "border border-success/40 bg-success/10 text-success"}`}>
                    {c.isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    {c.isActive ? "Off" : "On"}
                  </button>
                  <button onClick={() => remove(c.id)} disabled={pending} className="flex items-center justify-center rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive disabled:opacity-60">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DepositsTab({ items, onAction }: { items: Deposit[]; onAction: () => void }) {
  const [pending, startTransition] = useTransition()

  function act(id: number, kind: "approve" | "reject") {
    startTransition(async () => {
      const [d] = items.filter((x) => x.id === id)
      const res =
        kind === "approve"
          ? await approveDeposit(d.reference)
          : await rejectDeposit(d.reference)
      if (res.ok) toast.success(res.message)
      else toast.error(res.message)
      onAction()
    })
  }

  if (items.length === 0) return <Empty label="No deposits" />

  return (
    <div className="flex flex-col gap-3">
      {items.map((dep) => (
        <div key={dep.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold">{formatNaira(Number(dep.amount))}</p>
              <p className="text-xs text-muted-foreground">{dep.reference}</p>
            </div>
            <StatusBadge status={dep.status} />
          </div>
          <div className="mt-3 rounded-xl bg-secondary/50 p-3 text-xs">
            <p className="font-semibold">{dep.userEmail}</p>
            {dep.senderName && (
              <p className="mt-1 text-muted-foreground">
                Sender: <span className="font-medium text-foreground">{dep.senderName}</span>
              </p>
            )}
            {dep.assignedBankName && (
              <p className="mt-1 text-muted-foreground">
                To: {dep.assignedBankName} - {dep.assignedAccountNumber} ({dep.assignedAccountName})
              </p>
            )}
            <p className="mt-1 text-muted-foreground">
              {new Date(dep.createdAt).toLocaleString()}
            </p>
          </div>
          {(dep.status === "pending" || dep.status === "processing") && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => act(dep.id, "approve")}
                disabled={pending}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-success py-2.5 text-sm font-bold text-success-foreground disabled:opacity-60"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Approve
              </button>
              <button
                onClick={() => act(dep.id, "reject")}
                disabled={pending}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-destructive/40 bg-destructive/10 py-2.5 text-sm font-bold text-destructive disabled:opacity-60"
              >
                <X className="h-4 w-4" /> Reject
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function BankAccountsTab({ items }: { items: BankAccount[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({
    accountNumber: "",
    bankName: "",
    accountName: "",
    label: "",
    weight: "1",
  })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({
    accountNumber: "",
    bankName: "",
    accountName: "",
    label: "",
    weight: "1",
  })

  function handleAdd() {
    startTransition(async () => {
      const res = await addBankAccount({ ...form, weight: Number(form.weight) || 1 })
      if (res.ok) {
        toast.success(res.message)
        setForm({ accountNumber: "", bankName: "", accountName: "", label: "", weight: "1" })
        router.refresh()
      } else {
        toast.error(res.message)
      }
    })
  }

  function handleToggle(id: number) {
    startTransition(async () => {
      const res = await toggleBankAccountStatus(id)
      if (res.ok) toast.success(res.message)
      else toast.error(res.message)
      router.refresh()
    })
  }

  function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this bank account?")) return
    startTransition(async () => {
      const res = await deleteBankAccount(id)
      if (res.ok) toast.success(res.message)
      else toast.error(res.message)
      router.refresh()
    })
  }

  function startEdit(acc: BankAccount) {
    setEditingId(acc.id)
    setEditForm({
      accountNumber: acc.accountNumber,
      bankName: acc.bankName,
      accountName: acc.accountName,
      label: acc.label || "",
      weight: String(acc.weight ?? 1),
    })
  }

  function handleSaveEdit(id: number) {
    startTransition(async () => {
      const res = await updateBankAccount(id, { ...editForm, weight: Number(editForm.weight) || 1 })
      if (res.ok) {
        toast.success(res.message)
        setEditingId(null)
        router.refresh()
      } else {
        toast.error(res.message)
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Add New Account Form */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-3 flex items-center gap-2 text-sm font-bold">
          <Plus className="h-4 w-4 text-primary" /> Add Bank Account
        </p>
        <div className="flex flex-col gap-2">
          <input
            placeholder="Account Number"
            value={form.accountNumber}
            onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
            className="rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <input
            placeholder="Bank Name (e.g. Providus, VFD)"
            value={form.bankName}
            onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
            className="rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <input
            placeholder="Account Name"
            value={form.accountName}
            onChange={(e) => setForm((f) => ({ ...f, accountName: e.target.value }))}
            className="rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <input
            placeholder="Label (optional, e.g. Hussein, Praise)"
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            className="rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Display weight (higher = shown more often)
            </label>
            <input
              type="number"
              min={1}
              placeholder="1"
              value={form.weight}
              onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
              className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={pending || !form.accountNumber || !form.bankName || !form.accountName}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Add Account
          </button>
        </div>
      </div>

      {/* Bank Accounts List */}
      {items.length === 0 ? (
        <Empty label="No bank accounts yet" />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((acc) => (
            <div key={acc.id} className="rounded-2xl border border-border bg-card p-4">
              {editingId === acc.id ? (
                /* Edit Mode */
                <div className="flex flex-col gap-2">
                  <input
                    placeholder="Account Number"
                    value={editForm.accountNumber}
                    onChange={(e) => setEditForm((f) => ({ ...f, accountNumber: e.target.value }))}
                    className="rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
                  />
                  <input
                    placeholder="Bank Name"
                    value={editForm.bankName}
                    onChange={(e) => setEditForm((f) => ({ ...f, bankName: e.target.value }))}
                    className="rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
                  />
                  <input
                    placeholder="Account Name"
                    value={editForm.accountName}
                    onChange={(e) => setEditForm((f) => ({ ...f, accountName: e.target.value }))}
                    className="rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
                  />
                  <input
                    placeholder="Label (optional)"
                    value={editForm.label}
                    onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
                    className="rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
                  />
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                      Display weight (higher = shown more often)
                    </label>
                    <input
                      type="number"
                      min={1}
                      placeholder="1"
                      value={editForm.weight}
                      onChange={(e) => setEditForm((f) => ({ ...f, weight: e.target.value }))}
                      className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex-1 rounded-xl border border-border bg-secondary py-2.5 text-sm font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveEdit(acc.id)}
                      disabled={pending}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
                    >
                      {pending && <Loader2 className="h-4 w-4 animate-spin" />} Save
                    </button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Building2 className={`h-5 w-5 ${acc.isActive ? "text-success" : "text-muted-foreground"}`} />
                      <div>
                        <p className="font-bold">{acc.accountNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {acc.bankName} - {acc.accountName}
                        </p>
                        {acc.label && (
                          <p className="text-xs text-primary">{acc.label}</p>
                        )}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                        acc.isActive
                          ? "bg-success/15 text-success"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {acc.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between rounded-xl bg-secondary/50 p-3">
                    <div className="text-xs">
                      <span className="text-muted-foreground">Deposits: </span>
                      <span className="font-bold">{acc.depositCount}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <Star className="h-3.5 w-3.5 text-primary" />
                      <span className="text-muted-foreground">Weight: </span>
                      <span className="font-bold text-primary">{acc.weight ?? 1}</span>
                    </div>
                    <div className="text-xs">
                      <span className="text-muted-foreground">Total: </span>
                      <span className="font-bold text-success">{formatNaira(Number(acc.totalDeposits))}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleToggle(acc.id)}
                      disabled={pending}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold disabled:opacity-60 ${
                        acc.isActive
                          ? "border border-amber-400/40 bg-amber-400/10 text-amber-400"
                          : "bg-success text-success-foreground"
                      }`}
                    >
                      {acc.isActive ? (
                        <>
                          <ToggleLeft className="h-4 w-4" /> Deactivate
                        </>
                      ) : (
                        <>
                          <ToggleRight className="h-4 w-4" /> Activate
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => startEdit(acc)}
                      disabled={pending}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm font-bold disabled:opacity-60"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(acc.id)}
                      disabled={pending}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm font-bold text-destructive disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MilestonesTab({ items }: { items: Milestone[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({ referralCount: "", rewardAmount: "" })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ referralCount: "", rewardAmount: "" })

  function handleCreate() {
    startTransition(async () => {
      const res = await createMilestone({
        referralCount: Number(form.referralCount),
        rewardAmount: Number(form.rewardAmount),
      })
      if (res.ok) {
        toast.success(res.message)
        setForm({ referralCount: "", rewardAmount: "" })
        router.refresh()
      } else {
        toast.error(res.message)
      }
    })
  }

  function handleToggle(id: number) {
    startTransition(async () => {
      const res = await toggleMilestoneStatus(id)
      if (res.ok) toast.success(res.message)
      else toast.error(res.message)
      router.refresh()
    })
  }

  function handleDelete(id: number) {
    if (!confirm("Delete this milestone?")) return
    startTransition(async () => {
      const res = await deleteMilestone(id)
      if (res.ok) toast.success(res.message)
      else toast.error(res.message)
      router.refresh()
    })
  }

  function startEdit(m: Milestone) {
    setEditingId(m.id)
    setEditForm({ referralCount: String(m.referralCount), rewardAmount: m.rewardAmount })
  }

  function handleSaveEdit(id: number) {
    startTransition(async () => {
      const res = await updateMilestone(id, {
        referralCount: Number(editForm.referralCount),
        rewardAmount: Number(editForm.rewardAmount),
      })
      if (res.ok) {
        toast.success(res.message)
        setEditingId(null)
        router.refresh()
      } else {
        toast.error(res.message)
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4">
        <p className="flex items-center gap-2 text-sm font-bold text-amber-400">
          <Trophy className="h-4 w-4" /> Referral Milestones
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Set bonus rewards for users who reach referral goals. E.g., 10 referrals = 5k bonus.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="mb-3 flex items-center gap-2 text-sm font-bold">
          <Plus className="h-4 w-4 text-primary" /> Create Milestone
        </p>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Referrals (e.g. 10)"
              value={form.referralCount}
              onChange={(e) => setForm((f) => ({ ...f, referralCount: e.target.value }))}
              className="flex-1 rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
            <input
              type="number"
              placeholder="Reward ₦ (e.g. 5000)"
              value={form.rewardAmount}
              onChange={(e) => setForm((f) => ({ ...f, rewardAmount: e.target.value }))}
              className="flex-1 rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={pending}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Create Milestone
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <Empty label="No milestones yet" />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((m) => (
            <div key={m.id} className="rounded-2xl border border-border bg-card p-4">
              {editingId === m.id ? (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Referral count"
                      value={editForm.referralCount}
                      onChange={(e) => setEditForm((f) => ({ ...f, referralCount: e.target.value }))}
                      className="flex-1 rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
                    />
                    <input
                      type="number"
                      placeholder="Reward amount"
                      value={editForm.rewardAmount}
                      onChange={(e) => setEditForm((f) => ({ ...f, rewardAmount: e.target.value }))}
                      className="flex-1 rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex-1 rounded-xl border border-border bg-secondary py-2.5 text-sm font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveEdit(m.id)}
                      disabled={pending}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
                    >
                      {pending && <Loader2 className="h-4 w-4 animate-spin" />} Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/15">
                        <Trophy className="h-5 w-5 text-amber-400" />
                      </div>
                      <div>
                        <p className="font-bold">{m.referralCount} Referrals</p>
                        <p className="text-sm font-semibold text-success">{formatNaira(Number(m.rewardAmount))}</p>
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${m.isActive ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                      {m.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleToggle(m.id)}
                      disabled={pending}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold disabled:opacity-60 ${m.isActive ? "border border-amber-400/40 bg-amber-400/10 text-amber-400" : "bg-success text-success-foreground"}`}
                    >
                      {m.isActive ? <><ToggleLeft className="h-4 w-4" /> Deactivate</> : <><ToggleRight className="h-4 w-4" /> Activate</>}
                    </button>
                    <button onClick={() => startEdit(m)} disabled={pending} className="flex items-center justify-center rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm font-bold disabled:opacity-60">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(m.id)} disabled={pending} className="flex items-center justify-center rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm font-bold text-destructive disabled:opacity-60">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-400/15 text-amber-400",
    processing: "bg-primary/15 text-primary",
    success: "bg-success/15 text-success",
    approved: "bg-success/15 text-success",
    completed: "bg-success/15 text-success",
    rejected: "bg-destructive/15 text-destructive",
    failed: "bg-destructive/15 text-destructive",
  }
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${map[status] ?? "bg-secondary text-muted-foreground"}`}>
      {status}
    </span>
  )
}

function Empty({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
      {label}
    </div>
  )
}

// ── Games Admin Tab ───────────────────────────────────────────────────────────

type GameSubTab = "overview" | "spin" | "vault" | "draw"

function GamesAdminTab({
  spins, vaults, drawSlots, drawRounds, gameStats, onAction,
}: {
  spins: SpinRow[]
  vaults: VaultRow[]
  drawSlots: DrawSlotRow[]
  drawRounds: DrawRound[]
  gameStats: GameStats
  onAction: () => void
}) {
  const [sub, setSub] = useState<GameSubTab>("overview")
  const [pending, startTransition] = useTransition()
  const [spinFilter, setSpinFilter] = useState<"all" | "win" | "lose">("all")
  const [vaultFilter, setVaultFilter] = useState<"all" | "locked" | "completed" | "broken">("all")
  const [houseEdge, setHouseEdge] = useState(String(SITE.stakeHouseEdge * 100))
  const [slotCost, setSlotCost] = useState(String(SITE.luckyDrawSlotCost))

  const SUB_TABS: { id: GameSubTab; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "spin", label: "Stake & Spin", icon: Dices },
    { id: "vault", label: "Lock Vault", icon: Lock },
    { id: "draw", label: "Lucky Draw", icon: Ticket },
  ]

  const filteredSpins = spins.filter((s) => spinFilter === "all" || s.outcome === spinFilter)
  const filteredVaults = vaults.filter((v) => vaultFilter === "all" || v.status === vaultFilter)

  return (
    <div className="flex flex-col gap-4">
      {/* Sub-tab switcher */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSub(t.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
              sub === t.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {sub === "overview" && (
        <div className="flex flex-col gap-4">
          {/* Stake & Spin stats */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Dices className="h-4 w-4 text-primary" />
              <p className="font-bold">Stake &amp; Spin</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Total Spins", value: gameStats.spin.total.toString() },
                { label: "Win Rate", value: `${gameStats.spin.winRate}%` },
                { label: "Total Staked", value: `₦${gameStats.spin.totalStaked.toLocaleString()}` },
                { label: "Total Paid Out", value: `₦${gameStats.spin.totalPaidOut.toLocaleString()}` },
                { label: "House Profit", value: `₦${gameStats.spin.houseProfit.toLocaleString()}`, highlight: true },
                { label: "Wins / Losses", value: `${gameStats.spin.wins} / ${gameStats.spin.losses}` },
              ].map((c) => (
                <div key={c.label} className="rounded-xl bg-secondary/60 p-3">
                  <p className={`font-mono text-base font-bold ${c.highlight ? "text-success" : ""}`}>{c.value}</p>
                  <p className="text-[10px] text-muted-foreground">{c.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Lock Vault stats */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              <p className="font-bold">Lock Vault</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Total Vaults", value: gameStats.vault.total.toString() },
                { label: "Active", value: gameStats.vault.active.toString() },
                { label: "Total Locked", value: `₦${gameStats.vault.totalLocked.toLocaleString()}` },
              ].map((c) => (
                <div key={c.label} className="rounded-xl bg-secondary/60 p-3 text-center">
                  <p className="font-mono text-base font-bold">{c.value}</p>
                  <p className="text-[10px] text-muted-foreground">{c.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Lucky Draw stats */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Ticket className="h-4 w-4 text-primary" />
              <p className="font-bold">Lucky Draw</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Total Slots", value: gameStats.draw.totalSlots.toString() },
                { label: "Paid Slots", value: gameStats.draw.paidSlots.toString() },
                { label: "Slot Revenue", value: `₦${gameStats.draw.revenue.toLocaleString()}` },
              ].map((c) => (
                <div key={c.label} className="rounded-xl bg-secondary/60 p-3 text-center">
                  <p className="font-mono text-base font-bold">{c.value}</p>
                  <p className="text-[10px] text-muted-foreground">{c.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Config display (read-only — edit in plans.ts) */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-3 font-bold">Current Config</p>
            <div className="flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">House Edge (Spin)</span>
                <span className="font-mono font-bold">{SITE.stakeHouseEdge * 100}% lose chance</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stake Range</span>
                <span className="font-mono font-bold">₦{SITE.stakeMin.toLocaleString()} – ₦{SITE.stakeMax.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Multipliers</span>
                <span className="font-mono font-bold">{SITE.stakeMultipliers.join("x, ")}x</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Slot Cost</span>
                <span className="font-mono font-bold">₦{SITE.luckyDrawSlotCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vault Tiers</span>
                <span className="font-mono font-bold">
                  {SITE.vaultTiers.map((t) => `${t.days}d/+${t.bonusPercent}%`).join(", ")}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Stake & Spin History ── */}
      {sub === "spin" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">{filteredSpins.length} records</p>
            <div className="flex gap-1.5">
              {(["all", "win", "lose"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setSpinFilter(f)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${
                    spinFilter === f ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {f === "all" ? `All (${spins.length})` : f === "win" ? `Win (${spins.filter((s) => s.outcome === "win").length})` : `Lose (${spins.filter((s) => s.outcome === "lose").length})`}
                </button>
              ))}
            </div>
          </div>

          {filteredSpins.length === 0 && <Empty label="No spin records" />}
          {filteredSpins.map((s) => (
            <div key={s.id} className="rounded-xl border border-border bg-card px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">{s.userEmail ?? s.userId}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Staked ₦{Number(s.stakeAmount).toLocaleString()} · {new Date(s.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
                  s.outcome === "win"
                    ? "bg-success/20 text-success"
                    : "bg-destructive/20 text-destructive"
                }`}>
                  {s.outcome === "win" ? `+₦${Number(s.winAmount).toLocaleString()} (${s.multiplier}x)` : `-₦${Number(s.stakeAmount).toLocaleString()}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Lock Vault History ── */}
      {sub === "vault" && (
        <div className="flex flex-col gap-3">
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {(["all", "locked", "completed", "broken"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setVaultFilter(f)}
                className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${
                  vaultFilter === f ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"
                }`}
              >
                {f} ({f === "all" ? vaults.length : vaults.filter((v) => v.status === f).length})
              </button>
            ))}
          </div>

          {filteredVaults.length === 0 && <Empty label="No vault records" />}
          {filteredVaults.map((v) => {
            const unlockDate = new Date(v.unlocksAt)
            const matured = new Date() >= unlockDate
            return (
              <div key={v.id} className="rounded-xl border border-border bg-card p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{v.userEmail ?? v.userId}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {v.lockDays} days · Created {new Date(v.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={v.status === "locked" ? (matured ? "approved" : "pending") : v.status === "completed" ? "approved" : "rejected"} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-secondary/50 p-2">
                    <p className="font-mono text-sm font-bold">₦{Number(v.amount).toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">Locked</p>
                  </div>
                  <div className="rounded-lg bg-secondary/50 p-2">
                    <p className="font-mono text-sm font-bold text-success">+₦{Number(v.bonusAmount).toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">Bonus ({v.bonusPercent}%)</p>
                  </div>
                  <div className="rounded-lg bg-secondary/50 p-2">
                    <p className={`text-xs font-bold ${matured && v.status === "locked" ? "text-success" : "text-muted-foreground"}`}>
                      {v.status === "locked" ? (matured ? "Matured" : unlockDate.toLocaleDateString()) : v.status}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Unlocks</p>
                  </div>
                </div>
                {v.penaltyAmount && (
                  <p className="mt-2 text-xs text-destructive">Penalty: ₦{Number(v.penaltyAmount).toLocaleString()}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Lucky Draw Slots & Rounds ── */}
      {sub === "draw" && (
        <div className="flex flex-col gap-4">
          {/* Rounds */}
          <p className="text-sm font-bold">Draw Rounds</p>
          {drawRounds.length === 0 && <Empty label="No draw rounds yet" />}
          {drawRounds.map((r) => (
            <div key={r.id} className="rounded-xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-bold">{r.drawDate}</p>
                <StatusBadge status={r.status === "drawn" ? "completed" : "pending"} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg bg-secondary/50 p-2">
                  <p className="font-mono text-sm font-bold">₦{Number(r.prizePool).toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">Prize Pool</p>
                </div>
                <div className="rounded-lg bg-secondary/50 p-2">
                  <p className="font-mono text-sm font-bold">
                    {drawSlots.filter((s) => s.drawDate === r.drawDate).length}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Slots Entered</p>
                </div>
              </div>
              {r.status === "drawn" && (
                <div className="mt-2 rounded-lg border border-success/20 bg-success/10 px-3 py-2">
                  <p className="text-xs font-bold text-success">Winners paid</p>
                  {[r.winner1Id, r.winner2Id, r.winner3Id].filter(Boolean).map((uid, i) => (
                    <p key={uid} className="mt-0.5 text-[11px] text-muted-foreground">
                      {i + 1}. {uid}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Slot entries */}
          <p className="text-sm font-bold">All Slot Entries ({drawSlots.length})</p>
          {drawSlots.length === 0 && <Empty label="No slots purchased yet" />}
          {drawSlots.slice(0, 100).map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold">{s.userEmail ?? s.userId}</p>
                <p className="text-[11px] text-muted-foreground">{s.drawDate} · {s.source}</p>
              </div>
              <div className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
                s.source === "purchased" ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"
              }`}>
                {s.source === "purchased" ? `₦${Number(s.purchaseAmount).toLocaleString()}` : "Free"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Financials Tab ────────────────────────────────────────────────────────────
function FinancialsTab({ data }: { data: Financials }) {
  const cards = [
    { label: "Withdrawal Charges (Revenue)", value: data.withdrawalCharges, color: "text-success" },
    { label: "Total Approved Payouts", value: data.totalPayouts, color: "text-destructive" },
    { label: "Pending Payouts", value: data.pendingPayouts, color: "text-amber-400" },
    { label: "Total Deposits Received", value: data.totalDeposits, color: "text-primary" },
    { label: "Active Investment Volume", value: data.activeInvestmentVolume, color: "text-primary" },
    { label: "Platform Total Earned (all wallets)", value: data.platformTotalEarned, color: "text-muted-foreground" },
    { label: "Platform Total Withdrawn (all wallets)", value: data.platformTotalWithdrawn, color: "text-muted-foreground" },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 rounded-2xl border border-success/30 bg-success/10 p-4">
        <BarChart3 className="h-5 w-5 text-success" />
        <div>
          <p className="text-xs font-bold text-muted-foreground">Platform Revenue (Charges Collected)</p>
          <p className="font-mono text-2xl font-black text-success">
            ₦{data.platformRevenue.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-1 text-[11px] text-muted-foreground leading-tight">{c.label}</p>
            <p className={`font-mono text-lg font-bold ${c.color}`}>
              ₦{c.value.toLocaleString()}
            </p>
          </div>
        ))}
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-1 text-[11px] text-muted-foreground">Active Investments</p>
          <p className="font-mono text-lg font-bold text-primary">{data.activeInvestments}</p>
        </div>
      </div>
    </div>
  )
}

// ── Investments Tab ───────────────────────────────────────────────────────────
function InvestmentsTab({ items, onAction }: { items: InvestmentRow[]; onAction: () => void }) {
  const [pending, startTransition] = useTransition()
  const [extendId, setExtendId] = useState<number | null>(null)
  const [extendDays, setExtendDays] = useState(7)
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "completed" | "cancelled">("active")

  const filtered = items.filter((i) => filterStatus === "all" || i.status === filterStatus)

  const handleCancel = (id: number) => {
    if (!confirm("Cancel this investment? Unearned principal will be refunded.")) return
    startTransition(async () => {
      const res = await adminCancelInvestment(id)
      toast[res.ok ? "success" : "error"](res.message)
      onAction()
    })
  }

  const handleDelete = (id: number) => {
    if (!confirm("Remove this investment record entirely?")) return
    startTransition(async () => {
      const res = await adminDeleteInvestment(id)
      toast[res.ok ? "success" : "error"](res.message)
      onAction()
    })
  }

  const handleExtend = (id: number) => {
    startTransition(async () => {
      const res = await adminExtendInvestment(id, extendDays)
      toast[res.ok ? "success" : "error"](res.message)
      setExtendId(null)
      onAction()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {(["all", "active", "completed", "cancelled"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold capitalize transition-all ${
              filterStatus === s
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground"
            }`}
          >
            {s} ({s === "all" ? items.length : items.filter((i) => i.status === s).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 && <Empty label="No investments found" />}

      {filtered.map((inv) => {
        const progress = inv.durationDays > 0 ? Math.min(100, (inv.daysPaid / inv.durationDays) * 100) : 0
        return (
          <div key={inv.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold">{inv.planName}</p>
                <p className="truncate text-xs text-muted-foreground">{inv.userEmail}</p>
              </div>
              <StatusBadge status={inv.status} />
            </div>

            <div className="mb-3 grid grid-cols-3 gap-2">
              {[
                { label: "Invested", value: `₦${Number(inv.price).toLocaleString()}` },
                { label: "Earned", value: `₦${Number(inv.amountEarned).toLocaleString()}` },
                { label: "Daily", value: `₦${Number(inv.dailyEarning).toLocaleString()}` },
              ].map((f) => (
                <div key={f.label} className="rounded-xl bg-secondary/50 p-2 text-center">
                  <p className="font-mono text-sm font-bold">{f.value}</p>
                  <p className="text-[10px] text-muted-foreground">{f.label}</p>
                </div>
              ))}
            </div>

            {/* Progress */}
            <div className="mb-3">
              <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
                <span>Day {inv.daysPaid} of {inv.durationDays}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {inv.status === "active" && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleCancel(inv.id)}
                  disabled={pending}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-amber-400/30 bg-amber-400/10 py-2 text-xs font-bold text-amber-400 disabled:opacity-60"
                >
                  <Ban className="h-3.5 w-3.5" /> Cancel
                </button>
                <button
                  onClick={() => setExtendId(extendId === inv.id ? null : inv.id)}
                  disabled={pending}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 py-2 text-xs font-bold text-primary disabled:opacity-60"
                >
                  <CalendarPlus className="h-3.5 w-3.5" /> Extend
                </button>
                <button
                  onClick={() => handleDelete(inv.id)}
                  disabled={pending}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/10 py-2 text-xs font-bold text-destructive disabled:opacity-60"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            )}

            {extendId === inv.id && (
              <div className="mt-3 flex gap-2">
                <select
                  value={extendDays}
                  onChange={(e) => setExtendDays(Number(e.target.value))}
                  className="flex-1 rounded-xl border border-border bg-secondary px-3 py-2 text-sm"
                >
                  {[3, 7, 14, 30].map((d) => (
                    <option key={d} value={d}>{d} days</option>
                  ))}
                </select>
                <button
                  onClick={() => handleExtend(inv.id)}
                  disabled={pending}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-60"
                >
                  {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirm"}
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Lucky Draw Admin Tab ──────────────────────────────────────────────────────
function LuckyDrawTab({ rounds, onAction }: { rounds: DrawRound[]; onAction: () => void }) {
  const [pending, startTransition] = useTransition()

  const handleDraw = (drawDate: string) => {
    if (!confirm(`Execute the Lucky Draw for ${drawDate}? This cannot be undone.`)) return
    startTransition(async () => {
      const res = await executeLuckyDraw(drawDate)
      toast[res.ok ? "success" : "error"](res.message)
      onAction()
    })
  }

  const today = new Date().toISOString().slice(0, 10)
  const todayRound = rounds.find((r) => r.drawDate === today)

  return (
    <div className="flex flex-col gap-4">
      {/* Today's round */}
      <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Ticket className="h-5 w-5 text-primary" />
          <p className="font-bold text-primary">Today&apos;s Draw ({today})</p>
        </div>
        {todayRound ? (
          <div>
            <div className="mb-3 flex gap-3">
              <div className="flex-1 rounded-xl bg-background/60 p-3 text-center">
                <p className="font-mono text-lg font-bold">₦{Number(todayRound.prizePool).toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Prize Pool</p>
              </div>
              <div className="flex-1 rounded-xl bg-background/60 p-3 text-center">
                <p className={`font-bold ${todayRound.status === "drawn" ? "text-success" : "text-amber-400"}`}>
                  {todayRound.status === "drawn" ? "Drawn" : "Open"}
                </p>
                <p className="text-[10px] text-muted-foreground">Status</p>
              </div>
            </div>
            {todayRound.status !== "drawn" && (
              <button
                onClick={() => handleDraw(today)}
                disabled={pending}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck className="h-4 w-4" />}
                Execute Draw
              </button>
            )}
            {todayRound.status === "drawn" && (
              <div className="rounded-xl border border-success/30 bg-success/10 p-3 text-center">
                <p className="text-xs font-bold text-success">Draw complete. Winners have been paid.</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No entries yet for today. Users need to enter slots first.
          </p>
        )}
      </div>

      {/* History */}
      <p className="text-sm font-bold">Draw History</p>
      {rounds.length === 0 && <Empty label="No draws yet" />}
      {rounds.map((r) => (
        <div key={r.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
          <div>
            <p className="text-sm font-bold">{r.drawDate}</p>
            <p className="text-xs text-muted-foreground">Pool: ₦{Number(r.prizePool).toLocaleString()}</p>
          </div>
          <StatusBadge status={r.status === "drawn" ? "completed" : "pending"} />
        </div>
      ))}
    </div>
  )
}
