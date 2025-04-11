"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import SimulateButton from "@/components/ui/simulateButton"
import Image from "next/image"
import { useMediaQuery } from "@/context/mediaQuery"

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
  const isMobile = useMediaQuery("(max-width: 640px)")
  const isTablet = useMediaQuery("(max-width: 1024px)")

  const canvasSize = isMobile ? 300 : isTablet ? 350 : 400
  const pixelSize = isMobile ? 6 : 8
  const gap = isMobile ? 6 : 8
  const gridSize = isMobile ? 70 : 90
  const primaryColor = "230, 216, 230"
  const secondaryColor = "161, 161, 170"

  const handleSimulateClick = () => {
    router.push("/raft")
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = canvasSize
    canvas.height = canvasSize

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
      { x: canvasSize * 0.5, y: canvasSize * 0.5, radius: canvasSize * 0.3, phase: 0 },
      { x: canvasSize * 0.35, y: canvasSize * 0.35, radius: canvasSize * 0.175, phase: 0.3 },
      { x: canvasSize * 0.65, y: canvasSize * 0.65, radius: canvasSize * 0.175, phase: 0.6 },
      { x: canvasSize * 0.65, y: canvasSize * 0.35, radius: canvasSize * 0.125, phase: 0.9 },
      { x: canvasSize * 0.35, y: canvasSize * 0.65, radius: canvasSize * 0.125, phase: 1.2 },
    ]

    const isInsideAnyCircle = (x: number, y: number, frame: number) => {
      for (const circle of circles) {
        const pulsingRadius = circle.radius + canvasSize * 0.0375 * Math.sin((frame + circle.phase * 100) * 0.02)
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
  }, [canvasSize, pixelSize, gap, gridSize])

  return (
    <div className="flex items-center justify-center bg-white min-h-screen px-4 py-6 sm:py-8 md:py-12">
      <div className="w-full max-w-3xl mx-auto bg-zinc-900 overflow-hidden shadow-2xl border-4 sm:border-6 md:border-8 border-gray-200 rounded-2xl sm:rounded-3xl">
        <div className="flex flex-col items-center p-3 sm:p-4 md:p-6">
          <canvas
            ref={canvasRef}
            width={canvasSize}
            height={canvasSize}
            className="mb-2 sm:mb-4"
            aria-label="Pixel grid animation with gradual fade and slow updates"
            role="img"
          />
          <header className="pb-3 sm:pb-4 md:pb-6 lowercase text-sm sm:text-md font-medium text-zinc-200 opacity-100">
            <div className="w-[200px] sm:w-[300px] md:w-[400px]">
              <Image
                src="/assets/raft-in-motion.png"
                alt="Raft-in-motion"
                width={250}
                height={250}
                className="w-full h-auto"
                priority
              />
            </div>
          </header>
          <div className="text-zinc-400 text-sm sm:text-base md:text-base font-regular1 max-w-xl mb-6 sm:mb-8 md:mb-12 tracking-wider leading-relaxed text-center px-3 sm:px-6">
            Explore the{" "}
            <a
              href="https://raft.github.io/"
              className="font-medium text-zinc-300 hover:bg-blue-600 hover:text-white transition-colors"
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
