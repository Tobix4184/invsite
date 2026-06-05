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
  signinBonusGiven: boolean("signinBonusGiven").notNull().default(false),
  savedBankName: text("savedBankName"),
  savedAccountName: text("savedAccountName"),
  savedAccountNumber: text("savedAccountNumber"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})

export const wallet = pgTable("wallet", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull().unique(),
  balance: numeric("balance", { precision: 14, scale: 2 }).notNull().default("0"),
  totalDeposited: numeric("totalDeposited", { precision: 14, scale: 2 }).notNull().default("0"),
  totalWithdrawn: numeric("totalWithdrawn", { precision: 14, scale: 2 }).notNull().default("0"),
  totalEarned: numeric("totalEarned", { precision: 14, scale: 2 }).notNull().default("0"),
  referralEarnings: numeric("referralEarnings", { precision: 14, scale: 2 }).notNull().default("0"),
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
