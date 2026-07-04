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
  ChevronDown,
  Zap,
  Unlock,
  Download,
} from "lucide-react"
import { toast } from "sonner"
import { SITE, formatNaira, PLANS } from "@/lib/plans"
import {
  listPromoterSalaries,
  setPromoterSalary,
  togglePromoterSalary,
  payPromoterSalary,
  payAllSalaries,
  removePromoterSalary,
  syncAutoPromoters,
} from "@/app/actions/salary"
import { saveSalaryConfig } from "@/app/actions/settings"
import { listPromos, createPromo, togglePromo, deletePromo } from "@/app/actions/promos"
import {
  adminGetTasks,
  adminCreateTask,
  adminUpdateTask,
  adminSetTaskStatus,
  adminGetSubmissions,
  adminApproveSubmission,
  adminRejectSubmission,
} from "@/app/actions/tasks"

import {
  approveWithdrawal,
  rejectWithdrawal,
  adjustBalance,
  clearUserBalance,
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
  setSiteFrozen,
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
  getDrawSlotUsers,
  getAdminReferralsForUser,
  testSabussWebhook,
  adminCheckDeposit,
  adminDeleteTransaction,
  saveDepositWithdrawalLimits,
  saveGameConfig,
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
  referredByName: string | null
}

type ReferralDetail = {
  referralId: number
  referredId: string
  name: string
  email: string
  totalDeposited: string
  hasDeposited: boolean
  balance: string
  commissionEarned: string
  joinedAt: Date | string
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
  userId: string | null
  senderName: string | null
  assignedBankName: string | null
  assignedAccountNumber: string | null
  assignedAccountName: string | null
  bankAccountId: number | null
  expiresAt: Date | string | null
  sabussRef: string | null
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
  sabussApiKey: string | null
  sabussPin: string | null
  createdAt: Date | string
}

type Milestone = {
  id: number
  referralCount: number
  rewardAmount: string
  isActive: boolean
}

  type Controls = {
    siteFrozen: boolean
    depositsPaused: boolean
    withdrawalsPaused: boolean
    minDeposit: number
    minWithdrawal: number
    withdrawalCharge: number
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
  "Investments",
  "Transactions",
  "Withdrawals",
  "Users",
  "Salary",
  "Promotions",
  "Gift Codes",
  "Promoter Codes",
  "Deposits",
  "Bank Accounts",
  "Milestones",
  "Tasks",
  "Game Config",
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

type GameConfig = {
  withdrawalCharge: number
  stakeHouseEdge: number
  stakeMin: number
  stakeMax: number
  stakeMultipliers: number[]
  luckyDrawSlotCost: number
  vaultTiers: { days: number; bonusPercent: number; penaltyPercent: number }[]
  vaultMin: number
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
  isModerator?: boolean
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
  gameConfig: GameConfig
}

export function AdminDashboard(initial: AdminData) {
  const isModerator = initial.isModerator ?? false
  const [data, setData] = useState<AdminData>(initial)
  const [tab, setTab] = useState<Tab>("Overview")
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Set initial timestamp only on the client to prevent SSR/hydration mismatch
  useEffect(() => { setLastUpdated(new Date()) }, [])

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

  const { stats, withdrawals, users, giftCodes, deposits, bankAccounts, milestones, controls, transactions, promoterCodes, investments, financials, drawRounds } = data

  return (
    <div className="min-h-screen pb-10">
      <header className="sticky top-0 z-30 border-b-2 border-ink bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Admin Console</h1>
            <p className="text-xs text-muted-foreground">
              {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "Loading..."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refresh(true)}
              disabled={refreshing}
              className="flex h-9 items-center gap-1.5 rounded-full border-2 border-ink bg-secondary px-3 text-xs font-semibold text-muted-foreground disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Loading..." : "Refresh"}
            </button>
            <Link
              href="/dashboard"
              className="flex h-9 items-center gap-1.5 rounded-full border-2 border-ink bg-secondary px-3 text-xs font-semibold text-muted-foreground"
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
                tab === t ? "bg-primary text-primary-foreground" : "border-2 border-ink bg-card text-muted-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "Overview" && <Overview stats={stats} controls={controls} isModerator={isModerator} onAction={() => refresh()} />}
        {tab === "Financials" && <FinancialsTab data={financials} />}
        {tab === "Investments" && <InvestmentsTab items={investments} isModerator={isModerator} onAction={() => refresh()} />}
        {tab === "Transactions" && <TransactionsTab items={transactions} isModerator={isModerator} onAction={() => refresh()} />}
        {tab === "Withdrawals" && <Withdrawals items={withdrawals} onAction={() => refresh()} />}
        {tab === "Users" && <UsersTab items={users} isModerator={isModerator} />}
        {tab === "Salary" && <SalariesTab />}
        {tab === "Promotions" && <PromotionsTab />}
        {tab === "Gift Codes" && <GiftCodesTab items={giftCodes} isModerator={isModerator} />}
        {tab === "Promoter Codes" && <PromoterCodesTab items={promoterCodes} onAction={() => refresh()} />}
        {tab === "Deposits" && <DepositsTab items={deposits} onAction={() => refresh()} />}
        {tab === "Bank Accounts" && <BankAccountsTab items={bankAccounts} />}
        {tab === "Milestones" && <MilestonesTab items={milestones} isModerator={isModerator} />}
        {tab === "Tasks" && <TasksTab />}
        {tab === "Game Config" && <GameConfigTab />}
      </div>
    </div>
  )
}

// ─── Game Config Tab ─────────────────────────────────────────────────────────

type GameCfg = {
  spinPrizes: { amount: number; weight: number }[]
  scratchPrizes: { amount: number; weight: number }[]
  scratchCardsPerReferral: number
  luckyDrawSlotCost: number
  luckyDrawPrizeShares: number[]
  gamePlaysPerInvestment: number
  gamePlaysPerReferral: number
}
type SpinPrize = { amount: number; weight: number }

