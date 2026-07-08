"use client"

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="press flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-ink bg-primary py-2.5 text-[12px] font-black uppercase tracking-widest text-primary-foreground shadow-[3px_3px_0_0_var(--ink)]"
    >
      Save / Print
    </button>
  )
}
