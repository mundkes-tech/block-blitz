import { useEffect, useRef } from 'react'

export type ParticleTrigger = {
  id: number
  cells: { x: number; y: number; color: string }[]
}

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  alpha: number
  decay: number
}

type ParticleCanvasProps = {
  trigger?: ParticleTrigger | null
}

export function ParticleCanvas({ trigger }: ParticleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animFrameIdRef = useRef<number | null>(null)

  // Spawn particles on trigger
  useEffect(() => {
    if (!trigger || trigger.cells.length === 0) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    // Ensure canvas internal resolution matches display size
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width
      canvas.height = rect.height
    }

    const newParticles: Particle[] = []

    trigger.cells.forEach((cell) => {
      // Spawn 6-8 glowing sparks per cleared cell
      const count = 7
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = Math.random() * 4 + 1.5
        newParticles.push({
          x: cell.x,
          y: cell.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1, // slight upward float
          size: Math.random() * 4 + 2,
          color: cell.color || '#facc15',
          alpha: 1,
          decay: Math.random() * 0.03 + 0.02,
        })
      }
    })

    particlesRef.current.push(...newParticles)
  }, [trigger])

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const activeParticles: Particle[] = []

      for (let i = 0; i < particlesRef.current.length; i++) {
        const p = particlesRef.current[i]
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.08 // subtle gravity
        p.alpha -= p.decay

        if (p.alpha > 0) {
          ctx.save()
          ctx.globalAlpha = Math.max(0, p.alpha)
          ctx.fillStyle = p.color
          ctx.shadowColor = p.color
          ctx.shadowBlur = 8
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
          activeParticles.push(p)
        }
      }

      particlesRef.current = activeParticles

      if (activeParticles.length > 0) {
        animFrameIdRef.current = requestAnimationFrame(render)
      } else {
        animFrameIdRef.current = null
      }
    }

    if (particlesRef.current.length > 0 && animFrameIdRef.current === null) {
      animFrameIdRef.current = requestAnimationFrame(render)
    }

    return () => {
      if (animFrameIdRef.current !== null) {
        cancelAnimationFrame(animFrameIdRef.current)
        animFrameIdRef.current = null
      }
    }
  }, [trigger])

  return (
    <canvas
      ref={canvasRef}
      className="board-particle-canvas"
      aria-hidden="true"
    />
  )
}
