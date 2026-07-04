"use client"

import { useRef, useState, useTransition } from "react"
import {
  Star,
  CheckCircle2,
  Clock,
  ChevronRight,
  Wallet,
  TrendingUp,
  ListChecks,
  Sparkles,
  Gift,
  Upload,
  Hourglass,
  ImageIcon,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { submitTask } from "@/app/actions/tasks"
import { uploadProofImage } from "@/app/actions/upload"
import { formatNaira } from "@/lib/plans"
import type { getTasksForUser, getTaskStats } from "@/app/actions/tasks"

type TaskWithMeta = Awaited<ReturnType<typeof getTasksForUser>>[number]
type Stats = Awaited<ReturnType<typeof getTaskStats>>

// ─── Reward chips ─────────────────────────────────────────────────────────────

function RewardChips({ task, className = "" }: { task: TaskWithMeta; className?: string }) {
  const cash = Number(task.reward)
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {cash > 0 && (
        <span className="rounded-lg border-2 border-ink bg-primary px-2 py-0.5 text-xs font-black text-primary-foreground">
          {formatNaira(cash)}
        </span>
      )}
      {task.rewardSpins > 0 && (
        <span className="flex items-center gap-1 rounded-lg border-2 border-ink bg-accent px-2 py-0.5 text-xs font-black text-accent-foreground">
          <Sparkles className="h-3 w-3" /> {task.rewardSpins} spin{task.rewardSpins > 1 ? "s" : ""}
        </span>
      )}
      {task.rewardScratch > 0 && (
        <span className="flex items-center gap-1 rounded-lg border-2 border-ink bg-success px-2 py-0.5 text-xs font-black text-success-foreground">
          <Gift className="h-3 w-3" /> {task.rewardScratch} card{task.rewardScratch > 1 ? "s" : ""}
        </span>
      )}
      {cash === 0 && task.rewardSpins === 0 && task.rewardScratch === 0 && (
        <span className="rounded-lg border-2 border-ink bg-secondary px-2 py-0.5 text-xs font-black">Reward</span>
      )}
    </div>
  )
}

// ─── Star Rating Input ───────────────────────────────────────────────────────

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform active:scale-90"
        >
          <Star
            className="h-8 w-8"
            fill={(hover || value) >= n ? "#F59E0B" : "transparent"}
            stroke={(hover || value) >= n ? "#F59E0B" : "#9CA3AF"}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  )
}

// ─── Task Modal ───────────────────────────────────────────────────────────────

type Step = "detail" | "rating" | "proof"

