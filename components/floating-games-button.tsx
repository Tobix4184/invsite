"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { Dices, Ticket, X } from "lucide-react"

export function FloatingGamesButton() {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; moved: boolean }>({ startX: 0, startY: 0, moved: false })
  const btnRef = useRef<HTMLDivElement>(null)

  // Initial position: right side, above bottom nav
  useEffect(() => {
    setPos({ x: window.innerWidth - 72, y: window.innerHeight - 160 })
  }, [])

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX - pos.x, startY: e.clientY - pos.y, moved: false }
    setDragging(true)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    // Mark as drag if moved more than 6px
    if (Math.abs(dx - pos.x) > 6 || Math.abs(dy - pos.y) > 6) {
      dragRef.current.moved = true
    }
    const maxX = window.innerWidth - 56
    const maxY = window.innerHeight - 56
    setPos({ x: Math.max(0, Math.min(dx, maxX)), y: Math.max(0, Math.min(dy, maxY)) })
  }

  function onPointerUp() {
    setDragging(false)
    if (!dragRef.current.moved) {
      setOpen((o) => !o)
    }
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        ref={btnRef}
        style={{ left: pos.x, top: pos.y, touchAction: "none" }}
        className="fixed z-50 select-none"
      >
        {/* Expanded options — float above the button */}
        {open && (
          <div className="absolute bottom-16 right-0 flex flex-col items-end gap-2.5 animate-pop-in">
            <Link
              href="/games?game=spin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-2xl border-2 border-ink bg-gold px-4 py-2.5 shadow-[3px_3px_0_0_var(--ink)]"
            >
              <span className="text-xs font-black uppercase tracking-wide text-ink">Stake &amp; Spin</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-ink bg-ink/10">
                <Dices className="h-4 w-4 text-ink" />
              </span>
            </Link>

            <Link
              href="/games?game=draw"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-2xl border-2 border-ink bg-success px-4 py-2.5 shadow-[3px_3px_0_0_var(--ink)]"
            >
              <span className="text-xs font-black uppercase tracking-wide text-ink">Lucky Draw</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-ink bg-ink/10">
                <Ticket className="h-4 w-4 text-ink" />
              </span>
            </Link>
          </div>
        )}

        {/* The draggable floating button */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className={`relative flex h-14 w-14 cursor-grab items-center justify-center rounded-full border-2 border-ink bg-primary shadow-[4px_4px_0_0_var(--ink)] transition-transform active:scale-95 ${dragging ? "cursor-grabbing" : ""}`}
        >
          {/* Outer ring pulse */}
          <span className="absolute inset-0 rounded-full animate-ping bg-primary opacity-30" />

          {/* Spinning wheel SVG */}
          {!open ? (
            <svg
              viewBox="0 0 48 48"
              className="h-8 w-8 animate-spin-slow"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Wheel segments */}
              {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                <path
                  key={i}
                  d={describeSlice(24, 24, 22, angle, angle + 60)}
                  fill={i % 2 === 0 ? "var(--primary-foreground)" : "var(--gold)"}
                  stroke="var(--ink)"
                  strokeWidth="1"
                />
              ))}
              {/* Center hub */}
              <circle cx="24" cy="24" r="5" fill="var(--ink)" />
              <circle cx="24" cy="24" r="3" fill="var(--primary-foreground)" />
            </svg>
          ) : (
            <X className="h-6 w-6 text-primary-foreground" />
          )}
        </div>
      </div>
    </>
  )
}

/** SVG pie slice path helper */
function describeSlice(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const toRad = (d: number) => ((d - 90) * Math.PI) / 180
  const x1 = cx + r * Math.cos(toRad(startDeg))
  const y1 = cy + r * Math.sin(toRad(startDeg))
  const x2 = cx + r * Math.cos(toRad(endDeg))
  const y2 = cy + r * Math.sin(toRad(endDeg))
  return `M${cx},${cy} L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z`
}
