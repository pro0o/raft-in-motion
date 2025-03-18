"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import SimulateButton from "@/components/ui/simulateButton"
import Image from "next/image"

// Define an interface for the pixel position objects
interface PixelPosition {
  x: number
  y: number
  centerX: number
  centerY: number
  index: number
}

const HomePage: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const router = useRouter()

  const pixelSize = 8
  const gap = 8
  const gridSize = 90
  const canvasSize = 400
  const primaryColor = "230, 216, 230"
  const secondaryColor = "161, 161, 170"

  const handleSimulateClick = () => {
    router.push("/raft")
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const activePixels = new Map<number, number>()
    let frameCount = 0
    let animationFrameId: number

    const pixelPositions: PixelPosition[] = []
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        pixelPositions.push({
          x: x * (pixelSize + gap),
          y: y * (pixelSize + gap),
          centerX: x * (pixelSize + gap) + pixelSize / 2,
          centerY: y * (pixelSize + gap) + pixelSize / 2,
          index: y * gridSize + x,
        })
      }
    }

    const circles = [
      { x: canvasSize * 0.5, y: canvasSize * 0.5, radius: 120, phase: 0 },
      { x: canvasSize * 0.35, y: canvasSize * 0.35, radius: 70, phase: 0.3 },
      { x: canvasSize * 0.65, y: canvasSize * 0.65, radius: 70, phase: 0.6 },
      { x: canvasSize * 0.65, y: canvasSize * 0.35, radius: 50, phase: 0.9 },
      { x: canvasSize * 0.35, y: canvasSize * 0.65, radius: 50, phase: 1.2 },
    ]

    const isInsideAnyCircle = (x: number, y: number, frame: number) => {
      for (const circle of circles) {
        const pulsingRadius = circle.radius + 15 * Math.sin((frame + circle.phase * 100) * 0.02)
        const dx = x - circle.x
        const dy = y - circle.y
        if (dx * dx + dy * dy <= pulsingRadius * pulsingRadius) {
          return true
        }
      }
      return false
    }

    const updateAndDrawPixels = (frame: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const pixelsToUpdate = Math.floor(gridSize * gridSize * 0.08)

      const randomIndices = new Set<number>()
      while (randomIndices.size < pixelsToUpdate) {
        randomIndices.add(Math.floor(Math.random() * pixelPositions.length))
      }

      randomIndices.forEach((i) => {
        const pixel = pixelPositions[i]

        if (isInsideAnyCircle(pixel.centerX, pixel.centerY, frame)) {
          const distanceFromCenter = Math.sqrt(
            Math.pow(pixel.centerX - canvasSize / 2, 2) + Math.pow(pixel.centerY - canvasSize / 2, 2),
          )

          const waveEffect = 0.3 * Math.sin(distanceFromCenter * 0.05 + frame * 0.01)
          const baseOpacity = 0.3 + waveEffect
          const opacity = Math.max(0.1, Math.min(0.8, baseOpacity))

          activePixels.set(pixel.index, opacity)
        } else {
          activePixels.delete(pixel.index)
        }
      })

      activePixels.forEach((opacity, index) => {
        const pixel = pixelPositions[index]

        const color = (pixel.centerX + pixel.centerY) % 20 === 0 ? primaryColor : secondaryColor
        ctx.fillStyle = `rgba(${color}, ${opacity})`
        ctx.fillRect(pixel.x, pixel.y, pixelSize, pixelSize)
      })
    }

    const animate = () => {
      frameCount++
      updateAndDrawPixels(frameCount)
      animationFrameId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <div className="flex items-center justify-center bg-white min-h-screen">
      <div className="w-2/3 mx-auto bg-zinc-900 overflow-hidden shadow-2xl border-8 border-gray-200 rounded-3xl">
        <div className="flex flex-col items-center p-4">
          <canvas
            ref={canvasRef}
            width={canvasSize}
            height={canvasSize}
            className="mb-4"
            aria-label="Pixel grid animation with gradual fade and slow updates"
            role="img"
          />
          <header className="pb-6 lowercase text-md font-medium text-zinc-200 opacity-100">
            <Image
              src="/assets/raft-in-motion.svg"
              alt="Raft-in-motion"
              width={400} 
              height={400}
              className="invert"
            />
          </header>
          <div className="text-zinc-400 text-md font-regular1 max-w-xl mb-12 tracking-wider leading-relaxed text-center">
            Explore the{" "}
            <a
              href="https://raft.github.io/"
              className="font-medium text-zinc-300"
              target="_blank"
              rel="noopener noreferrer"
            >
              Raft consensus algorithm
            </a>{" "}
            through a visual simulation. See how distributed systems maintain consistency and handle node failures within em.
          </div>
          <SimulateButton onClick={handleSimulateClick} connectionStatus="home" />
        </div>
      </div>
    </div>
  )
}

export default HomePage