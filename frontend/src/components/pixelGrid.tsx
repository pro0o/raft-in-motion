"use client"
import type React from "react"
import { useEffect, useRef, useMemo } from "react"
import { useLogVisualization } from "@/context/gridContext"
import { useMediaQuery } from "@/context/mediaQuery"

// More lightweight interface for active pixels
interface ActivePixel {
  x: number
  y: number
  opacity: number
}

const PixelGrid: React.FC = () => {
  const { color, activity } = useLogVisualization()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const isMobile = useMediaQuery("(max-width: 640px)")
  const isTablet = useMediaQuery("(max-width: 1024px)")

  // Calculate responsive values just once with useMemo
  const config = useMemo(() => ({
    pixelSize: isMobile ? 6 : 8,
    gap: isMobile ? 12 : 14,
    gridSize: isMobile ? 60 : isTablet ? 70 : 80,
    canvasSize: isMobile ? 300 : isTablet ? 350 : 400
  }), [isMobile, isTablet])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const { pixelSize, gap, gridSize, canvasSize } = config

    canvas.width = canvasSize
    canvas.height = canvasSize

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Only store active pixels with their properties
    const activePixels = new Map<number, ActivePixel>()
    let frameCount = 0
    
    // Center coordinates - calculated once
    const centerX = canvasSize / 2
    const centerY = canvasSize / 2

    const getCircleRadius = (frame: number) => {
      const minRadius = canvasSize * 0.25
      const maxRadius = canvasSize * 0.375
      const amplitude = (maxRadius - minRadius) / 2
      const centerRadius = minRadius + amplitude
      return centerRadius + amplitude * Math.sin(frame * 0.01)
    }

    const updateAndDrawPixels = () => {
      ctx.clearRect(0, 0, canvasSize, canvasSize)
      
      const radius = getCircleRadius(frameCount)
      const radiusSquared = radius * radius
      
      // Update only a small portion of the grid per frame
      const pixelsToUpdate = Math.floor(gridSize * gridSize * 0.03)
      
      // Process random pixels
      for (let i = 0; i < pixelsToUpdate; i++) {
        const index = Math.floor(Math.random() * gridSize * gridSize)
        const y = Math.floor(index / gridSize)
        const x = index % gridSize
        
        // Calculate pixel center position only when needed
        const pixelCenterX = x * (pixelSize + gap) + pixelSize / 2
        const pixelCenterY = y * (pixelSize + gap) + pixelSize / 2
        
        // Efficient circle hit test
        const dx = pixelCenterX - centerX
        const dy = pixelCenterY - centerY
        const distanceSquared = dx * dx + dy * dy
        
        if (distanceSquared <= radiusSquared) {
          // Add to active pixels
          activePixels.set(index, {
            x: x * (pixelSize + gap),
            y: y * (pixelSize + gap),
            opacity: Math.random() * 0.8 + 0.2
          })
        } else {
          // Remove if outside circle
          activePixels.delete(index)
        }
      }

      // Draw active pixels
      ctx.fillStyle = `rgba(${color}, 1)`
      
      // Draw pixels with batch opacity setting to reduce context changes
      let currentOpacity = -1
      
      activePixels.forEach((pixel) => {
        if (pixel.opacity !== currentOpacity) {
          currentOpacity = pixel.opacity
          ctx.globalAlpha = currentOpacity
        }
        ctx.fillRect(pixel.x, pixel.y, pixelSize, pixelSize)
      })
      
      ctx.globalAlpha = 1.0
    }

    const animate = () => {
      frameCount++

      // Reduced update frequency
      if (frameCount % 8 === 0) {
        updateAndDrawPixels()
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [color, config]) // Only depend on color and memoized config

  const { canvasSize } = config

  return (
    <div className="flex flex-col items-center justify-center bg-white">
      <div className="p-2 sm:p-3 md:p-4 border-4 sm:border-6 md:border-8 border-gray-200 rounded-xl sm:rounded-2xl bg-zinc-900 text-white overflow-hidden shadow-md">
        <canvas
          ref={canvasRef}
          width={canvasSize}
          height={canvasSize}
          aria-label="Pixel grid animation with gradual fade and slow updates"
          role="img"
        />
        {activity && (
          <div
            className="text-sm sm:text-base md:text-lg font-medium tracking-wide text-center py-1 sm:py-2"
            style={{ color: `rgb(${color})` }}
          >
            {activity}
          </div>
        )}
      </div>
    </div>
  )
}

export default PixelGrid