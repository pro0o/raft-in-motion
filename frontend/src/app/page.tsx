"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import SimulateButton from "@/components/ui/simulateButton"
import { useRouter } from 'next/navigation'

const HomePage: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const router = useRouter() 

  const pixelSize = 4
  const gap = 8
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

    const pixelOpacities = new Array(gridSize * gridSize).fill(0)
    let frameCount = 0

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

    const drawPixels = (radius: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          const index = y * gridSize + x
          const pixelCenterX = x * (pixelSize + gap) + pixelSize / 2
          const pixelCenterY = y * (pixelSize + gap) + pixelSize / 2

          ctx.fillStyle = `rgba(${color}, ${pixelOpacities[index]})`
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
          pixelOpacities[index] = Math.random() * 0.6 + 0.2
        } else {
          pixelOpacities[index] = 0
        }
      }
    }

    const animate = () => {
      frameCount++
      const radius = getCircleRadius(frameCount)

      if (frameCount % 5 === 0) {
        updatePixels(radius)
      }

      drawPixels(radius)
      requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animate as unknown as number)
    }
  }, [])
  
  return (
    <div className="flex items-center justify-center bg-white min-h-screen">
      <div className="w-2/3 mx-auto bg-zinc-900 overflow-hidden shadow-lg border-8 border-gray-200 rounded-2xl">
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
            <img src="/assets/raft-in-motion.svg" alt="Raft-in-motion" className="h-6 invert" />
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
