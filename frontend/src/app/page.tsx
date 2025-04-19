"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { useMediaQuery } from "@/context/mediaQuery"
import { Button } from "@/components/ui/button"
import { ArrowRight } from 'lucide-react';

interface PixelPosition {
  x: number
  y: number
  centerX: number
  centerY: number
  index: number
}

const HomePage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false)
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
    setIsLoading(true)
    router.prefetch("/raft")

    setTimeout(() => {
      router.push("/raft")
    }, 2000)
  }

  const titleAnimation = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.7,
        ease: "easeOut",
      },
    }),
  }

  const containerAnimation = {
    hidden: {
      opacity: 0,
      scale: 0.96,
      y: 20,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 1,
        ease: [0.25, 0.1, 0.25, 1], 
        when: "beforeChildren",
      },
    },
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
    
    <div className="flex items-center justify-center bg-white min-h-screen px-4 py-4 sm:py-6 md:py-8 ">
      <motion.div
        className="w-full max-w-3xl mx-auto bg-zinc-900 overflow-hidden shadow-2xl border-4 sm:border-6 md:border-8 border-gray-200 rounded-2xl sm:rounded-3xl"
        initial="hidden"
        animate="visible"
        variants={containerAnimation}
      >
        <div className="flex flex-col items-center sm:p-3 md:p-4">
          <motion.canvas
            ref={canvasRef}
            width={canvasSize}
            height={canvasSize}
            aria-label="Pixel grid animation with gradual fade and slow updates"
            role="img"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9 }}
          />

          <header className="pb-3 sm:pb-2 md:pb-4 lowercase font-medium text-zinc-200 opacity-100">
            <h1 className="text-4xl sm:text-6xl md:text-6xl text-white font-bold tracking-[-0.1em] font-mono text-center flex flex-wrap justify-center">
              <motion.span custom={2} initial="hidden" animate="visible" variants={titleAnimation}>
                raft
              </motion.span>
              <motion.span custom={3} initial="hidden" animate="visible" variants={titleAnimation}>
                -in-
              </motion.span>
              <motion.span custom={4} initial="hidden" animate="visible" variants={titleAnimation}>
                motion
              </motion.span>
            </h1>
          </header>

          <motion.div
            className="text-zinc-400 text-sm sm:text-base md:text-base font-regular1 max-w-xl mb-6 sm:mb-8 md:mb-10 tracking-wider leading-relaxed text-center px-3 sm:px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.0, duration: 0.9 }}
          >
            Explore the{" "}
            <a
              href="https://raft.github.io/"
              className="font-medium text-zinc-300 hover:bg-blue-600 hover:text-white transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Raft consensus algorithm
            </a>{" "}
            through a visual simulation. See how distributed systems maintain consistency and handle node failures
            within them.
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3, duration: 0.8 }}>
          <Button
  onClick={handleSimulateClick}
  disabled={isLoading}
className="bg-zinc-200 border-4 border-zinc-400/20 shadow-[0_2px_6px_rgba(255,255,255,0.2)] rounded-lg text-gray-900 text-lg font-medium transition-all duration-800 py-4 px-8 hover:bg-blue-600 hover:text-white group flex items-center"
>
              {isLoading ? (
                <>
                  <div className="flex items-center justify-center">
                    <svg
                      className="animate-spin h-8 w-8 text-gray-900 group-hover:text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  </div>
                </>
              ) : (
                (
                  <>
                  Let&rsquo;s Simulate
                  <ArrowRight
                    className="group-hover:translate-x-4 transition-all duration-600 ease-in-out text-gray-900 group-hover:text-white"
                    strokeWidth={3}
                    size={44} 
                  />
                </>
                )
              )}
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}

export default HomePage
