"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { RefreshCw } from "lucide-react"

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

function makeCode(len = 5) {
  let s = ""
  for (let i = 0; i < len; i++) s += CHARS[Math.floor(Math.random() * CHARS.length)]
  return s
}

/**
 * Client-side alphanumeric image captcha. Draws distorted mixed text/number
 * characters on a canvas and reports whether the user's typed answer matches.
 * Purely a human-check UX gate (not a security control).
 */
export function Captcha({
  value,
  onChange,
  onValidChange,
}: {
  value: string
  onChange: (v: string) => void
  onValidChange?: (valid: boolean) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [code, setCode] = useState("")

  const draw = useCallback((text: string) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)

    // background
    ctx.fillStyle = "#0d1b3e"
    ctx.fillRect(0, 0, w, h)

    // noise lines
    for (let i = 0; i < 6; i++) {
      ctx.strokeStyle = `rgba(0, 200, 255, ${0.15 + Math.random() * 0.25})`
      ctx.lineWidth = 1 + Math.random()
      ctx.beginPath()
      ctx.moveTo(Math.random() * w, Math.random() * h)
      ctx.lineTo(Math.random() * w, Math.random() * h)
      ctx.stroke()
    }
    // noise dots
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.4})`
      ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5)
    }

    // characters
    const colors = ["#00d4ff", "#ffffff", "#7fe7ff", "#ffd27f"]
    const step = w / (text.length + 1)
    for (let i = 0; i < text.length; i++) {
      const fontSize = 26 + Math.random() * 8
      ctx.font = `700 ${fontSize}px 'Space Mono', monospace`
      ctx.fillStyle = colors[i % colors.length]
      ctx.save()
      const x = step * (i + 1)
      const y = h / 2 + (Math.random() * 8 - 4)
      ctx.translate(x, y)
      ctx.rotate((Math.random() * 40 - 20) * (Math.PI / 180))
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(text[i], 0, 0)
      ctx.restore()
    }
  }, [])

  const refresh = useCallback(() => {
    const next = makeCode()
    setCode(next)
    onChange("")
    draw(next)
  }, [draw, onChange])

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (code) draw(code)
  }, [code, draw])

  useEffect(() => {
    onValidChange?.(value.trim().toUpperCase() === code)
  }, [value, code, onValidChange])

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="captcha" className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        Security Check
        <span className="ml-1 font-normal normal-case opacity-50">(type the code)</span>
      </label>
      <div className="flex items-center gap-2">
        <canvas
          ref={canvasRef}
          width={150}
          height={52}
          className="h-[52px] w-[150px] shrink-0 rounded-xl border border-border"
          aria-label="Captcha image"
        />
        <button
          type="button"
          onClick={refresh}
          className="flex h-[52px] w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground transition-colors hover:text-primary"
          aria-label="Refresh captcha"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
        <input
          id="captcha"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Code"
          autoComplete="off"
          maxLength={6}
          className="h-[52px] w-full rounded-xl border border-border bg-surface px-4 text-sm uppercase tracking-widest outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/40 placeholder:normal-case placeholder:tracking-normal"
        />
      </div>
    </div>
  )
}
