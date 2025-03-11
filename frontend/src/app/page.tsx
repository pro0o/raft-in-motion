"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import SimulateButton from "@/components/ui/simulateButton"
import { useRouter } from 'next/navigation'

const HomePage: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const router = useRouter() 

  const pixelSize = 8
  const gap = 4
  const gridSize = 80
  const canvasSize = 400
  const color = "220, 220, 220" 

  const handleSimulateClick = () => {
    router.push('/raft')
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Use a sparse array instead of filling the entire grid
    const activePixels = new Map()
    let frameCount = 0
    let animationFrameId: number

    // Pre-calculate pixel positions to avoid recalculating in every frame
    const pixelPositions = []
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

    const updateAndDrawPixels = (radius: number) => {
      // Clear only the necessary parts instead of the entire canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Calculate how many pixels to update - use a lower percentage
      const pixelsToUpdate = Math.floor(gridSize * gridSize * 0.05)
      
      // Randomly select pixels to update
      const randomIndices = new Set()
      while (randomIndices.size < pixelsToUpdate) {
        randomIndices.add(Math.floor(Math.random() * pixelPositions.length))
      }
      
      // Process only the selected pixels
      randomIndices.forEach(i => {
        const pixel = pixelPositions[i]
        
        if (isInsideCircle(pixel.centerX, pixel.centerY, radius)) {
          const opacity = Math.random() * 0.6 + 0.2
          activePixels.set(pixel.index, opacity)
        } else {
          activePixels.delete(pixel.index)
        }
      })
      
      // Draw only active pixels
      activePixels.forEach((opacity, index) => {
        const pixel = pixelPositions[index]
        ctx.fillStyle = `rgba(${color}, ${opacity})`
        ctx.fillRect(pixel.x, pixel.y, pixelSize, pixelSize)
      })
    }

    const animate = () => {
      frameCount++
      const radius = getCircleRadius(frameCount)

      // Only update pixels every few frames
      if (frameCount % 8 === 0) {
        updateAndDrawPixels(radius)
      }

      animationFrameId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [])
  
  return (
    <div className="flex items-center justify-center bg-white min-h-screen">
      <div className="w-2/3 mx-auto bg-zinc-900 overflow-hidden shadow-lg border-8 border-gray-200 rounded-3xl">
        <div className="flex flex-col items-center p-8">
          <canvas
            ref={canvasRef}
            width={canvasSize}
            height={canvasSize}
            className="mb-6"
            aria-label="Pixel grid animation with gradual fade and slow updates"
            role="img"
          />
          
          <header className="pb-6 lowercase text-md font-medium text-zinc-200 opacity-100">
            <img src="/assets/raft-in-motion.svg" alt="Raft-in-motion" className="h-8 invert" />
          </header>
          
          <div className="text-zinc-400 font-mono text-md max-w-xl mb-8 leading-relaxed text-center">
            Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.
          </div>
          
          <SimulateButton onClick={handleSimulateClick} text={"Let's Simulate"}/>
        </div>
      </div>
    </div>
  )
}

export default HomePage