"use client"
import type React from "react"
import { useEffect, useRef } from "react"
import { useLogVisualization } from "@/context/gridContext"

// Define interface for pixel position objects
interface PixelPosition {
  x: number
  y: number
  centerX: number
  centerY: number
  index: number
}

const PixelGrid: React.FC = () => {
  const { color, activity } = useLogVisualization()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  
  const pixelSize = 6
  const gap = 8
  const gridSize = 80
  const canvasSize = 400
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    
    // Use a Map to only store active pixels
    const activePixels = new Map<number, number>()
    let frameCount = 0
    
    // Pre-calculate pixel positions
    const pixelPositions: PixelPosition[] = []
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        pixelPositions.push({
          x: x * (pixelSize + gap),
          y: y * (pixelSize + gap),
          centerX: x * (pixelSize + gap) + pixelSize / 2,
          centerY: y * (pixelSize + gap) + pixelSize / 2,
          index: y * gridSize + x
        })
      }
    }

    const getCircleRadius = (frame: number) => {
      const minRadius = 60
      const maxRadius = 150
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
    
    const updateAndDrawPixels = () => {
      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Get current circle radius
      const radius = getCircleRadius(frameCount)
      
      // Update only a subset of pixels (5% instead of 20%)
      const pixelsToUpdate = Math.floor(gridSize * gridSize * 0.05)
      const randomIndices = new Set<number>()
      
      while (randomIndices.size < pixelsToUpdate) {
        randomIndices.add(Math.floor(Math.random() * pixelPositions.length))
      }
      
      // Process selected pixels
      randomIndices.forEach(i => {
        const pixel = pixelPositions[i]
        
        if (isInsideCircle(pixel.centerX, pixel.centerY, radius)) {
          activePixels.set(pixel.index, Math.random() * 0.6 + 0.2)
        } else {
          activePixels.delete(pixel.index)
        }
      })
      
      // Draw only active pixels
      ctx.fillStyle = `rgba(${color}, 1)`
      activePixels.forEach((opacity, index) => {
        const pixel = pixelPositions[index]
        // Set global alpha instead of creating a new fill style for each pixel
        ctx.globalAlpha = opacity
        ctx.fillRect(pixel.x, pixel.y, pixelSize, pixelSize)
      })
      // Reset global alpha for future operations
      ctx.globalAlpha = 1.0
    }

    const animate = () => {
      frameCount++
      
      // Reduce update frequency - only update every 8 frames
      if (frameCount % 8 === 0) {
        updateAndDrawPixels()
      }
      
      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    // Cleanup function
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [color]) // Only re-initialize when color changes
  
  return (
    <div className="flex flex-col items-center justify-center bg-white">
      <div className="p-4 border-8 border-gray-200 rounded-2xl bg-zinc-900 text-white overflow-hidden shadow-md">
        <canvas
          ref={canvasRef}
          width={canvasSize}
          height={canvasSize}
          aria-label="Pixel grid animation with gradual fade and slow updates"
          role="img"
        />
        {activity && (
          <div
            className="text-lg font-medium tracking-wide"
            style={{ color: `rgb(${color})`, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
          >
            {activity}
          </div>
        )}
      </div>
    </div>
  )
}

export default PixelGrid