function GameConfigTab() {
  const [pending, startTransition] = useTransition()
  const [loading, setLoading] = useState(true)

  // Spin prizes
  const [prizes, setPrizes] = useState<SpinPrize[]>([])

  // Scratch card prizes
  const [scratchPrizes, setScratchPrizes] = useState<SpinPrize[]>([])
  const [scratchPerReferral, setScratchPerReferral] = useState("1")

  // Lucky Draw
  const [slotCost, setSlotCost] = useState("200")
  const [share1, setShare1] = useState("50")
  const [share2, setShare2] = useState("30")
  const [share3, setShare3] = useState("20")

  // Plays per action
  const [playsPerInvest, setPlaysPerInvest] = useState("1")
  const [playsPerReferral, setPlaysPerReferral] = useState("1")

  useEffect(() => {
    fetch("/api/game-config")
      .then((r) => r.json())
      .then((cfg: GameCfg) => {
        setPrizes(cfg.spinPrizes)
        setScratchPrizes(cfg.scratchPrizes ?? [])
        setScratchPerReferral(String(cfg.scratchCardsPerReferral ?? 1))
        setSlotCost(String(cfg.luckyDrawSlotCost))
        const [s1 = 0.5, s2 = 0.3] = cfg.luckyDrawPrizeShares
        setShare1(String(Math.round(s1 * 100)))
        setShare2(String(Math.round(s2 * 100)))
        setPlaysPerInvest(String(cfg.gamePlaysPerInvestment))
        setPlaysPerReferral(String(cfg.gamePlaysPerReferral))
        setLoading(false)
      })
  }, [])

  const addPrize = () => setPrizes((p) => [...p, { amount: 0, weight: 10 }])
  const removePrize = (i: number) => setPrizes((p) => p.filter((_, idx) => idx !== i))
  const updatePrize = (i: number, key: keyof SpinPrize, val: string) =>
    setPrizes((p) => p.map((prize, idx) => idx === i ? { ...prize, [key]: Number(val) } : prize))

  const totalWeight = prizes.reduce((s, p) => s + p.weight, 0)

  const addScratch = () => setScratchPrizes((p) => [...p, { amount: 0, weight: 10 }])
  const removeScratch = (i: number) => setScratchPrizes((p) => p.filter((_, idx) => idx !== i))
  const updateScratch = (i: number, key: keyof SpinPrize, val: string) =>
    setScratchPrizes((p) => p.map((prize, idx) => idx === i ? { ...prize, [key]: Number(val) } : prize))

  const totalScratchWeight = scratchPrizes.reduce((s, p) => s + p.weight, 0)

  function handleSave() {
    const s1 = Number(share1) / 100
    const s2 = Number(share2) / 100
    const s3 = 1 - s1 - s2
    if (s3 < 0 || s1 + s2 > 1) {
      toast.error("Prize shares must add up to 100%")
      return
    }
    startTransition(async () => {
      await fetch("/api/game-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spinPrizes: prizes,
          scratchPrizes: scratchPrizes,
          scratchCardsPerReferral: Number(scratchPerReferral),
          luckyDrawSlotCost: Number(slotCost),
          luckyDrawPrizeShares: [s1, s2, parseFloat(s3.toFixed(4))],
          gamePlaysPerInvestment: Number(playsPerInvest),
          gamePlaysPerReferral: Number(playsPerReferral),
        }),
      })
      toast.success("Game config saved — changes are live immediately")
    })
  }

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  }

  const fieldCls = "w-full rounded-xl border-2 border-ink bg-card px-3 py-2.5 text-sm font-semibold focus:outline-none"
  const labelCls = "mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground"

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-base font-black">Game Config</h2>

      {/* ── Slot machine prizes ─────────────────────��──────── */}
      <section className="rounded-2xl border-2 border-ink bg-card p-4 shadow-[3px_3px_0_0_var(--ink)]">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-black">Lucky Roulette — Spin Prizes</p>
          <button
            onClick={addPrize}
            className="flex items-center gap-1 rounded-lg border-2 border-ink bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
          >
            <Plus className="h-3 w-3" /> Add Prize
          </button>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Amount = reward in naira (0 = no win). Weight = probability (higher = more likely). Total weight: <strong>{totalWeight}</strong>
        </p>

        <div className="flex flex-col gap-2">
          {prizes.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex-1">
                <label className={labelCls}>Amount (₦)</label>
                <input
                  type="number"
                  value={p.amount}
                  onChange={(e) => updatePrize(i, "amount", e.target.value)}
                  className={fieldCls}
                  min={0}
                />
              </div>
              <div className="w-24">
                <label className={labelCls}>Weight</label>
                <input
                  type="number"
                  value={p.weight}
                  onChange={(e) => updatePrize(i, "weight", e.target.value)}
                  className={fieldCls}
                  min={1}
                />
              </div>
              <div className="w-24 text-right">
                <label className={labelCls}>Chance</label>
                <p className="pt-2.5 text-sm font-bold text-muted-foreground">
                  {totalWeight > 0 ? ((p.weight / totalWeight) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <button
                onClick={() => removePrize(i)}
                className="mt-5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-ink bg-destructive/10 text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Scratch Card prizes ────────────────────────────── */}
      <section className="rounded-2xl border-2 border-ink bg-card p-4 shadow-[3px_3px_0_0_var(--ink)]">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-black">Scratch Card — Prizes</p>
          <button
            onClick={addScratch}
            className="flex items-center gap-1 rounded-lg border-2 border-ink bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
          >
            <Plus className="h-3 w-3" /> Add Prize
          </button>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Amount = reward in naira (0 = no win). Weight = probability (higher = more likely). Total weight: <strong>{totalScratchWeight}</strong>
        </p>

        <div className="mb-4">
          <label className={labelCls}>Scratch cards earned per referral</label>
          <input
            type="number"
            value={scratchPerReferral}
            onChange={(e) => setScratchPerReferral(e.target.value)}
            className={fieldCls}
            min={0}
          />
        </div>

        <div className="flex flex-col gap-2">
          {scratchPrizes.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex-1">
                <label className={labelCls}>Amount (₦)</label>
                <input
                  type="number"
                  value={p.amount}
                  onChange={(e) => updateScratch(i, "amount", e.target.value)}
                  className={fieldCls}
                  min={0}
                />
              </div>
              <div className="w-24">
                <label className={labelCls}>Weight</label>
                <input
                  type="number"
                  value={p.weight}
                  onChange={(e) => updateScratch(i, "weight", e.target.value)}
                  className={fieldCls}
                  min={1}
                />
              </div>
              <div className="w-24 text-right">
                <label className={labelCls}>Chance</label>
                <p className="pt-2.5 text-sm font-bold text-muted-foreground">
                  {totalScratchWeight > 0 ? ((p.weight / totalScratchWeight) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <button
                onClick={() => removeScratch(i)}
                className="mt-5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-ink bg-destructive/10 text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Lucky Draw config ──────────────────────────────── */}
      <section className="rounded-2xl border-2 border-ink bg-card p-4 shadow-[3px_3px_0_0_var(--ink)]">
        <p className="mb-3 font-black">Lucky Draw</p>

        <label className={labelCls}>Pool contribution per slot (₦)</label>
        <input type="number" value={slotCost} onChange={(e) => setSlotCost(e.target.value)} className={`${fieldCls} mb-4`} min={0} />

        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Prize shares — must add to 100%
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "1st Place %", val: share1, set: setShare1 },
            { label: "2nd Place %", val: share2, set: setShare2 },
            { label: "3rd (auto)", val: String(Math.max(0, 100 - Number(share1) - Number(share2))), set: () => {} },
          ].map(({ label, val, set }) => (
            <div key={label}>
              <label className={labelCls}>{label}</label>
              <input
                type="number"
                value={val}
                onChange={(e) => set(e.target.value)}
                className={fieldCls}
                min={0}
                max={100}
                readOnly={label === "3rd (auto)"}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── Plays per action ──────────────────────────────── */}
      <section className="rounded-2xl border-2 border-ink bg-card p-4 shadow-[3px_3px_0_0_var(--ink)]">
        <p className="mb-3 font-black">Plays Earned</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Spins per investment</label>
            <input type="number" value={playsPerInvest} onChange={(e) => setPlaysPerInvest(e.target.value)} className={fieldCls} min={0} />
          </div>
          <div>
            <label className={labelCls}>Spins per referral</label>
            <input type="number" value={playsPerReferral} onChange={(e) => setPlaysPerReferral(e.target.value)} className={fieldCls} min={0} />
          </div>
        </div>
      </section>

      <button
        onClick={handleSave}
        disabled={pending}
        className="w-full rounded-2xl border-2 border-ink bg-primary py-4 text-sm font-black uppercase tracking-wide text-primary-foreground shadow-[4px_4px_0_0_var(--ink)] disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save Game Config"}
      </button>
    </div>
  )
}

// ─── Tasks Tab ────────────────────────────────────────────────────────────────

type AdminTask = Awaited<ReturnType<typeof adminGetTasks>>[number]

function TasksTab() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [tasks, setTasks] = useState<AdminTask[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<AdminTask | null>(null)
  const [view, setView] = useState<"tasks" | "review">("tasks")

  // Form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    imageUrl: "",
    reward: "",
    rewardSpins: "0",
    rewardScratch: "0",
    taskType: "rating",
    fields: "Location,Service,Value",
    perUserLimit: "1",
    targetType: "all" as "all" | "tier" | "plan",
    targetValue: "",
    requireProof: false,
    proofLabel: "",
    requireApproval: true,
  })

  const load = useCallback(async () => {
    setLoading(true)
    const data = await adminGetTasks()
    setTasks(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setForm({
      title: "",
      description: "",
      imageUrl: "",
      reward: "",
      rewardSpins: "0",
      rewardScratch: "0",
      taskType: "rating",
      fields: "Location,Service,Value",
      perUserLimit: "1",
      targetType: "all",
      targetValue: "",
      requireProof: false,
      proofLabel: "",
      requireApproval: true,
    })
    setEditing(null)
    setCreating(true)
  }

  function openEdit(t: AdminTask) {
    setForm({
      title: t.title,
      description: t.description,
      imageUrl: t.imageUrl ?? "",
      reward: String(Number(t.reward)),
      rewardSpins: String(t.rewardSpins ?? 0),
      rewardScratch: String(t.rewardScratch ?? 0),
      taskType: t.taskType,
      fields: t.fields ? (JSON.parse(t.fields) as string[]).join(",") : "",
      perUserLimit: String(t.perUserLimit),
      targetType: (t.targetType ?? "all") as "all" | "tier" | "plan",
      targetValue: t.targetValue ?? "",
      requireProof: t.requireProof ?? false,
      proofLabel: t.proofLabel ?? "",
      requireApproval: t.requireApproval ?? true,
    })
    setEditing(t)
    setCreating(true)
  }

  function handleSave() {
    const fieldsArr = form.fields.split(",").map((s) => s.trim()).filter(Boolean)
    const common = {
      title: form.title,
      description: form.description,
      imageUrl: form.imageUrl || undefined,
      reward: Number(form.reward),
      rewardSpins: Number(form.rewardSpins) || 0,
      rewardScratch: Number(form.rewardScratch) || 0,
      taskType: form.taskType,
      fields: fieldsArr,
      perUserLimit: Number(form.perUserLimit),
      targetType: form.targetType,
      targetValue: form.targetType === "all" ? null : form.targetValue || null,
      requireProof: form.requireProof,
      proofLabel: form.requireProof ? form.proofLabel || null : null,
      requireApproval: form.requireApproval,
    }
    startTransition(async () => {
      if (editing) {
        await adminUpdateTask(editing.id, common)
        toast.success("Task updated")
      } else {
        await adminCreateTask(common)
        toast.success("Task created")
      }
      setCreating(false)
      load()
    })
  }

  function handleStatus(id: number, status: "published" | "paused" | "deleted") {
    startTransition(async () => {
      await adminSetTaskStatus(id, status)
      toast.success(`Task ${status}`)
      load()
    })
  }

  if (creating) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setCreating(false)} className="text-sm font-bold text-muted-foreground">Cancel</button>
          <h2 className="text-base font-black">{editing ? "Edit Task" : "New Task"}</h2>
        </div>

        {(() => {
          const fieldCls = "w-full rounded-xl border-2 border-ink bg-card px-3 py-2.5 text-sm font-semibold focus:outline-none"
          const labelCls = "mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground"
          return (
            <>
              {[
                { label: "Title", key: "title", type: "text", placeholder: "e.g. Rate our hotel partner" },
                { label: "Description", key: "description", type: "text", placeholder: "Describe what users need to do" },
                { label: "Image URL (optional)", key: "imageUrl", type: "text", placeholder: "https://..." },
                { label: "Cash reward (₦)", key: "reward", type: "number", placeholder: "e.g. 200" },
                { label: "Rating Fields (comma-separated)", key: "fields", type: "text", placeholder: "Location,Service,Value" },
                { label: "Max completions per user (0 = unlimited)", key: "perUserLimit", type: "number", placeholder: "1" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className={labelCls}>{label}</label>
                  <input
                    type={type}
                    value={form[key as keyof typeof form] as string}
                    onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className={fieldCls}
                  />
                </div>
              ))}

              {/* Bonus game rewards */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Bonus spins</label>
                  <input
                    type="number"
                    min={0}
                    value={form.rewardSpins}
                    onChange={(e) => setForm((p) => ({ ...p, rewardSpins: e.target.value }))}
                    className={fieldCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Bonus scratch cards</label>
                  <input
                    type="number"
                    min={0}
                    value={form.rewardScratch}
                    onChange={(e) => setForm((p) => ({ ...p, rewardScratch: e.target.value }))}
                    className={fieldCls}
                  />
                </div>
              </div>

              {/* Targeting */}
              <div>
                <label className={labelCls}>Who can see this task?</label>
                <select
                  value={form.targetType}
                  onChange={(e) => setForm((p) => ({ ...p, targetType: e.target.value as "all" | "tier" | "plan", targetValue: "" }))}
                  className={fieldCls}
                >
                  <option value="all">Everyone</option>
                  <option value="tier">Specific withdrawal tier</option>
                  <option value="plan">Holders of a specific package</option>
                </select>
              </div>
              {form.targetType === "tier" && (
                <div>
                  <label className={labelCls}>Tier</label>
                  <select
                    value={form.targetValue}
                    onChange={(e) => setForm((p) => ({ ...p, targetValue: e.target.value }))}
                    className={fieldCls}
                  >
                    <option value="">Select tier…</option>
                    <option value="tier1">Tier 1 · VIP</option>
                    <option value="tier2">Tier 2</option>
                    <option value="tier3">Tier 3</option>
                  </select>
                </div>
              )}
              {form.targetType === "plan" && (
                <div>
                  <label className={labelCls}>Package</label>
                  <select
                    value={form.targetValue}
                    onChange={(e) => setForm((p) => ({ ...p, targetValue: e.target.value }))}
                    className={fieldCls}
                  >
                    <option value="">Select package…</option>
                    {PLANS.map((pl) => (
                      <option key={pl.id} value={String(pl.id)}>{pl.name} — {formatNaira(pl.price)}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Proof + approval */}
              <label className="flex items-center gap-2 rounded-xl border-2 border-ink bg-card px-3 py-2.5 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={form.requireProof}
                  onChange={(e) => setForm((p) => ({ ...p, requireProof: e.target.checked }))}
                  className="h-4 w-4 accent-primary"
                />
                Require photo/screenshot proof
              </label>
              {form.requireProof && (
                <div>
                  <label className={labelCls}>Proof label (what to upload)</label>
                  <input
                    type="text"
                    value={form.proofLabel}
                    onChange={(e) => setForm((p) => ({ ...p, proofLabel: e.target.value }))}
                    placeholder="e.g. Screenshot of your review"
                    className={fieldCls}
                  />
                </div>
              )}
              <label className="flex items-center gap-2 rounded-xl border-2 border-ink bg-card px-3 py-2.5 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={form.requireApproval}
                  onChange={(e) => setForm((p) => ({ ...p, requireApproval: e.target.checked }))}
                  className="h-4 w-4 accent-primary"
                />
                Require admin approval before rewarding
              </label>
            </>
          )
        })()}

        <button
          onClick={handleSave}
          disabled={pending || !form.title || !form.reward || (form.targetType !== "all" && !form.targetValue)}
          className="w-full rounded-xl border-2 border-ink bg-primary py-3 text-sm font-black uppercase tracking-wide text-primary-foreground shadow-[3px_3px_0_0_var(--ink)] disabled:opacity-60"
        >
          {pending ? "Saving..." : editing ? "Save Changes" : "Publish Task"}
        </button>
      </div>
    )
  }

  const totalPending = tasks.reduce((s, t) => s + (t.pendingCount ?? 0), 0)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-black">Task Center</h2>
        {view === "tasks" && (
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-xl border-2 border-ink bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-[3px_3px_0_0_var(--ink)]"
          >
            <Plus className="h-4 w-4" /> New Task
          </button>
        )}
      </div>

      {/* View switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => setView("tasks")}
          className={`flex-1 rounded-xl border-2 border-ink px-3 py-2 text-xs font-bold uppercase tracking-wide ${
            view === "tasks" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
          }`}
        >
          Tasks
        </button>
        <button
          onClick={() => setView("review")}
          className={`relative flex-1 rounded-xl border-2 border-ink px-3 py-2 text-xs font-bold uppercase tracking-wide ${
            view === "review" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
          }`}
        >
          Review Submissions
          {totalPending > 0 && (
            <span className="ml-1.5 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-black text-destructive-foreground">
              {totalPending}
            </span>
          )}
        </button>
      </div>

      {view === "review" && <TaskReviewPanel onReviewed={load} />}

      {view === "tasks" && loading && (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      )}

      {view === "tasks" && !loading && tasks.length === 0 && (
        <div className="rounded-2xl border-2 border-ink bg-card px-5 py-10 text-center text-muted-foreground">
          <p className="font-bold">No tasks yet</p>
          <p className="mt-1 text-sm">Create your first task to start earning add-ons.</p>
        </div>
      )}

      {view === "tasks" && tasks.map((t) => (
        <div
          key={t.id}
          className="rounded-2xl border-2 border-ink bg-card p-4 shadow-[3px_3px_0_0_var(--ink)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`rounded-full border border-ink px-2 py-0.5 text-[10px] font-bold uppercase ${
                  t.status === "published" ? "bg-success/20 text-success" :
                  t.status === "paused" ? "bg-gold/20 text-gold" : "bg-destructive/10 text-destructive"
                }`}>{t.status}</span>
                <span className="text-[10px] text-muted-foreground">{t.submissionCount} submissions</span>
              </div>
              <p className="mt-1.5 font-black">{t.title}</p>
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{t.description}</p>
              <p className="mt-1 text-sm font-black text-primary">{formatNaira(Number(t.reward))} reward</p>
            </div>
            {t.imageUrl && (
              <img src={t.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl border-2 border-ink object-cover" />
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => openEdit(t)}
              className="flex items-center gap-1 rounded-lg border-2 border-ink bg-secondary px-3 py-1.5 text-xs font-bold"
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
            {t.status !== "published" && (
              <button
                onClick={() => handleStatus(t.id, "published")}
                disabled={pending}
                className="flex items-center gap-1 rounded-lg border-2 border-ink bg-success/10 px-3 py-1.5 text-xs font-bold text-success disabled:opacity-60"
              >
                <Play className="h-3 w-3" /> Publish
              </button>
            )}
            {t.status === "published" && (
              <button
                onClick={() => handleStatus(t.id, "paused")}
                disabled={pending}
                className="flex items-center gap-1 rounded-lg border-2 border-ink bg-gold/10 px-3 py-1.5 text-xs font-bold text-gold disabled:opacity-60"
              >
                <Pause className="h-3 w-3" /> Pause
              </button>
            )}
            {t.status !== "deleted" && (
              <button
                onClick={() => { if (confirm("Delete this task?")) handleStatus(t.id, "deleted") }}
                disabled={pending}
                className="flex items-center gap-1 rounded-lg border-2 border-ink bg-destructive/10 px-3 py-1.5 text-xs font-bold text-destructive disabled:opacity-60"
              >
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Task Submissions Review ───────────────────────────────────────────────────

type AdminSubmission = Awaited<ReturnType<typeof adminGetSubmissions>>[number]

function TaskReviewPanel({ onReviewed }: { onReviewed: () => void }) {
  const [pending, startTransition] = useTransition()
  const [subs, setSubs] = useState<AdminSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected">("pending")
  const [preview, setPreview] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setSubs(await adminGetSubmissions(statusFilter))
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  function approve(id: number) {
    startTransition(async () => {
      const res = await adminApproveSubmission(id)
      res.ok ? toast.success(res.message) : toast.error(res.message)
      load()
      onReviewed()
    })
  }

  function reject(id: number) {
    if (!confirm("Reject this submission? The user will not be rewarded.")) return
    startTransition(async () => {
      const res = await adminRejectSubmission(id)
      res.ok ? toast.success(res.message) : toast.error(res.message)
      load()
      onReviewed()
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Status filter */}
      <div className="flex gap-2">
        {(["pending", "approved", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`flex-1 rounded-lg border-2 border-ink px-3 py-1.5 text-xs font-bold capitalize ${
              statusFilter === s ? "bg-ink text-card" : "bg-card text-muted-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      )}

      {!loading && subs.length === 0 && (
        <div className="rounded-2xl border-2 border-ink bg-card px-5 py-10 text-center text-muted-foreground">
          <p className="font-bold">No {statusFilter} submissions</p>
        </div>
      )}

      {subs.map((s) => {
        let ratings: Record<string, unknown> = {}
        try { ratings = s.data ? JSON.parse(s.data) : {} } catch {}
        return (
          <div key={s.id} className="rounded-2xl border-2 border-ink bg-card p-4 shadow-[3px_3px_0_0_var(--ink)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-black">{s.taskTitle ?? "Task"}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {s.userName ?? "Unknown"} · {s.userPhone ?? s.userEmail ?? s.userId}
                </p>
                <p className="mt-1 text-sm font-black text-primary">
                  {formatNaira(Number(s.reward))}
                  {(s.rewardSpins ?? 0) > 0 && <span className="text-foreground"> · {s.rewardSpins} spins</span>}
                  {(s.rewardScratch ?? 0) > 0 && <span className="text-foreground"> · {s.rewardScratch} cards</span>}
                </p>
                {s.submittedAt && (
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {new Date(s.submittedAt).toLocaleString()}
                  </p>
                )}
              </div>
              {s.proofUrl && (
                <button onClick={() => setPreview(s.proofUrl)} className="shrink-0">
                  <img src={s.proofUrl} alt="Proof" className="h-16 w-16 rounded-xl border-2 border-ink object-cover" />
                </button>
              )}
            </div>

            {Object.keys(ratings).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Object.entries(ratings).map(([k, v]) => (
                  <span key={k} className="rounded-full border border-ink bg-surface px-2 py-0.5 text-[10px] font-semibold">
                    {k}: {String(v)}
                  </span>
                ))}
              </div>
            )}

            {statusFilter === "pending" && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => approve(s.id)}
                  disabled={pending}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg border-2 border-ink bg-success py-2 text-xs font-bold text-success-foreground disabled:opacity-60"
                >
                  <Check className="h-3.5 w-3.5" /> Approve
                </button>
                <button
                  onClick={() => reject(s.id)}
                  disabled={pending}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg border-2 border-ink bg-destructive/10 py-2 text-xs font-bold text-destructive disabled:opacity-60"
                >
                  <X className="h-3.5 w-3.5" /> Reject
                </button>
                {s.proofUrl && (
                  <a
                    href={s.proofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="flex items-center justify-center gap-1 rounded-lg border-2 border-ink bg-secondary px-3 py-2 text-xs font-bold"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Proof preview modal */}
      {preview && (
        <div
          onClick={() => setPreview(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4"
        >
          <div className="relative max-h-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <img src={preview} alt="Proof full size" className="max-h-[80vh] rounded-2xl border-2 border-card object-contain" />
            <div className="mt-3 flex justify-center gap-2">
              <a
                href={preview}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="flex items-center gap-1.5 rounded-xl border-2 border-card bg-card px-4 py-2 text-sm font-bold text-foreground"
              >
                <Download className="h-4 w-4" /> Download
              </a>
              <button
                onClick={() => setPreview(null)}
                className="rounded-xl border-2 border-card bg-transparent px-4 py-2 text-sm font-bold text-card"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TransactionsTab({ items, onAction, isModerator = false }: { items: Txn[]; onAction: () => void; isModerator?: boolean }) {
  const [pending, startTransition] = useTransition()
  const [filter, setFilter] = useState<string>("all")
  const types = ["all", "deposit", "withdrawal", "earning", "bonus", "referral", "adjustment"]
  const filtered = filter === "all" ? items : items.filter((t) => t.type === filter)

  const handleDelete = (id: number) => {
    if (!confirm("Permanently delete this transaction? This cannot be undone.")) return
    startTransition(async () => {
      const res = await adminDeleteTransaction(id)
      toast[res.ok ? "success" : "error"](res.message || "Transaction deleted")
      onAction()
    })
  }

  const tint = (type: string) => {
    if (type === "deposit" || type === "earning" || type === "bonus" || type === "referral") return "text-success"
    if (type === "withdrawal") return "text-gold"
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
              filter === t ? "bg-primary text-primary-foreground" : "border-2 border-ink bg-card text-muted-foreground"
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
            <div key={t.id} className="rounded-2xl border-2 border-ink bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-xs font-bold uppercase ${tint(t.type)}`}>{t.type}</span>
                <span className={`text-sm font-bold tabular-nums ${tint(t.type)}`}>
                  {formatNaira(Number(t.amount))}
                </span>
                {!isModerator && (
                  <button
                    onClick={() => handleDelete(t.id)}
                    disabled={pending}
                    className="ml-auto text-xs font-bold text-red-400 hover:text-red-300 disabled:opacity-50"
                    title="Delete this transaction from all records"
                  >
                    ✕
                  </button>
                )}
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

function Overview({ stats, controls, onAction, isModerator = false }: { stats: Stats; controls: Controls; onAction: () => void; isModerator?: boolean }) {
  const [pending, startTransition] = useTransition()
  const [siteFrozen, setSiteFrozenState] = useState(controls.siteFrozen)
  const [depositsPaused, setDepPaused] = useState(controls.depositsPaused)
  const [withdrawalsPaused, setWdPaused] = useState(controls.withdrawalsPaused)
  const [savingFreeze, startFreezeTransition] = useTransition()
  const [savingDep, startDepTransition] = useTransition()
  const [savingWd, startWdTransition] = useTransition()
  const [savingLimits, startLimitsTransition] = useTransition()

  const [minDepositVal, setMinDepositVal] = useState(String(controls.minDeposit))
  const [minWithdrawalVal, setMinWithdrawalVal] = useState(String(controls.minWithdrawal))
  const [withdrawalChargeVal, setWithdrawalChargeVal] = useState(String(controls.withdrawalCharge))

  // Keep local state in sync when polled data arrives
  useEffect(() => { setSiteFrozenState(controls.siteFrozen) }, [controls.siteFrozen])
  useEffect(() => { setDepPaused(controls.depositsPaused) }, [controls.depositsPaused])
  useEffect(() => { setWdPaused(controls.withdrawalsPaused) }, [controls.withdrawalsPaused])
  useEffect(() => { setMinDepositVal(String(controls.minDeposit)) }, [controls.minDeposit])
  useEffect(() => { setMinWithdrawalVal(String(controls.minWithdrawal)) }, [controls.minWithdrawal])
  useEffect(() => { setWithdrawalChargeVal(String(controls.withdrawalCharge)) }, [controls.withdrawalCharge])

  function handleProcessIncome() {
    startTransition(async () => {
      const res = await processAllIncome()
      if (res.ok) toast.success(res.message)
      else toast.error(res.message ?? "Failed")
      onAction()
    })
  }

  function toggleFreeze() {
    const next = !siteFrozen
    setSiteFrozenState(next)
    startFreezeTransition(async () => {
      const res = await setSiteFrozen(next)
      toast[res.ok ? "success" : "error"](res.message)
      onAction()
    })
  }

  function saveLimits() {
    startLimitsTransition(async () => {
      const res = await saveDepositWithdrawalLimits({
        minDeposit: Number(minDepositVal),
        minWithdrawal: Number(minWithdrawalVal),
        withdrawalCharge: Number(withdrawalChargeVal),
      })
      if (res.ok) toast.success(res.message)
      else toast.error("Failed to save limits")
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
    { label: "Total Withdrawn", value: formatNaira(stats.totalWithdrawn), icon: ArrowUpFromLine, tint: "text-gold" },
    { label: "User Balances", value: formatNaira(stats.totalBalance), icon: Wallet, tint: "text-sky-400" },
    { label: "Active Investments", value: String(stats.activeInvestments), icon: TrendingUp, tint: "text-success" },
    { label: "Pending Withdrawals", value: String(stats.pendingWithdrawals), icon: ArrowUpFromLine, tint: "text-destructive" },
  ]
  return (
    <div className="flex flex-col gap-4">
      {/* Process Income and Backfill (admin only) */}
      <button
        onClick={handleProcessIncome}
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
        Process All Income
      </button>

      {!isModerator && <div className="rounded-2xl border-2 border-ink bg-card p-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold">Site Controls</h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Pausing hides the action from users entirely and blocks new requests.
        </p>
        <div className="mt-3 flex flex-col gap-2">
        {/* Site Freeze — single button that locks everything for non-admin users */}
        <button
          onClick={toggleFreeze}
          disabled={savingFreeze}
          className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-sm font-semibold transition-colors disabled:opacity-60 ${
            siteFrozen
              ? "border-red-500/60 bg-red-500/15 text-red-400"
              : "border-ink bg-card text-muted-foreground"
          }`}
        >
          <span>Freeze Entire Site</span>
          <span className="flex items-center gap-1.5">
            {savingFreeze ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : siteFrozen ? (
              <><Lock className="h-4 w-4" /> Frozen</>
            ) : (
              <><Unlock className="h-4 w-4" /> Live</>
            )}
          </span>
        </button>

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

        {/* Deposit / Withdrawal Limits */}
        <div className="mt-4 border-t-2 border-ink pt-4">
          <p className="mb-3 text-xs font-bold text-muted-foreground uppercase tracking-wide">Deposit &amp; Withdrawal Limits</p>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-foreground">Min Deposit (₦)</label>
              <input
                type="number"
                min="0"
                value={minDepositVal}
                onChange={(e) => setMinDepositVal(e.target.value)}
                className="rounded-xl border-2 border-ink bg-secondary/50 px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-foreground">Min Withdrawal (₦)</label>
              <input
                type="number"
                min="0"
                value={minWithdrawalVal}
                onChange={(e) => setMinWithdrawalVal(e.target.value)}
                className="rounded-xl border-2 border-ink bg-secondary/50 px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-foreground">Withdrawal Fee (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={withdrawalChargeVal}
                onChange={(e) => setWithdrawalChargeVal(e.target.value)}
                className="rounded-xl border-2 border-ink bg-secondary/50 px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <button
              onClick={saveLimits}
              disabled={savingLimits}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
            >
              {savingLimits ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save Limits
            </button>
          </div>
        </div>
      </div>}
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border-2 border-ink bg-card p-4">
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
        <div key={w.id} className="rounded-2xl border-2 border-ink bg-card p-4">
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
                  className="shrink-0 rounded-lg border-2 border-ink bg-background p-1.5 text-muted-foreground transition-colors hover:text-foreground"
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

function UsersTab({ items, isModerator = false }: { items: AdminUser[]; isModerator?: boolean }) {
  const [pending, startTransition] = useTransition()
  const [editing, setEditing] = useState<string | null>(null)
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [commissionEditing, setCommissionEditing] = useState<string | null>(null)
  const [commissionVal, setCommissionVal] = useState("")
  const [expandedReferrals, setExpandedReferrals] = useState<Set<string>>(new Set())
  const [referralDetails, setReferralDetails] = useState<Record<string, ReferralDetail[]>>({})
  const [loadingReferrals, setLoadingReferrals] = useState<Set<string>>(new Set())
  const router = useRouter()

  async function toggleReferrals(userId: string) {
    if (expandedReferrals.has(userId)) {
      setExpandedReferrals((s) => { const n = new Set(s); n.delete(userId); return n })
      return
    }
    setExpandedReferrals((s) => new Set(s).add(userId))
    if (referralDetails[userId]) return // already loaded
    setLoadingReferrals((s) => new Set(s).add(userId))
    const data = await getAdminReferralsForUser(userId)
    setReferralDetails((prev) => ({ ...prev, [userId]: data }))
    setLoadingReferrals((s) => { const n = new Set(s); n.delete(userId); return n })
  }

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

  function handleClearBalance(userId: string, name: string) {
    if (!confirm(`Clear ${name}'s wallet balance to ₦0? This cannot be undone.`)) return
    startTransition(async () => {
      const res = await clearUserBalance(userId)
      if (res.ok) toast.success(res.message)
      else toast.error(res.message)
      router.refresh()
    })
  }

  if (items.length === 0) return <Empty label="No users" />

  return (
    <div className="flex flex-col gap-3">
      {items.map((u) => (
        <div key={u.id} className="rounded-2xl border-2 border-ink bg-card p-4">
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
                  <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase text-gold">
                    <Star className="mr-0.5 inline h-2.5 w-2.5" />promoter
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-muted-foreground">{u.email}</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
                <button
                  onClick={() => toggleReferrals(u.id)}
                  className={`flex items-center gap-1 rounded-full border px-2 py-0.5 transition-colors ${
                    expandedReferrals.has(u.id)
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-ink bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Users className="h-3 w-3" />
                  {u.referralCount} referred
                  {u.referralCount > 0 && (
                    <ChevronDown className={`h-3 w-3 transition-transform ${expandedReferrals.has(u.id) ? "rotate-180" : ""}`} />
                  )}
                </button>
                <span className="text-success">{formatNaira(Number(u.referralEarnings ?? 0))} commission</span>
                {u.referredByName && (
                  <>
                    <span>·</span>
                    <span>via <span className="font-semibold text-foreground">{u.referredByName}</span></span>
                  </>
                )}
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
                className="rounded-xl border-2 border-ink bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              <input
                placeholder="Note (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="rounded-xl border-2 border-ink bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(null)}
                  className="flex-1 rounded-xl border-2 border-ink bg-secondary py-2.5 text-sm font-bold"
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
                className="flex-1 rounded-xl border-2 border-ink bg-secondary py-2 text-xs font-bold text-muted-foreground"
              >
                Adjust Balance
              </button>
              <button
                onClick={() => handleClearBalance(u.id, u.name ?? u.email ?? "this user")}
                disabled={pending}
                className="flex items-center justify-center gap-1 rounded-xl border-2 border-ink bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive disabled:opacity-60"
              >
                Clear
              </button>
              <button
                onClick={() => handleTogglePromoter(u.id)}
                disabled={pending}
                className={`flex items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-bold ${
                  u.isPromoter
                    ? "border border-gold/40 bg-gold/10 text-gold"
                    : "border-2 border-ink bg-secondary text-muted-foreground"
                }`}
              >
                <Star className="h-3 w-3" />
                {u.isPromoter ? "Remove" : "Promoter"}
              </button>
              {u.isPromoter && (
                <button
                  onClick={() => { setCommissionEditing(u.id); setCommissionVal(u.promoterCommission != null ? String(u.promoterCommission) : "") }}
                  className="flex items-center justify-center gap-1 rounded-xl border-2 border-ink bg-secondary px-3 py-2 text-xs font-bold text-muted-foreground"
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
                className="flex-1 rounded-xl border-2 border-ink bg-secondary/50 px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button onClick={() => setCommissionEditing(null)} className="rounded-xl border-2 border-ink bg-secondary px-3 py-2 text-xs font-bold">
                Cancel
              </button>
              <button onClick={() => handleSetCommission(u.id)} disabled={pending} className="flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-60">
                {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
              </button>
            </div>
          )}

          {/* Referral drill-down panel */}
          {expandedReferrals.has(u.id) && (
            <div className="mt-3 rounded-xl border-2 border-ink bg-secondary/40 p-3">
              <p className="mb-2 text-xs font-bold text-muted-foreground uppercase tracking-wide">
                Referred Users ({u.referralCount})
              </p>
              {loadingReferrals.has(u.id) && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {!loadingReferrals.has(u.id) && (referralDetails[u.id]?.length ?? 0) === 0 && (
                <p className="py-2 text-center text-xs text-muted-foreground">No referrals yet</p>
              )}
              {!loadingReferrals.has(u.id) && referralDetails[u.id]?.map((r) => (
                <div
                  key={r.referralId}
                  className="mb-2 last:mb-0 rounded-lg border-2 border-ink bg-card px-3 py-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">{r.name}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{r.email}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        Joined {new Date(r.joinedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className={`mb-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        r.hasDeposited
                          ? "bg-success/15 text-success"
                          : "bg-secondary text-muted-foreground"
                      }`}>
                        {r.hasDeposited ? "Deposited" : "No deposit"}
                      </div>
                      <p className="text-[11px] font-mono font-bold">
                        dep {formatNaira(Number(r.totalDeposited))}
                      </p>
                      <p className="text-[10px] text-success font-mono">
                        +{formatNaira(Number(r.commissionEarned))} commission
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function GiftCodesTab({ items, isModerator = false }: { items: GiftCode[]; isModerator?: boolean }) {
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
      <div className="rounded-2xl border-2 border-ink bg-card p-4">
        <p className="mb-3 flex items-center gap-2 text-sm font-bold">
          <Plus className="h-4 w-4 text-primary" /> Create Gift Code
        </p>
        <div className="flex flex-col gap-2">
          <input
            placeholder="CODE (e.g. POCO500)"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
            className="rounded-xl border-2 border-ink bg-secondary/50 px-3 py-2.5 text-sm font-mono outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Amount ₦"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="flex-1 rounded-xl border-2 border-ink bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
            <input
              type="number"
              placeholder="Max uses"
              value={form.maxUses}
              onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
              className="w-28 rounded-xl border-2 border-ink bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
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
        <div className="overflow-hidden rounded-2xl border-2 border-ink bg-card">
          {items.map((g, i) => (
            <div
              key={g.id}
              className={`flex items-center justify-between p-4 ${i !== items.length - 1 ? "border-b-2 border-ink" : ""}`}
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

  const inputCls = "rounded-xl border-2 border-ink bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary"

  return (
    <div className="flex flex-col gap-4">
      {/* Create form */}
      <div className="rounded-2xl border-2 border-ink bg-card p-4">
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
        <p className="rounded-2xl border-2 border-ink bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          No promoter codes yet
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((c) => (
            <div key={c.id} className="rounded-2xl border-2 border-ink bg-card p-4">
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
                    <button onClick={() => setEditingId(null)} className="flex-1 rounded-xl border-2 border-ink bg-secondary py-2 text-xs font-bold">
                      Cancel
                    </button>
                    <button onClick={() => saveEdit(c.id)} disabled={pending} className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground disabled:opacity-60">
                      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex gap-2">
                  <button onClick={() => copyLink(c.code)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-ink bg-secondary py-2 text-xs font-bold text-muted-foreground">
                    <Copy className="h-3.5 w-3.5" /> Copy Link
                  </button>
                  <button
                    onClick={() => { setEditingId(c.id); setEditVals({ maxSignups: c.maxSignups != null ? String(c.maxSignups) : "", commissionRate: c.commissionRate != null ? String(c.commissionRate) : "" }) }}
                    className="flex items-center justify-center gap-1 rounded-xl border-2 border-ink bg-secondary px-3 py-2 text-xs font-bold text-muted-foreground"
                  >
                    Edit
                  </button>
                  <button onClick={() => toggle(c.id)} disabled={pending} className={`flex items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-60 ${c.isActive ? "border border-gold/40 bg-gold/10 text-gold" : "border border-success/40 bg-success/10 text-success"}`}>
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

function DepositCard({
  dep,
  onAction,
}: {
  dep: Deposit
  onAction: () => void
}) {
  const [actPending, startActTransition] = useTransition()
  const [checking, setChecking] = useState(false)
  const [checkResult, setCheckResult] = useState<{ ok: boolean; found?: boolean; message: string } | null>(null)

  const isCompleted = dep.status === "success" || dep.status === "approved"
  const canAct = dep.status === "pending" || dep.status === "processing" || dep.status === "needs_review"

  function act(kind: "approve" | "reject") {
    startActTransition(async () => {
      const res = kind === "approve" ? await approveDeposit(dep.reference) : await rejectDeposit(dep.reference)
      if (res.ok) toast.success(res.message)
      else toast.error(res.message)
      onAction()
    })
  }

  async function handleCheck() {
    setChecking(true)
    setCheckResult(null)
    const res = await adminCheckDeposit(dep.reference)
    setCheckResult(res)
    if (res.ok && (res as { found?: boolean }).found && !isCompleted) onAction()
    setChecking(false)
  }

  return (
    <div className="rounded-2xl border-2 border-ink bg-card p-4">
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
        {dep.sabussRef && (
          <p className="mt-1 text-muted-foreground">
            Sabuss ref: <span className="font-mono text-foreground">{dep.sabussRef}</span>
          </p>
        )}
        <p className="mt-1 text-muted-foreground">{new Date(dep.createdAt).toLocaleString()}</p>
      </div>

      {/* Sabuss check result */}
      {checkResult && (
        <div
          className={`mt-3 rounded-xl px-3 py-2.5 text-xs leading-relaxed ${
            !checkResult.ok
              ? "bg-destructive/10 text-destructive"
              : (checkResult as { found?: boolean }).found
              ? "bg-success/10 text-success"
              : "bg-secondary text-muted-foreground"
          }`}
        >
          {checkResult.message}
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-3 flex flex-col gap-2">
        {canAct && (
          <div className="flex gap-2">
            <button
              onClick={() => act("approve")}
              disabled={actPending}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-success py-2.5 text-sm font-bold text-success-foreground disabled:opacity-60"
            >
              {actPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Approve
            </button>
            <button
              onClick={() => act("reject")}
              disabled={actPending}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-destructive/40 bg-destructive/10 py-2.5 text-sm font-bold text-destructive disabled:opacity-60"
            >
              <X className="h-4 w-4" /> Reject
            </button>
          </div>
        )}
        {/* Check Sabuss button — shown for both pending AND completed deposits */}
        <button
          onClick={handleCheck}
          disabled={checking}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-ink bg-secondary py-2 text-xs font-bold text-muted-foreground hover:text-foreground disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${checking ? "animate-spin" : ""}`} />
          {checking ? "Checking Sabuss..." : isCompleted ? "Verify in Sabuss" : "Check Sabuss Now"}
        </button>
      </div>
    </div>
  )
}

function DepositsTab({ items, onAction }: { items: Deposit[]; onAction: () => void }) {
  // Split: Sabuss raw feed vs regular deposits
  const sabussFeed = items.filter(
    (d) =>
      d.status === "unmatched" ||
      d.status === "needs_review" ||
      (d.status === "success" && d.sabussRef),
  )
  const regularDeposits = items.filter((d) => !sabussFeed.includes(d))

  return (
    <div className="flex flex-col gap-5">
      {/* ── Sabuss Live Feed ── */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-gold" />
          <h3 className="text-sm font-black">Sabuss Live Feed</h3>
          <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">
            {sabussFeed.length} entries
          </span>
        </div>

        {sabussFeed.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-ink bg-card py-6 text-center text-xs text-muted-foreground">
            No Sabuss webhook drops yet — they will appear here when Sabuss sends a notification.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sabussFeed.map((dep) => (
              <SabussFeedRow key={dep.id} dep={dep} onAction={onAction} />
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t-2 border-ink" />

      {/* ── All Deposits ── */}
      <div>
        <p className="mb-3 text-sm font-black">All Deposits</p>
        {regularDeposits.length === 0 ? (
          <Empty label="No deposits yet" />
        ) : (
          <div className="flex flex-col gap-3">
            {regularDeposits.map((dep) => (
              <DepositCard key={dep.id} dep={dep} onAction={onAction} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** A compact row showing raw Sabuss webhook data */
function SabussFeedRow({ dep, onAction }: { dep: Deposit; onAction: () => void }) {
  const [actPending, startAct] = useTransition()

  const statusColors: Record<string, string> = {
    unmatched: "bg-muted text-muted-foreground",
    needs_review: "bg-orange-500/15 text-orange-500",
    success: "bg-success/15 text-success",
  }
  const statusLabel: Record<string, string> = {
    unmatched: "Unmatched",
    needs_review: "Name Mismatch",
    success: "Auto-Approved",
  }

  function approve() {
    startAct(async () => {
      const res = await approveDeposit(dep.reference)
      if (res.ok) toast.success(res.message)
      else toast.error(res.message)
      onAction()
    })
  }

  return (
    <div className="rounded-2xl border-2 border-ink bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          {/* Amount + sender */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-black">{formatNaira(Number(dep.amount))}</span>
            {dep.senderName && (
              <span className="truncate rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                {dep.senderName}
              </span>
            )}
          </div>
          {/* Bank account it landed in */}
          {dep.assignedBankName && (
            <p className="text-[11px] text-muted-foreground">
              Account: <span className="font-medium text-foreground">{dep.assignedBankName} · {dep.assignedAccountNumber}</span>
            </p>
          )}
          {/* Sabuss reference */}
          {dep.sabussRef && (
            <p className="text-[11px] text-muted-foreground">
              Sabuss ref: <span className="font-mono text-foreground">{dep.sabussRef}</span>
            </p>
          )}
          {/* Matched user */}
          {dep.userEmail && dep.status !== "unmatched" && (
            <p className="text-[11px] text-muted-foreground">
              User: <span className="font-medium text-foreground">{dep.userEmail}</span>
            </p>
          )}
          <p className="text-[11px] text-muted-foreground">{new Date(dep.createdAt).toLocaleString()}</p>
        </div>

        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColors[dep.status] ?? "bg-secondary text-muted-foreground"}`}>
          {statusLabel[dep.status] ?? dep.status}
        </span>
      </div>

      {/* Action: needs_review can be force-approved by admin */}
      {dep.status === "needs_review" && (
        <div className="mt-2 flex gap-2">
          <button
            onClick={approve}
            disabled={actPending}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-success py-2 text-xs font-bold text-success-foreground disabled:opacity-60"
          >
            {actPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Approve Anyway
          </button>
        </div>
      )}
    </div>
  )
}

function BankAccountsTab({ items }: { items: BankAccount[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [testingId, setTestingId] = useState<number | null>(null)
  const [testResults, setTestResults] = useState<Record<number, { ok: boolean; message: string; status?: string }>>({})
  const [form, setForm] = useState({
    accountNumber: "",
  bankName: "",
  accountName: "",
  label: "",
  weight: "1",
  sabussApiKey: "",
  sabussPin: "",
  })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({
  accountNumber: "",
  bankName: "",
  accountName: "",
  label: "",
  weight: "1",
  sabussApiKey: "",
  sabussPin: "",
  })

  function handleAdd() {
    startTransition(async () => {
      const res = await addBankAccount({ ...form, weight: Number(form.weight) || 1 })
      if (res.ok) {
        toast.success(res.message)
        setForm({ accountNumber: "", bankName: "", accountName: "", label: "", weight: "1", sabussApiKey: "", sabussPin: "" })
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
    sabussApiKey: acc.sabussApiKey || "",
    sabussPin: acc.sabussPin || "",
    })
  }

  async function handleTest(id: number) {
    setTestingId(id)
    setTestResults((prev) => { const n = { ...prev }; delete n[id]; return n })
    const res = await testSabussWebhook(id)
    setTestResults((prev) => ({ ...prev, [id]: res }))
    setTestingId(null)
  }

  function handleSaveEdit(id: number) {
    startTransition(async () => {
    const res = await updateBankAccount(id, {
  ...editForm,
  weight: Number(editForm.weight) || 1,
  sabussApiKey: editForm.sabussApiKey || null,
  sabussPin: editForm.sabussPin || null,
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
      {/* Sabuss Webhook Info */}
      <div className="rounded-2xl border border-success/30 bg-success/5 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Zap className="h-4 w-4 text-success" />
          <p className="text-xs font-black text-success">Sabuss Webhook — Fully Automatic</p>
        </div>
        <p className="mb-1 text-xs text-muted-foreground">
          Paste this URL into <span className="font-semibold text-foreground">every</span> Sabuss account under <span className="font-semibold text-foreground">Profile &gt; Webhook URL</span>. When money arrives, Sabuss calls this URL, our system matches the amount to the pending deposit, verifies the sender name, and credits the wallet instantly — <span className="font-semibold text-foreground">no manual action needed</span>.
        </p>
        <p className="mb-3 text-xs text-muted-foreground">
          You do <span className="font-semibold text-foreground">not</span> need to use the Sabuss query API or call any endpoint yourself. The webhook alone handles everything. The Sabuss API Key and PIN fields below are optional — they are only used when an admin manually clicks &quot;Check Sabuss Now&quot; on a deposit card to query Sabuss directly.
        </p>
        <div className="flex items-center gap-2 rounded-lg bg-background px-3 py-2">
          <span className="flex-1 select-all font-mono text-xs text-foreground">
            https://ipoco.xyz/api/webhooks/sabuss
          </span>
          <button
            onClick={() => {
              navigator.clipboard.writeText("https://ipoco.xyz/api/webhooks/sabuss")
              toast.success("Webhook URL copied")
            }}
            className="rounded-md bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground"
          >
            Copy
          </button>
        </div>
      </div>

      {/* Add New Account Form */}
      <div className="rounded-2xl border-2 border-ink bg-card p-4">
        <p className="mb-3 flex items-center gap-2 text-sm font-bold">
          <Plus className="h-4 w-4 text-primary" /> Add Bank Account
        </p>
        <div className="flex flex-col gap-2">
          <input
            placeholder="Account Number"
            value={form.accountNumber}
            onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
            className="rounded-xl border-2 border-ink bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <input
            placeholder="Bank Name (e.g. Providus, VFD)"
            value={form.bankName}
            onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
            className="rounded-xl border-2 border-ink bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <input
            placeholder="Account Name"
            value={form.accountName}
            onChange={(e) => setForm((f) => ({ ...f, accountName: e.target.value }))}
            className="rounded-xl border-2 border-ink bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <input
            placeholder="Label (optional, e.g. Hussein, Praise)"
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            className="rounded-xl border-2 border-ink bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
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
              className="w-full rounded-xl border-2 border-ink bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Sabuss API Key <span className="font-normal text-muted-foreground">(paste from Sabuss profile — enables auto-detection)</span>
            </label>
            <input
              placeholder="Sabuss API key (optional)"
              value={form.sabussApiKey}
              onChange={(e) => setForm((f) => ({ ...f, sabussApiKey: e.target.value }))}
              className="w-full rounded-xl border-2 border-ink bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary font-mono text-xs"
            />
          </div>
          <div>
  <label className="mb-1 block text-xs font-semibold text-muted-foreground">
  Sabuss Transaction PIN
  </label>
  <p className="mb-1.5 text-xs text-muted-foreground">
  Your Sabuss account PIN (same PIN you use to log in / approve transactions on Sabuss).
  </p>
  <input
  type="password"
  placeholder="e.g. 0000"
  value={form.sabussPin}
  onChange={(e) => setForm((f) => ({ ...f, sabussPin: e.target.value }))}
  className="w-full rounded-xl border-2 border-ink bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary font-mono text-xs"
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
            <div key={acc.id} className="rounded-2xl border-2 border-ink bg-card p-4">
              {editingId === acc.id ? (
                /* Edit Mode */
                <div className="flex flex-col gap-2">
                  <input
                    placeholder="Account Number"
                    value={editForm.accountNumber}
                    onChange={(e) => setEditForm((f) => ({ ...f, accountNumber: e.target.value }))}
                    className="rounded-xl border-2 border-ink bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
                  />
                  <input
                    placeholder="Bank Name"
                    value={editForm.bankName}
                    onChange={(e) => setEditForm((f) => ({ ...f, bankName: e.target.value }))}
                    className="rounded-xl border-2 border-ink bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
                  />
                  <input
                    placeholder="Account Name"
                    value={editForm.accountName}
                    onChange={(e) => setEditForm((f) => ({ ...f, accountName: e.target.value }))}
                    className="rounded-xl border-2 border-ink bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
                  />
                  <input
                    placeholder="Label (optional)"
                    value={editForm.label}
                    onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
                    className="rounded-xl border-2 border-ink bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
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
                      className="w-full rounded-xl border-2 border-ink bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                      Sabuss API Key <span className="font-normal">(from Sabuss profile)</span>
                    </label>
                    <input
                      placeholder="Paste Sabuss API key to enable auto-detection"
                      value={editForm.sabussApiKey}
                      onChange={(e) => setEditForm((f) => ({ ...f, sabussApiKey: e.target.value }))}
                      className="w-full rounded-xl border-2 border-ink bg-secondary/50 px-3 py-2.5 font-mono text-xs outline-none focus:border-primary"
                    />
                  </div>
                  <div>
  <label className="mb-1 block text-xs font-semibold text-muted-foreground">
  Sabuss Transaction PIN
  </label>
  <p className="mb-1.5 text-xs text-muted-foreground">Your Sabuss account PIN (used to verify transactions via the query API)</p>
  <input
  type="password"
  placeholder="e.g. 0000"
  value={editForm.sabussPin}
                      onChange={(e) => setEditForm((f) => ({ ...f, sabussPin: e.target.value }))}
                      className="w-full rounded-xl border-2 border-ink bg-secondary/50 px-3 py-2.5 font-mono text-xs outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex-1 rounded-xl border-2 border-ink bg-secondary py-2.5 text-sm font-bold"
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
                  <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-success/10 px-3 py-1.5 text-xs text-success">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />
                    <span className="flex-1">Webhook auto-detect ON — matches by account number</span>
                    <button
                      onClick={() => handleTest(acc.id)}
                      disabled={testingId === acc.id}
                      className="ml-auto flex items-center gap-1 rounded-md bg-success/20 px-2 py-0.5 text-[10px] font-bold text-success hover:bg-success/30 disabled:opacity-60"
                    >
                      {testingId === acc.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                      Test
                    </button>
                  </div>
                  {!acc.sabussApiKey && (
                    <p className="mt-1 rounded-lg bg-gold/10 px-3 py-1.5 text-[11px] text-gold">
                      No API key — webhook will still auto-approve by account number. Add an API key for extra security.
                    </p>
                  )}
                  {testResults[acc.id] && (
                    <div className={`mt-1.5 rounded-lg px-3 py-2 text-[11px] ${testResults[acc.id].ok ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                      <p className="font-bold">{testResults[acc.id].ok ? "Webhook reached" : "Webhook failed"}</p>
                      <p className="mt-0.5 font-mono opacity-80">{testResults[acc.id].message}</p>
                    </div>
                  )}

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleToggle(acc.id)}
                      disabled={pending}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold disabled:opacity-60 ${
                        acc.isActive
                          ? "border border-gold/40 bg-gold/10 text-gold"
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
                      className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-ink bg-secondary px-4 py-2.5 text-sm font-bold disabled:opacity-60"
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

function MilestonesTab({ items, isModerator = false }: { items: Milestone[]; isModerator?: boolean }) {
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
      <div className="rounded-2xl border border-gold/30 bg-gold/5 p-4">
        <p className="flex items-center gap-2 text-sm font-bold text-gold">
          <Trophy className="h-4 w-4" /> Referral Milestones
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Set bonus rewards for users who reach referral goals. E.g., 10 referrals = 5k bonus.
        </p>
      </div>

      <div className="rounded-2xl border-2 border-ink bg-card p-4">
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
              className="flex-1 rounded-xl border-2 border-ink bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
            <input
              type="number"
              placeholder="Reward ₦ (e.g. 5000)"
              value={form.rewardAmount}
              onChange={(e) => setForm((f) => ({ ...f, rewardAmount: e.target.value }))}
              className="flex-1 rounded-xl border-2 border-ink bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
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
            <div key={m.id} className="rounded-2xl border-2 border-ink bg-card p-4">
              {editingId === m.id ? (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Referral count"
                      value={editForm.referralCount}
                      onChange={(e) => setEditForm((f) => ({ ...f, referralCount: e.target.value }))}
                      className="flex-1 rounded-xl border-2 border-ink bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
                    />
                    <input
                      type="number"
                      placeholder="Reward amount"
                      value={editForm.rewardAmount}
                      onChange={(e) => setEditForm((f) => ({ ...f, rewardAmount: e.target.value }))}
                      className="flex-1 rounded-xl border-2 border-ink bg-secondary/50 px-3 py-2.5 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex-1 rounded-xl border-2 border-ink bg-secondary py-2.5 text-sm font-bold"
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
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15">
                        <Trophy className="h-5 w-5 text-gold" />
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
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold disabled:opacity-60 ${m.isActive ? "border border-gold/40 bg-gold/10 text-gold" : "bg-success text-success-foreground"}`}
                    >
                      {m.isActive ? <><ToggleLeft className="h-4 w-4" /> Deactivate</> : <><ToggleRight className="h-4 w-4" /> Activate</>}
                    </button>
                    <button onClick={() => startEdit(m)} disabled={pending} className="flex items-center justify-center rounded-xl border-2 border-ink bg-secondary px-4 py-2.5 text-sm font-bold disabled:opacity-60">
                      <Pencil className="h-4 w-4" />
                    </button>
                    {!isModerator && (
                      <button onClick={() => handleDelete(m.id)} disabled={pending} className="flex items-center justify-center rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm font-bold text-destructive disabled:opacity-60">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
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
    pending: "bg-gold/15 text-gold",
    processing: "bg-primary/15 text-primary",
    success: "bg-success/15 text-success",
    approved: "bg-success/15 text-success",
    completed: "bg-success/15 text-success",
    rejected: "bg-destructive/15 text-destructive",
    failed: "bg-destructive/15 text-destructive",
    needs_review: "bg-orange-500/15 text-orange-500",
    unmatched: "bg-muted text-muted-foreground",
  }
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${map[status] ?? "bg-secondary text-muted-foreground"}`}>
      {status}
    </span>
  )
}

function Empty({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border-2 border-ink bg-card px-4 py-12 text-center text-sm text-muted-foreground">
      {label}
    </div>
  )
}

// ── Games Admin Tab ────────────────────────────────────────���───────────────���──

type GameSubTab = "overview" | "spin" | "vault" | "draw"

function GamesAdminTab({
  spins, vaults, drawSlots, drawRounds, gameStats, gameConfig, onAction,
}: {
  spins: SpinRow[]
  vaults: VaultRow[]
  drawSlots: DrawSlotRow[]
  drawRounds: DrawRound[]
  gameStats: GameStats
  gameConfig: GameConfig
  onAction: () => void
}) {
  const [sub, setSub] = useState<GameSubTab>("overview")
  const [pending, startTransition] = useTransition()
  const [spinFilter, setSpinFilter] = useState<"all" | "win" | "lose">("all")
  const [vaultFilter, setVaultFilter] = useState<"all" | "locked" | "completed" | "broken">("all")

  // Withdrawal charge state — stored in DB so changes apply to ALL pending withdrawals immediately
  const [wChargePct, setWChargePct] = useState(String(gameConfig.withdrawalCharge))

  const saveWithdrawalCharge = () => {
    const pct = parseFloat(wChargePct)
    if (isNaN(pct) || pct < 0 || pct > 100) { toast.error("Enter a valid percentage (0–100)"); return }
    startTransition(async () => {
      const res = await saveGameConfig({ withdrawalCharge: pct })
      toast[res.ok ? "success" : "error"](res.message)
      onAction()
    })
  }

  // Spin config state — initialised from live DB config
  const [houseEdgePct, setHouseEdgePct] = useState(String(Math.round(gameConfig.stakeHouseEdge * 100)))
  const [stakeMin, setStakeMin] = useState(String(gameConfig.stakeMin))
  const [stakeMax, setStakeMax] = useState(String(gameConfig.stakeMax))
  const [multipliersRaw, setMultipliersRaw] = useState(gameConfig.stakeMultipliers.join(", "))

  // Draw config state
  const [slotCost, setSlotCost] = useState(String(gameConfig.luckyDrawSlotCost))

  // Vault config state
  const [bonus7, setBonus7] = useState(String(gameConfig.vaultTiers[0].bonusPercent))
  const [bonus14, setBonus14] = useState(String(gameConfig.vaultTiers[1].bonusPercent))
  const [bonus30, setBonus30] = useState(String(gameConfig.vaultTiers[2].bonusPercent))
  const [penalty, setPenalty] = useState(String(gameConfig.vaultTiers[0].penaltyPercent))
  const [vaultMin, setVaultMin] = useState(String(gameConfig.vaultMin))

  const saveSpinConfig = () => {
    const edge = parseFloat(houseEdgePct) / 100
    if (isNaN(edge) || edge < 0.1 || edge > 0.99) {
      toast.error("House edge must be between 10% and 99%")
      return
    }
    const multipliers = multipliersRaw.split(",").map((s) => parseFloat(s.trim())).filter((n) => !isNaN(n) && n > 1)
    if (multipliers.length === 0) { toast.error("Enter at least one multiplier > 1"); return }
    startTransition(async () => {
      const res = await saveGameConfig({
        stakeHouseEdge: edge,
        stakeMin: parseInt(stakeMin) || SITE.stakeMin,
        stakeMax: parseInt(stakeMax) || SITE.stakeMax,
        stakeMultipliers: multipliers,
      })
      toast[res.ok ? "success" : "error"](res.message)
      onAction()
    })
  }

  const saveDrawConfig = () => {
    startTransition(async () => {
      const res = await saveGameConfig({ luckyDrawSlotCost: parseInt(slotCost) || SITE.luckyDrawSlotCost })
      toast[res.ok ? "success" : "error"](res.message)
      onAction()
    })
  }

  const saveVaultConfig = () => {
    startTransition(async () => {
      const res = await saveGameConfig({
        vaultBonus7: parseFloat(bonus7) || SITE.vaultTiers[0].bonusPercent,
        vaultBonus14: parseFloat(bonus14) || SITE.vaultTiers[1].bonusPercent,
        vaultBonus30: parseFloat(bonus30) || SITE.vaultTiers[2].bonusPercent,
        vaultPenalty: parseFloat(penalty) || 10,
        vaultMin: parseInt(vaultMin) || SITE.vaultMin,
      })
      toast[res.ok ? "success" : "error"](res.message)
      onAction()
    })
  }

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
                ? "border-ink bg-primary text-primary-foreground shadow-[2px_2px_0_0_var(--ink)]"
                : "border-ink bg-card text-muted-foreground"
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
          <div className="rounded-2xl border-2 border-ink bg-card p-4">
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
          <div className="rounded-2xl border-2 border-ink bg-card p-4">
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
          <div className="rounded-2xl border-2 border-ink bg-card p-4">
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

          {/* Withdrawal charge editor — changes apply instantly to pending withdrawals */}
          <div className="rounded-2xl border border-gold/30 bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <p className="font-bold text-sm">Withdrawal Charge</p>
              <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-bold text-gold">LIVE</span>
            </div>
            <p className="mb-3 text-[11px] text-muted-foreground">
              Changes apply immediately — even to withdrawals already pending approval.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="number" min="0" max="100" step="0.5"
                  value={wChargePct}
                  onChange={(e) => setWChargePct(e.target.value)}
                  className="w-full rounded-xl border-2 border-ink bg-secondary px-3 py-2 font-mono text-sm pr-8"
                  placeholder={String(gameConfig.withdrawalCharge)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
              <button
                onClick={saveWithdrawalCharge}
                disabled={pending}
                className="flex items-center gap-1.5 rounded-xl bg-gold px-4 py-2 text-sm font-bold text-gold-foreground disabled:opacity-60"
              >
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Save
              </button>
            </div>
          </div>

          {/* Live config summary */}
          <div className="rounded-2xl border border-primary/20 bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-bold">Live Config</p>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">DB</span>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              {[
                { label: "Withdrawal Charge", value: `${gameConfig.withdrawalCharge}%`, highlight: true },
                { label: "House Edge (Spin)", value: `${Math.round(gameConfig.stakeHouseEdge * 100)}% lose chance` },
                { label: "Stake Range", value: `₦${gameConfig.stakeMin.toLocaleString()} – ₦${gameConfig.stakeMax.toLocaleString()}` },
                { label: "Multipliers", value: gameConfig.stakeMultipliers.map((m) => `${m}x`).join(", ") },
                { label: "Slot Cost", value: `₦${gameConfig.luckyDrawSlotCost.toLocaleString()}` },
                { label: "Vault Tiers", value: gameConfig.vaultTiers.map((t) => `${t.days}d/+${t.bonusPercent}%`).join(", ") },
                { label: "Early Penalty", value: `${gameConfig.vaultTiers[0].penaltyPercent}%` },
              ].map((r) => (
                <div key={r.label} className="flex justify-between border-b-2 border-ink/50 pb-2 last:border-0 last:pb-0">
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className={`font-mono font-bold ${"highlight" in r && r.highlight ? "text-gold" : ""}`}>{r.value}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">Edit in Stake &amp; Spin / Vault / Draw sub-tabs. Withdrawal charge applies immediately to all pending withdrawals.</p>
          </div>
        </div>
      )}

      {/* ── Stake & Spin History ── */}
      {sub === "spin" && (
        <div className="flex flex-col gap-3">

          {/* Config editor */}
          <div className="rounded-2xl border-2 border-ink bg-card p-4">
            <p className="mb-3 font-bold text-sm">Spin Config</p>
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  House Edge — % chance user <span className="font-bold text-destructive">LOSES</span> (current: {Math.round(gameConfig.stakeHouseEdge * 100)}%)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number" min="10" max="99" step="1"
                    value={houseEdgePct}
                    onChange={(e) => setHouseEdgePct(e.target.value)}
                    className="flex-1 rounded-xl border-2 border-ink bg-secondary px-3 py-2 font-mono text-sm"
                    placeholder="e.g. 70"
                  />
                  <span className="flex items-center text-sm text-muted-foreground">%</span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">Higher = platform earns more. 70 means 30% user win rate.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Min Stake (₦)</label>
                  <input type="number" value={stakeMin} onChange={(e) => setStakeMin(e.target.value)}
                    className="w-full rounded-xl border-2 border-ink bg-secondary px-3 py-2 font-mono text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Max Stake (₦)</label>
                  <input type="number" value={stakeMax} onChange={(e) => setStakeMax(e.target.value)}
                    className="w-full rounded-xl border-2 border-ink bg-secondary px-3 py-2 font-mono text-sm" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Win Multipliers (comma-separated, e.g. 1.5, 2, 3)</label>
                <input type="text" value={multipliersRaw} onChange={(e) => setMultipliersRaw(e.target.value)}
                  className="w-full rounded-xl border-2 border-ink bg-secondary px-3 py-2 font-mono text-sm" />
              </div>
              <button
                onClick={saveSpinConfig}
                disabled={pending}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Spin Config"}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">{filteredSpins.length} records</p>
            <div className="flex gap-1.5">
              {(["all", "win", "lose"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setSpinFilter(f)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${
                    spinFilter === f ? "border-ink bg-primary text-primary-foreground shadow-[2px_2px_0_0_var(--ink)]" : "border-ink bg-card text-muted-foreground"
                  }`}
                >
                  {f === "all" ? `All (${spins.length})` : f === "win" ? `Win (${spins.filter((s) => s.outcome === "win").length})` : `Lose (${spins.filter((s) => s.outcome === "lose").length})`}
                </button>
              ))}
            </div>
          </div>

          {filteredSpins.length === 0 && <Empty label="No spin records" />}
          {filteredSpins.map((s) => (
            <div key={s.id} className="rounded-xl border-2 border-ink bg-card px-4 py-3">
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

          {/* Config editor */}
          <div className="rounded-2xl border-2 border-ink bg-card p-4">
            <p className="mb-3 text-sm font-bold">Vault Config</p>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">7-day Bonus %</label>
                  <input type="number" value={bonus7} onChange={(e) => setBonus7(e.target.value)}
                    className="w-full rounded-xl border-2 border-ink bg-secondary px-3 py-2 font-mono text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">14-day Bonus %</label>
                  <input type="number" value={bonus14} onChange={(e) => setBonus14(e.target.value)}
                    className="w-full rounded-xl border-2 border-ink bg-secondary px-3 py-2 font-mono text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">30-day Bonus %</label>
                  <input type="number" value={bonus30} onChange={(e) => setBonus30(e.target.value)}
                    className="w-full rounded-xl border-2 border-ink bg-secondary px-3 py-2 font-mono text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Early Break Penalty %</label>
                  <input type="number" value={penalty} onChange={(e) => setPenalty(e.target.value)}
                    className="w-full rounded-xl border-2 border-ink bg-secondary px-3 py-2 font-mono text-sm" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Min Vault Amount (₦)</label>
                  <input type="number" value={vaultMin} onChange={(e) => setVaultMin(e.target.value)}
                    className="w-full rounded-xl border-2 border-ink bg-secondary px-3 py-2 font-mono text-sm" />
                </div>
              </div>
              <button
                onClick={saveVaultConfig}
                disabled={pending}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Vault Config"}
              </button>
            </div>
          </div>

          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {(["all", "locked", "completed", "broken"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setVaultFilter(f)}
                className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${
                  vaultFilter === f ? "border-ink bg-primary text-primary-foreground shadow-[2px_2px_0_0_var(--ink)]" : "border-ink bg-card text-muted-foreground"
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
              <div key={v.id} className="rounded-xl border-2 border-ink bg-card p-4">
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

          {/* Config editor */}
          <div className="rounded-2xl border-2 border-ink bg-card p-4">
            <p className="mb-3 text-sm font-bold">Draw Config</p>
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Slot Purchase Price (₦)</label>
                <input type="number" value={slotCost} onChange={(e) => setSlotCost(e.target.value)}
                  className="w-full rounded-xl border-2 border-ink bg-secondary px-3 py-2 font-mono text-sm" />
                <p className="mt-1 text-[11px] text-muted-foreground">This is how much users pay for each extra slot. Revenue goes into the prize pool.</p>
              </div>
              <button
                onClick={saveDrawConfig}
                disabled={pending}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Draw Config"}
              </button>
            </div>
          </div>

          {/* Rounds */}
          <p className="text-sm font-bold">Draw Rounds</p>
          {drawRounds.length === 0 && <Empty label="No draw rounds yet" />}
          {drawRounds.map((r) => (
            <div key={r.id} className="rounded-xl border-2 border-ink bg-card p-4">
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
            <div key={s.id} className="flex items-center justify-between rounded-xl border-2 border-ink bg-card px-4 py-3">
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

// ── Financials Tab ─────��──────────────────────────────────────────────────────
function FinancialsTab({ data }: { data: Financials }) {
  const cards = [
    { label: "Withdrawal Charges (Revenue)", value: data.withdrawalCharges, color: "text-success" },
    { label: "Total Approved Payouts", value: data.totalPayouts, color: "text-destructive" },
    { label: "Pending Payouts", value: data.pendingPayouts, color: "text-gold" },
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
          <div key={c.label} className="rounded-2xl border-2 border-ink bg-card p-4">
            <p className="mb-1 text-[11px] text-muted-foreground leading-tight">{c.label}</p>
            <p className={`font-mono text-lg font-bold ${c.color}`}>
              ₦{c.value.toLocaleString()}
            </p>
          </div>
        ))}
        <div className="rounded-2xl border-2 border-ink bg-card p-4">
          <p className="mb-1 text-[11px] text-muted-foreground">Active Investments</p>
          <p className="font-mono text-lg font-bold text-primary">{data.activeInvestments}</p>
        </div>
      </div>
    </div>
  )
}

// ── Investments Tab ───────────────────────────────────────────────────────────
function InvestmentsTab({ items, onAction, isModerator = false }: { items: InvestmentRow[]; onAction: () => void; isModerator?: boolean }) {
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
                ? "border-ink bg-primary text-primary-foreground shadow-[2px_2px_0_0_var(--ink)]"
                : "border-ink bg-card text-muted-foreground"
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
          <div key={inv.id} className="rounded-2xl border-2 border-ink bg-card p-4">
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

            {inv.status === "active" && !isModerator && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleCancel(inv.id)}
                  disabled={pending}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gold/30 bg-gold/10 py-2 text-xs font-bold text-gold disabled:opacity-60"
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

            {/* Cancelled investments can be fully deleted to remove all traces */}
            {inv.status === "cancelled" && !isModerator && (
              <button
                onClick={() => handleDelete(inv.id)}
                disabled={pending}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/10 py-2 text-xs font-bold text-destructive disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete Record
              </button>
            )}

            {extendId === inv.id && (
              <div className="mt-3 flex gap-2">
                <select
                  value={extendDays}
                  onChange={(e) => setExtendDays(Number(e.target.value))}
                  className="flex-1 rounded-xl border-2 border-ink bg-secondary px-3 py-2 text-sm"
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
  const [slotUsers, setSlotUsers] = useState<{ id: string; email: string; name: string | null }[]>([])
  const [pickedIds, setPickedIds] = useState<string[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [search, setSearch] = useState("")

  const today = new Date().toISOString().slice(0, 10)
  const todayRound = rounds.find((r) => r.drawDate === today)

  const loadSlotUsers = () => {
    setLoadingUsers(true)
    startTransition(async () => {
      const rows = await getDrawSlotUsers(today)
      setSlotUsers(rows)
      setLoadingUsers(false)
    })
  }

  const togglePick = (uid: string) => {
    setPickedIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : prev.length < 3 ? [...prev, uid] : prev
    )
  }

  const handleDraw = () => {
    const mode = pickedIds.length > 0
      ? `Execute draw with ${pickedIds.length} pre-selected winner${pickedIds.length > 1 ? "s" : ""} + random fill?`
      : "Execute draw with fully random winners? This cannot be undone."
    if (!confirm(mode)) return
    startTransition(async () => {
      const res = await executeLuckyDraw(today, pickedIds)
      toast[res.ok ? "success" : "error"](res.message)
      setPickedIds([])
      onAction()
    })
  }

  const filtered = slotUsers.filter((u) => {
    const q = search.toLowerCase()
    return u.email.toLowerCase().includes(q) || (u.name ?? "").toLowerCase().includes(q)
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Today's round */}
      <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Ticket className="h-5 w-5 text-primary" />
          <p className="font-bold text-primary">Today&apos;s Draw — {today}</p>
        </div>

        {todayRound ? (
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <div className="flex-1 rounded-xl bg-background/60 p-3 text-center">
                <p className="font-mono text-lg font-bold">₦{Number(todayRound.prizePool).toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Prize Pool</p>
              </div>
              <div className="flex-1 rounded-xl bg-background/60 p-3 text-center">
                <p className={`font-bold ${todayRound.status === "drawn" ? "text-success" : "text-gold"}`}>
                  {todayRound.status === "drawn" ? "Drawn" : "Open"}
                </p>
                <p className="text-[10px] text-muted-foreground">Status</p>
              </div>
            </div>

            {todayRound.status !== "drawn" && (
              <>
                {/* Winner picker */}
                <div className="rounded-xl border-2 border-ink bg-background/60 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-bold">Pick Winners (optional — up to 3)</p>
                    <button
                      onClick={loadSlotUsers}
                      disabled={loadingUsers || pending}
                      className="rounded-lg bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground"
                    >
                      {loadingUsers ? "Loading..." : "Load Entrants"}
                    </button>
                  </div>

                  {pickedIds.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {pickedIds.map((uid, i) => {
                        const u = slotUsers.find((x) => x.id === uid)
                        return (
                          <span key={uid} className="flex items-center gap-1 rounded-full bg-primary/20 px-2.5 py-1 text-xs font-bold text-primary">
                            {i + 1}. {u?.name ?? u?.email ?? uid}
                            <button onClick={() => togglePick(uid)} className="ml-1 text-primary/60 hover:text-primary">×</button>
                          </span>
                        )
                      })}
                    </div>
                  )}

                  {slotUsers.length > 0 && (
                    <>
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name or email..."
                        className="mb-2 w-full rounded-lg border-2 border-ink bg-secondary px-3 py-2 text-xs outline-none"
                      />
                      <div className="max-h-48 overflow-y-auto flex flex-col gap-1">
                        {filtered.map((u) => {
                          const picked = pickedIds.includes(u.id)
                          const pickIndex = pickedIds.indexOf(u.id)
                          return (
                            <button
                              key={u.id}
                              onClick={() => togglePick(u.id)}
                              disabled={!picked && pickedIds.length >= 3}
                              className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                                picked
                                  ? "bg-primary/20 text-primary"
                                  : "bg-secondary/50 text-foreground hover:bg-secondary disabled:opacity-40"
                              }`}
                            >
                              <span>
                                <span className="font-semibold">{u.name ?? "—"}</span>
                                <span className="ml-2 text-muted-foreground">{u.email}</span>
                              </span>
                              {picked && (
                                <span className="ml-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-black text-primary-foreground">
                                  {pickIndex + 1}
                                </span>
                              )}
                            </button>
                          )
                        })}
                        {filtered.length === 0 && (
                          <p className="py-2 text-center text-xs text-muted-foreground">No entrants found</p>
                        )}
                      </div>
                    </>
                  )}

                  {slotUsers.length === 0 && !loadingUsers && (
                    <p className="text-xs text-muted-foreground">
                      Load entrants to pick specific winners. Leave empty for fully random draw.
                    </p>
                  )}
                </div>

                <button
                  onClick={handleDraw}
                  disabled={pending}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
                >
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarCheck className="h-4 w-4" />}
                  {pickedIds.length > 0 ? `Execute Draw (${pickedIds.length} picked + random)` : "Execute Draw (random)"}
                </button>
              </>
            )}

            {todayRound.status === "drawn" && (
              <div className="rounded-xl border border-success/30 bg-success/10 p-3 text-center">
                <p className="text-xs font-bold text-success">Draw complete — winners paid.</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No entries yet for today. Users need to enter slots first.</p>
        )}
      </div>

      {/* History */}
      <p className="text-sm font-bold">Draw History</p>
      {rounds.length === 0 && <Empty label="No draws yet" />}
      {rounds.map((r) => (
        <div key={r.id} className="rounded-xl border-2 border-ink bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold">{r.drawDate}</p>
              <p className="text-xs text-muted-foreground">Pool: ₦{Number(r.prizePool).toLocaleString()}</p>
            </div>
            <StatusBadge status={r.status === "drawn" ? "completed" : "pending"} />
          </div>
          {r.status === "drawn" && (r.winner1Id || r.winner2Id || r.winner3Id) && (
            <div className="mt-2 flex flex-col gap-0.5">
              {[r.winner1Id, r.winner2Id, r.winner3Id].filter(Boolean).map((uid, i) => (
                <p key={uid} className="text-[11px] text-muted-foreground">
                  {i + 1}. {uid}
                </p>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Salaries Tab ──────────────────────────────────────────────────────────────
type SalaryData = Awaited<ReturnType<typeof listPromoterSalaries>>
type SalaryRow = SalaryData["promoters"][number]
type SalaryCfg = SalaryData["config"]

function SalariesTab() {
  const [rows, setRows] = useState<SalaryRow[]>([])
  const [cfg, setCfg] = useState<SalaryCfg | null>(null)
  const [loading, setLoading] = useState(true)
  const [pending, startTransition] = useTransition()

  // Add-promoter form
  const [identifier, setIdentifier] = useState("")
  const [mode, setMode] = useState<"algorithm" | "fixed">("algorithm")
  const [amount, setAmount] = useState(String(SITE.defaultPromoterSalary))
  const [note, setNote] = useState("")

  // Config editor
  const [showConfig, setShowConfig] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listPromoterSalaries()
      setRows(data.promoters)
      setCfg(data.config)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function assign() {
    startTransition(async () => {
      const res = await setPromoterSalary({
        identifier,
        useAlgorithm: mode === "algorithm",
        weeklyAmount: mode === "fixed" ? Number(amount) : 0,
        note,
      })
      res.ok ? toast.success(res.message) : toast.error(res.message)
      if (res.ok) {
        setIdentifier("")
        setNote("")
        load()
      }
    })
  }

  function toggle(userId: string, isActive: boolean) {
    startTransition(async () => {
      await togglePromoterSalary(userId, isActive)
      load()
    })
  }

  function remove(userId: string) {
    if (!confirm("Remove this promoter from the salary program?")) return
    startTransition(async () => {
      const res = await removePromoterSalary(userId)
      res.ok ? toast.success(res.message) : toast.error(res.message)
      load()
    })
  }

  function sync() {
    startTransition(async () => {
      const res = await syncAutoPromoters()
      res.ok ? toast.success(res.message) : toast.error(res.message)
      load()
    })
  }

  function payOne(userId: string) {
    startTransition(async () => {
      const res = await payPromoterSalary(userId)
      res.ok ? toast.success(res.message) : toast.error(res.message)
      load()
    })
  }

  function payAll() {
    startTransition(async () => {
      const res = await payAllSalaries()
      res.ok ? toast.success(res.message) : toast.error(res.message)
      load()
    })
  }

  const totalWeekly = rows.filter((r) => r.isActive).reduce((s, r) => s + Number(r.payable), 0)
  const inputCls = "rounded-xl border-2 border-ink bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"

  return (
    <div className="flex flex-col gap-4">
      {/* How it works */}
      <div className="rounded-2xl border-2 border-ink bg-primary/10 p-4 text-xs leading-relaxed">
        <p className="font-black">Referral-based weekly salary</p>
        <p className="mt-1 text-muted-foreground">
          Promoters earn points from active referrals — bigger packages earn more points. Salary = points × rate,
          capped at the weekly maximum. Use <strong>Auto-qualify</strong> to enroll everyone who hits the referral
          threshold, or add someone manually with a fixed amount.
        </p>
      </div>

      {/* Config toggle */}
      <button
        onClick={() => setShowConfig((s) => !s)}
        className="flex items-center justify-between rounded-2xl border-2 border-ink bg-card px-4 py-3 text-sm font-bold"
      >
        <span className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" /> Salary algorithm settings</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${showConfig ? "rotate-180" : ""}`} />
      </button>
      {showConfig && cfg && <SalaryConfigEditor cfg={cfg} onSaved={load} />}

      {/* Add promoter */}
      <div className="rounded-2xl border-2 border-ink bg-card p-4">
        <p className="mb-3 text-sm font-bold">Add / Update Promoter</p>
        <div className="flex flex-col gap-2">
          <input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="Promoter phone or email"
            className={inputCls}
          />
          <div className="flex gap-2">
            <button
              onClick={() => setMode("algorithm")}
              className={`flex-1 rounded-xl border-2 border-ink px-3 py-2 text-xs font-bold ${
                mode === "algorithm" ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground"
              }`}
            >
              Algorithm-based
            </button>
            <button
              onClick={() => setMode("fixed")}
              className={`flex-1 rounded-xl border-2 border-ink px-3 py-2 text-xs font-bold ${
                mode === "fixed" ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground"
              }`}
            >
              Fixed amount
            </button>
          </div>
          {mode === "fixed" && (
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="numeric"
              placeholder="Weekly ₦"
              className={inputCls}
            />
          )}
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className={inputCls}
          />
          <button
            onClick={assign}
            disabled={pending || !identifier}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Save Promoter
          </button>
        </div>
      </div>

      {/* Summary + actions */}
      <div className="flex items-center justify-between gap-2 rounded-2xl border-2 border-ink bg-card px-4 py-3">
        <div>
          <p className="text-xs text-muted-foreground">Total weekly payroll</p>
          <p className="text-lg font-black tabular-nums">{formatNaira(totalWeekly)}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={sync}
            disabled={pending}
            className="flex items-center gap-1 rounded-xl border-2 border-ink bg-secondary px-3 py-2.5 text-xs font-bold disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Auto-qualify
          </button>
          <button
            onClick={payAll}
            disabled={pending || totalWeekly === 0}
            className="rounded-xl bg-success px-4 py-2.5 text-sm font-bold text-success-foreground disabled:opacity-50"
          >
            Pay All
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <Empty label="No promoter salaries yet" />
      ) : (
        rows.map((r) => (
          <div key={r.id} className="rounded-2xl border-2 border-ink bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{r.userName ?? "Unknown"}</p>
                <p className="truncate text-xs text-muted-foreground">{r.userPhone ?? r.userEmail ?? r.userId}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <span className={`rounded-full border border-ink px-2 py-0.5 text-[10px] font-bold ${
                    r.manualOverride ? "bg-gold/20 text-gold" : "bg-primary/15 text-primary"
                  }`}>
                    {r.manualOverride ? "Fixed" : "Algorithm"}
                  </span>
                  {r.autoQualified && (
                    <span className="rounded-full border border-ink bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
                      Auto
                    </span>
                  )}
                  <span className="rounded-full border border-ink bg-surface px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    {r.referralsCounted} refs · {r.points} pts
                  </span>
                </div>
                {r.note && <p className="mt-1 text-[11px] text-muted-foreground">{r.note}</p>}
              </div>
              <div className="text-right">
                <p className="text-sm font-black tabular-nums">{formatNaira(Number(r.payable))}</p>
                <p className="text-[10px] text-muted-foreground">/week</p>
                {!r.manualOverride && (
                  <p className="text-[10px] text-muted-foreground">computed</p>
                )}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => toggle(r.userId, !r.isActive)}
                disabled={pending}
                className="flex items-center gap-1 rounded-lg border-2 border-ink bg-surface px-2.5 py-1.5 text-xs font-semibold text-muted-foreground disabled:opacity-60"
              >
                {r.isActive ? <ToggleRight className="h-4 w-4 text-success" /> : <ToggleLeft className="h-4 w-4" />}
                {r.isActive ? "Active" : "Paused"}
              </button>
              <button
                onClick={() => remove(r.userId)}
                disabled={pending}
                className="flex items-center gap-1 rounded-lg border-2 border-ink bg-destructive/10 px-2.5 py-1.5 text-xs font-bold text-destructive disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => payOne(r.userId)}
                disabled={pending || !r.isActive || Number(r.payable) <= 0}
                className="ml-auto rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
              >
                Pay {formatNaira(Number(r.payable))}
              </button>
            </div>
            {r.lastPaidAt && (
              <p className="mt-2 text-[10px] text-muted-foreground">
                Last paid {new Date(r.lastPaidAt).toLocaleDateString()}
              </p>
            )}
          </div>
        ))
      )}
    </div>
  )
}

function SalaryConfigEditor({ cfg, onSaved }: { cfg: SalaryCfg; onSaved: () => void }) {
  const [pending, startTransition] = useTransition()
  const [ratePerPoint, setRate] = useState(String(cfg.ratePerPoint))
  const [maxWeekly, setMax] = useState(String(cfg.maxWeekly))
  const [windowDays, setWindow] = useState(String(cfg.windowDays))
  const [autoQualifyMin, setAutoMin] = useState(String(cfg.autoQualifyMin))
  const [tiers, setTiers] = useState(cfg.planTiers)

  const updateTier = (i: number, key: "minPrice" | "points", val: string) =>
    setTiers((t) => t.map((row, idx) => (idx === i ? { ...row, [key]: Number(val) } : row)))
  const addTier = () => setTiers((t) => [...t, { minPrice: 0, points: 1 }])
  const removeTier = (i: number) => setTiers((t) => t.filter((_, idx) => idx !== i))

  function save() {
    startTransition(async () => {
      try {
        await saveSalaryConfig({
          ratePerPoint: Number(ratePerPoint),
          maxWeekly: Number(maxWeekly),
          windowDays: Number(windowDays),
          autoQualifyMin: Number(autoQualifyMin),
          planTiers: [...tiers].sort((a, b) => a.minPrice - b.minPrice),
        })
        toast.success("Salary settings saved")
      } catch {
        toast.error("Failed to save")
      }
      onSaved()
    })
  }

  const fieldCls = "w-full rounded-xl border-2 border-ink bg-surface px-3 py-2.5 text-sm font-semibold outline-none focus:border-primary"
  const labelCls = "mb-1 block text-xs font-bold uppercase tracking-wide text-muted-foreground"

  return (
    <div className="flex flex-col gap-4 rounded-2xl border-2 border-ink bg-card p-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Rate per point (₦)</label>
          <input type="number" value={ratePerPoint} onChange={(e) => setRate(e.target.value)} className={fieldCls} min={0} />
        </div>
        <div>
          <label className={labelCls}>Weekly max (₦)</label>
          <input type="number" value={maxWeekly} onChange={(e) => setMax(e.target.value)} className={fieldCls} min={0} />
        </div>
        <div>
          <label className={labelCls}>Window (days)</label>
          <input type="number" value={windowDays} onChange={(e) => setWindow(e.target.value)} className={fieldCls} min={1} />
        </div>
        <div>
          <label className={labelCls}>Auto-qualify min refs</label>
          <input type="number" value={autoQualifyMin} onChange={(e) => setAutoMin(e.target.value)} className={fieldCls} min={1} />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Package point brackets</p>
          <button onClick={addTier} className="flex items-center gap-1 rounded-lg border-2 border-ink bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {tiers.map((t, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="flex-1">
                <label className={labelCls}>Min package price (₦)</label>
                <input type="number" value={t.minPrice} onChange={(e) => updateTier(i, "minPrice", e.target.value)} className={fieldCls} min={0} />
              </div>
              <div className="w-24">
                <label className={labelCls}>Points</label>
                <input type="number" value={t.points} onChange={(e) => updateTier(i, "points", e.target.value)} className={fieldCls} min={0} />
              </div>
              <button
                onClick={() => removeTier(i)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2 border-ink bg-destructive/10 text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={save}
        disabled={pending}
        className="flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />} Save Settings
      </button>
    </div>
  )
}

// ── Promotions Tab ────────────────────────────────────────────────────────────
type PromoRow = {
  id: number
  name: string
  description: string | null
  conditionValue: string
  bonusType: string
  bonusValue: string
  firstPurchaseOnly: boolean
  maxRedemptions: number | null
  redemptions: number
  isActive: boolean
}

function PromotionsTab() {
  const [rows, setRows] = useState<PromoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({
    name: "",
    description: "",
    conditionValue: String(SITE.launchPromo.packagePrice),
    bonusType: "percent" as "percent" | "fixed",
    bonusValue: String(SITE.launchPromo.cashbackPercent),
    firstPurchaseOnly: true,
    maxRedemptions: "",
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows((await listPromos()) as PromoRow[])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function create() {
    startTransition(async () => {
      const res = await createPromo({
        name: form.name,
        description: form.description,
        conditionValue: Number(form.conditionValue),
        bonusType: form.bonusType,
        bonusValue: Number(form.bonusValue),
        firstPurchaseOnly: form.firstPurchaseOnly,
        maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : null,
      })
      res.ok ? toast.success(res.message) : toast.error(res.message)
      if (res.ok) {
        setForm((f) => ({ ...f, name: "", description: "" }))
        load()
      }
    })
  }

  function toggle(id: number, isActive: boolean) {
    startTransition(async () => {
      await togglePromo(id, isActive)
      load()
    })
  }

  function remove(id: number) {
    startTransition(async () => {
      const res = await deletePromo(id)
      res.ok ? toast.success(res.message) : toast.error(res.message)
      load()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Create promo */}
      <div className="rounded-2xl border-2 border-ink bg-card p-4">
        <p className="mb-3 flex items-center gap-2 text-sm font-bold">
          <Megaphone className="h-4 w-4 text-primary" /> Create Promotion
        </p>
        <div className="flex flex-col gap-2">
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Promo name (e.g. Launch Cashback)"
            className="rounded-xl border-2 border-ink bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <input
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Description (optional)"
            className="rounded-xl border-2 border-ink bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            Min package price (₦)
          </label>
          <input
            value={form.conditionValue}
            onChange={(e) => setForm((f) => ({ ...f, conditionValue: e.target.value }))}
            inputMode="numeric"
            placeholder="Min package price"
            className="rounded-xl border-2 border-ink bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            <select
              value={form.bonusType}
              onChange={(e) => setForm((f) => ({ ...f, bonusType: e.target.value as "percent" | "fixed" }))}
              className="rounded-xl border-2 border-ink bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
            >
              <option value="percent">Percent %</option>
              <option value="fixed">Fixed ₦</option>
            </select>
            <input
              value={form.bonusValue}
              onChange={(e) => setForm((f) => ({ ...f, bonusValue: e.target.value }))}
              inputMode="numeric"
              placeholder={form.bonusType === "percent" ? "Cashback %" : "Cashback ₦"}
              className="flex-1 rounded-xl border-2 border-ink bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="flex gap-2">
            <input
              value={form.maxRedemptions}
              onChange={(e) => setForm((f) => ({ ...f, maxRedemptions: e.target.value }))}
              inputMode="numeric"
              placeholder="Max redemptions (blank = unlimited)"
              className="flex-1 rounded-xl border-2 border-ink bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, firstPurchaseOnly: !f.firstPurchaseOnly }))}
              className="flex items-center gap-1.5 rounded-xl border-2 border-ink bg-surface px-3 py-2.5 text-xs font-semibold text-muted-foreground"
            >
              {form.firstPurchaseOnly ? (
                <ToggleRight className="h-4 w-4 text-success" />
              ) : (
                <ToggleLeft className="h-4 w-4" />
              )}
              First buy only
            </button>
          </div>
          <button
            onClick={create}
            disabled={pending}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Create Promo
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <Empty label="No promotions yet" />
      ) : (
        rows.map((p) => (
          <div key={p.id} className="rounded-2xl border-2 border-ink bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{p.name}</p>
                {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
              </div>
              <StatusBadge status={p.isActive ? "completed" : "failed"} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-surface px-2.5 py-1.5">
                <p className="text-muted-foreground">Min buy</p>
                <p className="font-bold tabular-nums">{formatNaira(Number(p.conditionValue))}</p>
              </div>
              <div className="rounded-lg bg-surface px-2.5 py-1.5">
                <p className="text-muted-foreground">Cashback</p>
                <p className="font-bold tabular-nums">
                  {p.bonusType === "percent" ? `${Number(p.bonusValue)}%` : formatNaira(Number(p.bonusValue))}
                </p>
              </div>
              <div className="rounded-lg bg-surface px-2.5 py-1.5">
                <p className="text-muted-foreground">Redeemed</p>
                <p className="font-bold tabular-nums">
                  {p.redemptions}
                  {p.maxRedemptions ? ` / ${p.maxRedemptions}` : ""}
                </p>
              </div>
              <div className="rounded-lg bg-surface px-2.5 py-1.5">
                <p className="text-muted-foreground">Scope</p>
                <p className="font-bold">{p.firstPurchaseOnly ? "First buy" : "Any buy"}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => toggle(p.id, !p.isActive)}
                disabled={pending}
                className="flex items-center gap-1 rounded-lg border-2 border-ink bg-surface px-2.5 py-1.5 text-xs font-semibold text-muted-foreground disabled:opacity-60"
              >
                {p.isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {p.isActive ? "Pause" : "Activate"}
              </button>
              <button
                onClick={() => remove(p.id)}
                disabled={pending}
                className="ml-auto flex items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs font-semibold text-destructive disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
