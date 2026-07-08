import {
  pgTable,
  text,
  timestamp,
  boolean,
  serial,
  integer,
  numeric,
} from "drizzle-orm/pg-core"

// ---------- Better Auth tables ----------
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
})

// Alias for backwards compatibility
export { user as userTable }

// ---------- App tables ----------
export const profile = pgTable("profile", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull().unique(),
  phone: text("phone"),
  inviteCode: text("inviteCode").notNull().unique(),
  referredBy: text("referredBy"),
  role: text("role").notNull().default("user"),
  isPromoter: boolean("isPromoter").notNull().default(false),
  promoterCommission: integer("promoterCommission"), // nullable – override for this user's L1 promoter rate
  // Admin override for withdrawal tier ("tier1" | "tier2" | "tier3"); null = derive from active packages
  withdrawalTierOverride: text("withdrawalTierOverride"),
  signinBonusGiven: boolean("signinBonusGiven").notNull().default(false),
  // Launch/first-purchase cashback promo already claimed?
  promoClaimed: boolean("promoClaimed").notNull().default(false),
  savedBankName: text("savedBankName"),
  savedAccountName: text("savedAccountName"),
  savedAccountNumber: text("savedAccountNumber"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// ── Promoter salary system ───────────────────────────────────────────────────
// Promoters earn a fixed weekly salary instead of extra referral commission.
export const promoterSalary = pgTable("promoter_salary", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull().unique(),
  // Manual override amount (used only when manualOverride = true)
  weeklyAmount: numeric("weeklyAmount", { precision: 14, scale: 2 }).notNull().default("0"),
  isActive: boolean("isActive").notNull().default(true),
  // When true, weeklyAmount is used directly instead of the computed algorithm amount
  manualOverride: boolean("manual_override").notNull().default(false),
  // Whether this promoter was auto-qualified by activity (vs manually added by admin)
  autoQualified: boolean("auto_qualified").notNull().default(false),
  note: text("note"),
  lastPaidAt: timestamp("lastPaidAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const salaryPayment = pgTable("salary_payment", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  note: text("note"),
  paidAt: timestamp("paidAt").notNull().defaultNow(),
})

// ── Promotions ───────────────────────────────────────────────────────────────
// Admin-controlled promos: buy a package meeting a condition, get cashback bonus.
export const promo = pgTable("promo", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  // "min_package_price" — user must buy a package with price >= conditionValue
  conditionType: text("conditionType").notNull().default("min_package_price"),
  conditionValue: numeric("conditionValue", { precision: 14, scale: 2 }).notNull().default("0"),
  // "percent" | "fixed"
  bonusType: text("bonusType").notNull().default("percent"),
  bonusValue: numeric("bonusValue", { precision: 14, scale: 2 }).notNull().default("0"),
  // Only first-ever package purchase qualifies?
  firstPurchaseOnly: boolean("firstPurchaseOnly").notNull().default(true),
  maxRedemptions: integer("maxRedemptions"), // null = unlimited
  redemptions: integer("redemptions").notNull().default(0),
  isActive: boolean("isActive").notNull().default(true),
  startsAt: timestamp("startsAt"),
  endsAt: timestamp("endsAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const promoRedemption = pgTable("promo_redemption", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  promoId: integer("promoId").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  redeemedAt: timestamp("redeemedAt").notNull().defaultNow(),
})

export const wallet = pgTable("wallet", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull().unique(),
  balance: numeric("balance", { precision: 14, scale: 2 }).notNull().default("0"),
  totalDeposited: numeric("totalDeposited", { precision: 14, scale: 2 }).notNull().default("0"),
  totalWithdrawn: numeric("totalWithdrawn", { precision: 14, scale: 2 }).notNull().default("0"),
  totalEarned: numeric("totalEarned", { precision: 14, scale: 2 }).notNull().default("0"),
  referralEarnings: numeric("referralEarnings", { precision: 14, scale: 2 }).notNull().default("0"),
  // Weekend salary points — convert to ₦ every Saturday (10 pts = ₦5 by default)
  weekendPoints: integer("weekend_points").notNull().default(0),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const investment = pgTable("investment", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  planId: integer("planId").notNull(),
  planName: text("planName").notNull(),
  price: numeric("price", { precision: 14, scale: 2 }).notNull(),
  dailyEarning: numeric("dailyEarning", { precision: 14, scale: 2 }).notNull(),
  totalEarning: numeric("totalEarning", { precision: 14, scale: 2 }).notNull(),
  durationDays: integer("durationDays").notNull(),
  daysPaid: integer("daysPaid").notNull().default(0),
  amountEarned: numeric("amountEarned", { precision: 14, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("active"),
  autoReinvest: boolean("autoReinvest").notNull().default(false),
  lastPayoutAt: timestamp("lastPayoutAt").notNull().defaultNow(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const transaction = pgTable("transaction", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  type: text("type").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  status: text("status").notNull().default("completed"),
  description: text("description"),
  reference: text("reference"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const deposit = pgTable("deposit", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  reference: text("reference").notNull().unique(),
  status: text("status").notNull().default("pending"),
  // Bank account assigned for this deposit
  bankAccountId: integer("bankAccountId"),
  assignedBankName: text("assignedBankName"),
  assignedAccountNumber: text("assignedAccountNumber"),
  assignedAccountName: text("assignedAccountName"),
  // Sender name for verification (optional)
  senderName: text("senderName"),
  // Sabuss's own transaction reference (e.g. 000010260606070124411111104069021)
  // stored when the webhook arrives — used to query Sabuss by their reference
  sabussRef: text("sabussRef"),
  expiresAt: timestamp("expiresAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const withdrawal = pgTable("withdrawal", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  charge: numeric("charge", { precision: 14, scale: 2 }).notNull().default("0"),
  netAmount: numeric("netAmount", { precision: 14, scale: 2 }).notNull(),
  bankName: text("bankName"),
  accountNumber: text("accountNumber"),
  accountName: text("accountName"),
  withdrawalTier: text("withdrawalTier"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  processedAt: timestamp("processedAt"),
})

export const referral = pgTable("referral", {
  id: serial("id").primaryKey(),
  referrerId: text("referrerId").notNull(),
  referredId: text("referredId").notNull(),
  level: integer("level").notNull(),
  totalCommission: numeric("totalCommission", { precision: 14, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const dailySignin = pgTable("daily_signin", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  signedAt: timestamp("signedAt").notNull().defaultNow(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull().default("100"),
})

export const giftCode = pgTable("gift_code", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  maxUses: integer("maxUses").notNull().default(1),
  uses: integer("uses").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const giftCodeRedemption = pgTable("gift_code_redemption", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  giftCodeId: integer("giftCodeId").notNull(),
  code: text("code").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// Bank accounts pool for rotating deposit accounts
export const bankAccount = pgTable("bank_account", {
  id: serial("id").primaryKey(),
  accountNumber: text("accountNumber").notNull().unique(),
  bankName: text("bankName").notNull(),
  accountName: text("accountName").notNull(),
  label: text("label"),
  isActive: boolean("isActive").notNull().default(true),
  // Relative display weight. Higher = shown more often (weighted random).
  weight: integer("weight").notNull().default(1),
  totalDeposits: numeric("totalDeposits", { precision: 14, scale: 2 }).notNull().default("0"),
  depositCount: integer("depositCount").notNull().default(0),
  // Sabuss VTU API — each account can have its own API key for auto-detection
  // sabussApiKey: used to query transactions via Sabuss API
  // sabussSecret: optional shared secret to verify webhook payloads
  sabussApiKey: text("sabussApiKey"),
  sabussSecret: text("sabussSecret"),
  sabussPin: text("sabussPin"), // Transaction PIN required by Sabuss query API
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// Global key/value settings (e.g. deposits_paused, withdrawals_paused)
export const siteSetting = pgTable("site_setting", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

// Referral milestones - rewards for referring X number of people
export const referralMilestone = pgTable("referral_milestone", {
  id: serial("id").primaryKey(),
  referralCount: integer("referralCount").notNull().unique(),
  rewardAmount: numeric("rewardAmount", { precision: 14, scale: 2 }).notNull(),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// Track which milestones users have claimed
export const milestoneClaim = pgTable("milestone_claim", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  milestoneId: integer("milestoneId").notNull(),
  referralCount: integer("referralCount").notNull(),
  rewardAmount: numeric("rewardAmount", { precision: 14, scale: 2 }).notNull(),
  claimedAt: timestamp("claimedAt").notNull().defaultNow(),
})

// Admin-created promoter codes. Anyone registering with one of these codes
// is automatically tagged as a promoter.
// ── Games ──────────────────────────────────────────────────────────────────

// Stake & Spin: single-round bet, resolved immediately
export const stakeSpin = pgTable("stake_spin", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  stakeAmount: numeric("stakeAmount", { precision: 14, scale: 2 }).notNull(),
  outcome: text("outcome").notNull(), // "win" | "lose" | "bonus_spin"
  multiplier: numeric("multiplier", { precision: 6, scale: 3 }).notNull(),
  winAmount: numeric("winAmount", { precision: 14, scale: 2 }).notNull(),
  // Extra spins granted by this result (1 when outcome = "bonus_spin")
  spinBonus: integer("spin_bonus").notNull().default(0),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// Scratch Card: one card per qualifying referral (2 cards per referral)
export const scratchCard = pgTable("scratch_card", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  outcome: text("outcome").notNull().default("lose"), // "win" | "lose"
  winAmount: numeric("win_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// Lucky Draw: one slot = one ticket for today's draw
export const luckyDrawSlot = pgTable("lucky_draw_slot", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  source: text("source").notNull().default("free"), // "free" | "purchased"
  purchaseAmount: numeric("purchaseAmount", { precision: 14, scale: 2 }),
  drawDate: text("drawDate").notNull(), // "YYYY-MM-DD"
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// Lucky Draw: one round per day, admin triggers the draw
export const luckyDrawRound = pgTable("lucky_draw_round", {
  id: serial("id").primaryKey(),
  drawDate: text("drawDate").notNull().unique(), // "YYYY-MM-DD"
  prizePool: numeric("prizePool", { precision: 14, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("open"), // "open" | "drawn"
  winner1Id: text("winner1Id"),
  winner1Amount: numeric("winner1Amount", { precision: 14, scale: 2 }),
  winner2Id: text("winner2Id"),
  winner2Amount: numeric("winner2Amount", { precision: 14, scale: 2 }),
  winner3Id: text("winner3Id"),
  winner3Amount: numeric("winner3Amount", { precision: 14, scale: 2 }),
  executedAt: timestamp("executedAt"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

// Lock Vault: time-locked savings with a bonus on maturity
export const lockVault = pgTable("lock_vault", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  lockDays: integer("lockDays").notNull(),
  bonusPercent: numeric("bonusPercent", { precision: 6, scale: 2 }).notNull(),
  bonusAmount: numeric("bonusAmount", { precision: 14, scale: 2 }).notNull(),
  status: text("status").notNull().default("locked"), // "locked" | "completed" | "broken"
  unlocksAt: timestamp("unlocksAt").notNull(),
  penaltyAmount: numeric("penaltyAmount", { precision: 14, scale: 2 }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  completedAt: timestamp("completedAt"),
})

// ── Task Center ─────────────────────────────────────────────────────────────
// Admin creates tasks; users complete them and earn a reward credited to wallet.
export const task = pgTable("task", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  reward: numeric("reward", { precision: 14, scale: 2 }).notNull().default("0"),
  // Extra game rewards granted on approval
  rewardSpins: integer("reward_spins").notNull().default(0),
  rewardScratch: integer("reward_scratch").notNull().default(0),
  // Weekend salary points awarded to user on task approval
  rewardPoints: integer("reward_points").notNull().default(0),
  // "rating" | "review" | "social" | "custom"
  taskType: text("task_type").notNull().default("rating"),
  // JSON string: array of field labels for rating tasks e.g. ["Location","Service"]
  fields: text("fields"),
  // Targeting: "all" | "tier" | "plan"
  targetType: text("target_type").notNull().default("all"),
  // When targeted: the tier name ("tier1"|"tier2"|"tier3") or plan id (string)
  targetValue: text("target_value"),
  // Require an uploaded image proof?
  requireProof: boolean("require_proof").notNull().default(false),
  // Custom instructions for the proof upload
  proofLabel: text("proof_label"),
  // Require admin approval before rewarding (proof tasks always do)
  requireApproval: boolean("require_approval").notNull().default(true),
  // 1 = each user can do once; 0 = unlimited
  perUserLimit: integer("per_user_limit").notNull().default(1),
  // "published" | "paused" | "deleted"
  status: text("status").notNull().default("published"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const taskSubmission = pgTable("task_submission", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  taskId: integer("task_id").notNull(),
  // Submitted data as JSON
  data: text("data"),
  // Uploaded proof image (Vercel Blob URL)
  proofUrl: text("proof_url"),
  reward: numeric("reward", { precision: 14, scale: 2 }).notNull().default("0"),
  // Points credited when task was approved
  pointsAwarded: integer("points_awarded").notNull().default(0),
  // "pending" | "approved" | "rejected"
  status: text("status").notNull().default("pending"),
  reviewedAt: timestamp("reviewed_at"),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
})

// Bonus game plays granted from tasks / admin (spins or scratch cards)
export const gameGrant = pgTable("game_grant", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  kind: text("kind").notNull(), // "spin" | "scratch"
  amount: integer("amount").notNull().default(0),
  source: text("source"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
})

// Weekend salary payout log — one row per Saturday payout run
export const weekendPayout = pgTable("weekend_payout", {
  id: serial("id").primaryKey(),
  runAt: timestamp("run_at").notNull().defaultNow(),
  userCount: integer("user_count").notNull().default(0),
  totalPoints: integer("total_points").notNull().default(0),
  totalNaira: numeric("total_naira", { precision: 14, scale: 2 }).notNull().default("0"),
  note: text("note"),
})

export const promoterCode = pgTable("promoter_code", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  label: text("label"),
  isActive: boolean("isActive").notNull().default(true),
  signups: integer("signups").notNull().default(0),
  maxSignups: integer("maxSignups"),       // null = unlimited
  commissionRate: integer("commissionRate"), // null = use SITE.promoterLevel1 default
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})
