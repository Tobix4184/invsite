"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { X } from "lucide-react"

const GAMES = [
  {
    href: "/games?game=spin",
    label: "Lucky Roulette",
    emoji: "🎰",
    bg: "bg-gold",
  },
  {
    href: "/games?game=scratch",
    label: "Scratch Card",
    emoji: "🃏",
    bg: "bg-primary",
  },
]

export function FloatingGamesButton() {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; moved: boolean }>({ startX: 0, startY: 0, moved: false })
  const btnRef = useRef<HTMLDivElement>(null)

  // Initial position: right side, above bottom nav
  useEffect(() => {
    setPos({ x: window.innerWidth - 76, y: window.innerHeight - 180 })
  }, [])

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX - pos.x, startY: e.clientY - pos.y, moved: false }
    setDragging(true)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return
    const nx = e.clientX - dragRef.current.startX
    const ny = e.clientY - dragRef.current.startY
    if (Math.abs(nx - pos.x) > 6 || Math.abs(ny - pos.y) > 6) {
      dragRef.current.moved = true
    }
    setPos({
      x: Math.max(0, Math.min(nx, window.innerWidth - 60)),
      y: Math.max(0, Math.min(ny, window.innerHeight - 60)),
    })
  }

  function onPointerUp() {
    setDragging(false)
    if (!dragRef.current.moved) setOpen((o) => !o)
  }

  return (
    <>
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}

      <div
        ref={btnRef}
        style={{ left: pos.x, top: pos.y, touchAction: "none" }}
        className="fixed z-50 select-none"
      >
        {/* Expanded game options */}
        {open && (
          <div className="absolute bottom-[68px] right-0 flex flex-col items-end gap-2 animate-pop-in">
            {GAMES.map((g) => (
              <Link
                key={g.href}
                href={g.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2 rounded-2xl border-2 border-ink ${g.bg} py-2.5 pl-4 pr-3 shadow-[3px_3px_0_0_var(--ink)]`}
              >
                <span className="text-xs font-black tracking-wide text-ink whitespace-nowrap">{g.label}</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl border-2 border-ink bg-white/20 text-lg leading-none">
                  {g.emoji}
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* Draggable floating button */}
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className={`relative flex h-[60px] w-[60px] cursor-grab items-center justify-center rounded-full border-2 border-ink bg-primary shadow-[4px_4px_0_0_var(--ink)] transition-transform active:scale-95 ${dragging ? "cursor-grabbing" : ""}`}
        >
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-full animate-ping bg-primary opacity-25 pointer-events-none" />

          {open ? (
            <X className="h-6 w-6 text-primary-foreground" />
          ) : (
            /* Animated roulette wheel SVG */
            <SpinWheelIcon />
          )}
        </div>
      </div>
    </>
  )
}

function SpinWheelIcon() {
  const segments = [
    { color: "var(--primary-foreground)", label: "₦" },
    { color: "var(--gold)",               label: "★" },
    { color: "var(--success)",            label: "₦" },
    { color: "var(--primary-foreground)", label: "★" },
    { color: "var(--gold)",               label: "₦" },
    { color: "var(--success)",            label: "★" },
  ]
  const toRad = (d: number) => ((d - 90) * Math.PI) / 180
  const slice = (cx: number, cy: number, r: number, s: number, e: number) => {
    const x1 = cx + r * Math.cos(toRad(s))
    const y1 = cy + r * Math.sin(toRad(s))
    const x2 = cx + r * Math.cos(toRad(e))
    const y2 = cy + r * Math.sin(toRad(e))
    return `M${cx},${cy} L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z`
  }
  const n = segments.length
  const step = 360 / n

  return (
    <svg viewBox="0 0 48 48" className="h-9 w-9 animate-spin-slow drop-shadow" fill="none">
      {segments.map((seg, i) => (
        <path
          key={i}
          d={slice(24, 24, 21, i * step, (i + 1) * step)}
          fill={seg.color}
          stroke="var(--ink)"
          strokeWidth="1.2"
        />
      ))}
      {/* outer ring */}
      <circle cx="24" cy="24" r="21" fill="none" stroke="var(--ink)" strokeWidth="1.5" />
      {/* center hub */}
      <circle cx="24" cy="24" r="5" fill="var(--ink)" />
      <circle cx="24" cy="24" r="3" fill="var(--primary-foreground)" />
    </svg>
  )
}
