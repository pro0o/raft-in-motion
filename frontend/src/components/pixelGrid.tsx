"use client"

import type React from "react"
import { useEffect, useRef } from "react"

const PixelGrid: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pixelSize = 4
  const gap = 4
  const gridSize = 100 // 400 / (pixelSize + gap)
  const canvasSize = 400

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const pixelOpacities = new Array(gridSize * gridSize).fill(0)
    let frameCount = 0

    const getCircleRadius = (frame: number) => {
      const minRadius = 80
      const maxRadius = 200
      const amplitude = (maxRadius - minRadius) / 2
      const centerRadius = minRadius + amplitude
      return centerRadius + amplitude * Math.sin(frame * 0.01)
    }

    const isInsideCircle = (x: number, y: number, radius: number) => {
      const centerX = canvasSize / 2
      const centerY = canvasSize / 2
      const dx = x - centerX
      const dy = y - centerY
      return dx * dx + dy * dy <= radius * radius
    }

    const drawPixels = (radius: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          const index = y * gridSize + x
          const pixelCenterX = x * (pixelSize + gap) + pixelSize / 2
          const pixelCenterY = y * (pixelSize + gap) + pixelSize / 2

          // Draw all pixels, regardless of whether they're inside the circle
          ctx.fillStyle = `rgba(74, 222, 128, ${pixelOpacities[index]})`
          ctx.fillRect(x * (pixelSize + gap), y * (pixelSize + gap), pixelSize, pixelSize)
        }
      }
    }

    const updatePixels = (radius: number) => {
      const pixelsToUpdate = Math.floor(gridSize * gridSize * 0.2)
      for (let i = 0; i < pixelsToUpdate; i++) {
        const x = Math.floor(Math.random() * gridSize)
        const y = Math.floor(Math.random() * gridSize)
        const index = y * gridSize + x
        const pixelCenterX = x * (pixelSize + gap) + pixelSize / 2
        const pixelCenterY = y * (pixelSize + gap) + pixelSize / 2

        if (isInsideCircle(pixelCenterX, pixelCenterY, radius)) {
          pixelOpacities[index] = Math.random() * 0.6 + 0.2 // Random opacity between 0.2 and 0.8
        } else {
          pixelOpacities[index] = 0 // Set opacity to 0 for pixels outside the circle
        }
      }
    }

    const animate = () => {
      frameCount++
      const radius = getCircleRadius(frameCount)

      // Update pixels every 5th frame
      if (frameCount % 5 === 0) {
        updatePixels(radius)
      }

      drawPixels(radius)
      requestAnimationFrame(animate)
    }

    animate()

    return () => {
      // Clean up animation frame on component unmount
      cancelAnimationFrame(animate as unknown as number)
    }
  }, [])

  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="border-8 border-zinc-200 rounded-2xl p-8">
        <canvas
          ref={canvasRef}
          width={canvasSize}
          height={canvasSize}
          aria-label="Pixel grid animation with gradual fade and slow updates"
          role="img"
        />
      </div>
    </div>
  )
}

export default PixelGrid

