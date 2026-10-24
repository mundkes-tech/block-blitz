import { useEffect, useRef } from 'react'

type ConfettiPiece = {
  x: number
  y: number
  w: number
  h: number
  color: string
  vx: number
  vy: number
  rot: number
  vRot: number
  alpha: number
}

type ConfettiCanvasProps = {
  active: boolean
}

export function ConfettiCanvas({ active }: ConfettiCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animIdRef = useRef<number | null>(null)
  const piecesRef = useRef<ConfettiPiece[]>([])

  useEffect(() => {
    if (!active) return

    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const colors = ['#f43f5e', '#06b6d4', '#10b981', '#f59e0b', '#a855f7', '#ec4899', '#3b82f6', '#facc15']
    const newPieces: ConfettiPiece[] = []

    // Spawn 100 confetti ribbons across the top of the screen
    for (let i = 0; i < 110; i++) {
      newPieces.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * 80,
        w: Math.random() * 8 + 6,
        h: Math.random() * 12 + 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 2.5,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.15,
        alpha: 1,
      })
    }

    piecesRef.current = newPieces
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let aliveCount = 0

      for (let i = 0; i < piecesRef.current.length; i++) {
        const p = piecesRef.current[i]
        p.x += p.vx
        p.y += p.vy
        p.rot += p.vRot
        p.vy += 0.03 // gravity

        if (p.y > canvas.height * 0.7) {
          p.alpha -= 0.015
        }

        if (p.alpha > 0 && p.y < canvas.height + 40) {
          aliveCount++
          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate(p.rot)
          ctx.fillStyle = p.color
          ctx.globalAlpha = Math.max(0, p.alpha)
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
          ctx.restore()
        }
      }

      if (aliveCount > 0) {
        animIdRef.current = requestAnimationFrame(render)
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        animIdRef.current = null
      }
    }

    animIdRef.current = requestAnimationFrame(render)

    return () => {
      if (animIdRef.current !== null) {
        cancelAnimationFrame(animIdRef.current)
        animIdRef.current = null
      }
    }
  }, [active])

  if (!active) return null

  return (
    <canvas
      ref={canvasRef}
      className="global-confetti-canvas"
      aria-hidden="true"
    />
  )
}
