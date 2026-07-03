"use client"

import { useState, useTransition } from "react"
import { Star, CheckCircle2, Clock, ChevronRight, Wallet, TrendingUp, ListChecks } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { submitTask } from "@/app/actions/tasks"
import { formatNaira } from "@/lib/plans"
import type { getTasksForUser, getTaskStats } from "@/app/actions/tasks"

type TaskWithMeta = Awaited<ReturnType<typeof getTasksForUser>>[number]
type Stats = Awaited<ReturnType<typeof getTaskStats>>

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

function TaskModal({
  task,
  onClose,
}: {
  task: TaskWithMeta
  onClose: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [step, setStep] = useState<"detail" | "rating">("detail")
  const fields: string[] = task.fields ? JSON.parse(task.fields) : ["Quality", "Service", "Value"]
  const [ratings, setRatings] = useState<Record<string, number>>(() =>
    Object.fromEntries(fields.map((f) => [f, 5]))
  )

  function handleSubmit() {
    startTransition(async () => {
      const res = await submitTask(task.id, { ratings })
      if (res.ok) {
        toast.success(res.message)
        router.refresh()
        onClose()
      } else {
        toast.error(res.message)
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl border-t-2 border-x-2 border-ink bg-card shadow-[0_-4px_0_0_var(--ink)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-ink px-5 py-4">
          <button onClick={step === "rating" ? () => setStep("detail") : onClose} className="text-sm font-bold text-muted-foreground">
            {step === "rating" ? "Back" : "Close"}
          </button>
          <span className="text-sm font-black uppercase tracking-wide">
            {step === "detail" ? "Task Detail" : "Submit Rating"}
          </span>
          <span className="w-10" />
        </div>

        {step === "detail" ? (
          <div className="flex flex-col gap-4 p-5">
            {/* Reward badge */}
            <div className="flex items-center justify-between rounded-2xl border-2 border-ink bg-primary/10 px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Task Reward</p>
                <p className="text-2xl font-black text-primary">{formatNaira(Number(task.reward))}</p>
              </div>
              <div className="rounded-xl border-2 border-ink bg-primary px-3 py-1.5">
                <p className="text-xs font-black uppercase tracking-wide text-primary-foreground">Instant</p>
              </div>
            </div>

            {/* Image if present */}
            {task.imageUrl && (
              <img
                src={task.imageUrl}
                alt={task.title}
                className="h-36 w-full rounded-2xl border-2 border-ink object-cover"
              />
            )}

            {/* Title + description */}
            <div className="rounded-2xl border-2 border-ink bg-secondary p-4">
              <h2 className="text-base font-black">{task.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{task.description}</p>
            </div>

            <button
              onClick={() => setStep("rating")}
              className="w-full rounded-2xl border-2 border-ink bg-primary py-3.5 text-sm font-black uppercase tracking-wider text-primary-foreground shadow-[3px_3px_0_0_var(--ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              Fill in the Rating
            </button>
          </div>
        ) : (
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
              onClick={handleSubmit}
              disabled={pending || Object.values(ratings).some((r) => r < 4)}
              className="mt-1 w-full rounded-2xl border-2 border-ink bg-primary py-3.5 text-sm font-black uppercase tracking-wider text-primary-foreground shadow-[3px_3px_0_0_var(--ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60"
            >
              {pending ? "Submitting..." : "Submit Rating"}
            </button>
            {Object.values(ratings).some((r) => r < 4) && (
              <p className="text-center text-xs text-destructive font-semibold">All ratings must be at least 4 stars</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({ task, onClick }: { task: TaskWithMeta; onClick: () => void }) {
  const done = !task.canDo
  return (
    <button
      onClick={done ? undefined : onClick}
      disabled={done}
      className="relative flex w-full items-center gap-3 rounded-2xl border-2 border-ink bg-card p-4 text-left shadow-[3px_3px_0_0_var(--ink)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-70"
    >
      {task.imageUrl ? (
        <img src={task.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl border-2 border-ink object-cover" />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-primary/10">
          <Star className="h-6 w-6 text-primary" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black">{task.title}</p>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{task.description}</p>
        <p className="mt-1 text-sm font-black text-primary">{formatNaira(Number(task.reward))}</p>
      </div>
      {done ? (
        <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
      ) : (
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
      )}
    </button>
  )
}

// ─── Task Center ──────────────────────────────────────────────────────────────

export function TaskCenter({
  tasks,
  stats,
}: {
  tasks: TaskWithMeta[]
  stats: Stats
}) {
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
        <p className="mt-0.5 text-xs text-muted-foreground">Complete tasks. Earn instantly.</p>

        {/* Stats row */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border-2 border-ink bg-primary/10 p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <TrendingUp className="h-3 w-3" /> Today&apos;s Commission
            </div>
            <p className="mt-1 text-xl font-black text-primary tabular-nums">{formatNaira(stats.todayEarned)}</p>
          </div>
          <div className="rounded-2xl border-2 border-ink bg-secondary p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <Wallet className="h-3 w-3" /> Total Earned
            </div>
            <p className="mt-1 text-xl font-black tabular-nums">{formatNaira(stats.totalEarned)}</p>
          </div>
        </div>

        {/* Progress bar */}
        {tasks.length > 0 && (
          <div className="mt-4 rounded-2xl border-2 border-ink bg-secondary p-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>Task Progress</span>
              <span className="text-primary">{completed.length}/{tasks.length}</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full border border-ink bg-background">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${tasks.length ? (completed.length / tasks.length) * 100 : 0}%` }}
              />
            </div>
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
            <p className="mt-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground">Completed</p>
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