function TaskModal({ task, onClose }: { task: TaskWithMeta; onClose: () => void }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [proofUrl, setProofUrl] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const isRating = task.taskType === "rating"
  const fields: string[] = task.fields ? JSON.parse(task.fields) : ["Quality", "Service", "Value"]
  const [ratings, setRatings] = useState<Record<string, number>>(() =>
    Object.fromEntries(fields.map((f) => [f, 5])),
  )
  const [step, setStep] = useState<Step>("detail")

  // Build the ordered list of steps this task requires
  const steps: Step[] = ["detail"]
  if (isRating) steps.push("rating")
  if (task.requireProof) steps.push("proof")

  function goNext() {
    const idx = steps.indexOf(step)
    if (idx < steps.length - 1) setStep(steps[idx + 1])
    else handleSubmit()
  }
  function goBack() {
    const idx = steps.indexOf(step)
    if (idx > 0) setStep(steps[idx - 1])
    else onClose()
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
    setUploading(true)
    const fd = new FormData()
    fd.append("file", file)
    const res = await uploadProofImage(fd)
    setUploading(false)
    if (res.ok && res.url) {
      setProofUrl(res.url)
      toast.success("Proof uploaded")
    } else {
      setProofUrl(null)
      setPreview(null)
      toast.error(res.message ?? "Upload failed")
    }
  }

  function handleSubmit() {
    if (task.requireProof && !proofUrl) {
      toast.error("Please upload the required proof image")
      setStep("proof")
      return
    }
    startTransition(async () => {
      const res = await submitTask(task.id, isRating ? { ratings } : {}, proofUrl ?? undefined)
      if (res.ok) {
        toast.success(res.message)
        router.refresh()
        onClose()
      } else {
        toast.error(res.message)
      }
    })
  }

  const isLast = steps.indexOf(step) === steps.length - 1
  const ratingsValid = !isRating || Object.values(ratings).every((r) => r >= 4)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl border-x-2 border-t-2 border-ink bg-card shadow-[0_-4px_0_0_var(--ink)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-ink bg-card px-5 py-4">
          <button onClick={goBack} className="text-sm font-bold text-muted-foreground">
            {steps.indexOf(step) === 0 ? "Close" : "Back"}
          </button>
          <span className="text-sm font-black uppercase tracking-wide">
            {step === "detail" ? "Task Detail" : step === "rating" ? "Submit Rating" : "Upload Proof"}
          </span>
          <span className="w-10" />
        </div>

        {step === "detail" && (
          <div className="flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between rounded-2xl border-2 border-ink bg-primary/10 px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Task Reward</p>
                <RewardChips task={task} className="mt-1.5" />
              </div>
              <div className="rounded-xl border-2 border-ink bg-primary px-3 py-1.5">
                <p className="text-xs font-black uppercase tracking-wide text-primary-foreground">
                  {task.requireProof || task.requireApproval ? "Review" : "Instant"}
                </p>
              </div>
            </div>

            {task.imageUrl && (
              <img
                src={task.imageUrl || "/placeholder.svg"}
                alt={task.title}
                className="h-36 w-full rounded-2xl border-2 border-ink object-cover"
              />
            )}

            <div className="rounded-2xl border-2 border-ink bg-secondary p-4">
              <h2 className="text-base font-black">{task.title}</h2>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {task.description}
              </p>
            </div>

            {(task.requireProof || task.requireApproval) && (
              <div className="flex items-start gap-2 rounded-2xl border-2 border-ink bg-accent/10 p-3">
                <Hourglass className="mt-0.5 h-4 w-4 shrink-0 text-accent-foreground" />
                <p className="text-xs font-semibold text-muted-foreground">
                  This task is reviewed by an admin. Your reward is credited once your submission is approved.
                </p>
              </div>
            )}

            <button
              onClick={goNext}
              className="w-full rounded-2xl border-2 border-ink bg-primary py-3.5 text-sm font-black uppercase tracking-wider text-primary-foreground shadow-[3px_3px_0_0_var(--ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              {steps.length === 1 ? (pending ? "Submitting..." : "Complete Task") : "Continue"}
            </button>
          </div>
        )}

        {step === "rating" && (
          <div className="flex flex-col gap-4 p-5">
            <p className="text-center text-sm font-bold text-muted-foreground">
              Please submit your review (minimum 4 stars)
            </p>
            {fields.map((field) => (
              <div key={field}>
                <p className="mb-2 text-sm font-bold text-primary">{field}</p>
                <div className="flex justify-center rounded-2xl border-2 border-ink bg-secondary py-3">
                  <StarRating
                    value={ratings[field] ?? 5}
                    onChange={(v) => setRatings((prev) => ({ ...prev, [field]: v }))}
                  />
                </div>
              </div>
            ))}
            <button
              onClick={goNext}
              disabled={!ratingsValid}
              className="mt-1 w-full rounded-2xl border-2 border-ink bg-primary py-3.5 text-sm font-black uppercase tracking-wider text-primary-foreground shadow-[3px_3px_0_0_var(--ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60"
            >
              {isLast ? (pending ? "Submitting..." : "Submit") : "Continue"}
            </button>
            {!ratingsValid && (
              <p className="text-center text-xs font-semibold text-destructive">All ratings must be at least 4 stars</p>
            )}
          </div>
        )}

        {step === "proof" && (
          <div className="flex flex-col gap-4 p-5">
            <div className="rounded-2xl border-2 border-ink bg-accent/10 p-4">
              <p className="text-sm font-bold text-foreground">
                {task.proofLabel || "Upload a clear screenshot or photo as proof to complete this task."}
              </p>
            </div>

            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

            {preview ? (
              <div className="relative">
                <img
                  src={preview || "/placeholder.svg"}
                  alt="Proof preview"
                  className="max-h-64 w-full rounded-2xl border-2 border-ink object-contain bg-secondary"
                />
                <button
                  onClick={() => {
                    setPreview(null)
                    setProofUrl(null)
                    if (fileRef.current) fileRef.current.value = ""
                  }}
                  className="absolute right-2 top-2 rounded-full border-2 border-ink bg-card p-1"
                  aria-label="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 text-sm font-black text-white">
                    Uploading...
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-ink bg-secondary py-10 text-muted-foreground"
              >
                <Upload className="h-8 w-8" />
                <span className="text-sm font-bold">Tap to upload image</span>
                <span className="text-xs">JPG, PNG or WEBP — max 8 MB</span>
              </button>
            )}

            <button
              onClick={handleSubmit}
              disabled={pending || uploading || !proofUrl}
              className="w-full rounded-2xl border-2 border-ink bg-primary py-3.5 text-sm font-black uppercase tracking-wider text-primary-foreground shadow-[3px_3px_0_0_var(--ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60"
            >
              {pending ? "Submitting..." : "Submit for Review"}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({ task, onClick }: { task: TaskWithMeta; onClick: () => void }) {
  const done = !task.canDo
  const isPending = task.pendingCount > 0 && task.completedCount === 0
  return (
    <button
      onClick={done ? undefined : onClick}
      disabled={done}
      className="relative flex w-full items-center gap-3 rounded-2xl border-2 border-ink bg-card p-4 text-left shadow-[3px_3px_0_0_var(--ink)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-70"
    >
      {task.imageUrl ? (
        <img
          src={task.imageUrl || "/placeholder.svg"}
          alt=""
          className="h-14 w-14 shrink-0 rounded-xl border-2 border-ink object-cover"
        />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-primary/10">
          {task.requireProof ? (
            <ImageIcon className="h-6 w-6 text-primary" />
          ) : (
            <Star className="h-6 w-6 text-primary" />
          )}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black">{task.title}</p>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{task.description}</p>
        <RewardChips task={task} className="mt-1.5" />
      </div>
      {isPending ? (
        <span className="flex shrink-0 items-center gap-1 rounded-lg border-2 border-ink bg-accent px-2 py-1 text-[10px] font-black uppercase text-accent-foreground">
          <Hourglass className="h-3 w-3" /> Pending
        </span>
      ) : done ? (
        <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
      ) : (
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
      )}
    </button>
  )
}

// ─── Task Center ──────────────────────────────────────────────────────────────

export function TaskCenter({ tasks, stats }: { tasks: TaskWithMeta[]; stats: Stats }) {
  const [selected, setSelected] = useState<TaskWithMeta | null>(null)

  const available = tasks.filter((t) => t.canDo)
  const completed = tasks.filter((t) => !t.canDo)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <div className="border-b-2 border-ink bg-card px-4 pb-5 pt-14">
        <div className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-primary" strokeWidth={2.5} />
          <h1 className="text-lg font-black uppercase tracking-wide">Task Center</h1>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">Complete tasks. Earn rewards.</p>

        {/* Stats row */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border-2 border-ink bg-primary/10 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <TrendingUp className="h-3 w-3" /> Today&apos;s Earnings
            </div>
            <p className="mt-1 text-xl font-black tabular-nums text-primary">{formatNaira(stats.todayEarned)}</p>
          </div>
          <div className="rounded-2xl border-2 border-ink bg-secondary p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <Wallet className="h-3 w-3" /> Total Earned
            </div>
            <p className="mt-1 text-xl font-black tabular-nums">{formatNaira(stats.totalEarned)}</p>
          </div>
        </div>

        {stats.pendingCount > 0 && (
          <div className="mt-3 flex items-center gap-2 rounded-2xl border-2 border-ink bg-accent/10 p-3">
            <Hourglass className="h-4 w-4 text-accent-foreground" />
            <p className="text-xs font-bold text-muted-foreground">
              {stats.pendingCount} submission{stats.pendingCount > 1 ? "s" : ""} awaiting admin approval
            </p>
          </div>
        )}
      </div>

      {/* Task list */}
      <div className="flex flex-col gap-3 p-4 pb-28">
        {available.length === 0 && completed.length === 0 && (
          <div className="mt-12 flex flex-col items-center gap-3 text-center">
            <Clock className="h-12 w-12 text-muted-foreground/40" />
            <p className="font-bold text-muted-foreground">No tasks available right now</p>
            <p className="text-sm text-muted-foreground">Check back later for new tasks from the admin.</p>
          </div>
        )}

        {available.length > 0 && (
          <>
            <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Available</p>
            {available.map((t) => (
              <TaskCard key={t.id} task={t} onClick={() => setSelected(t)} />
            ))}
          </>
        )}

        {completed.length > 0 && (
          <>
            <p className="mt-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground">
              Completed &amp; Pending
            </p>
            {completed.map((t) => (
              <TaskCard key={t.id} task={t} onClick={() => {}} />
            ))}
          </>
        )}
      </div>

      {selected && <TaskModal task={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
