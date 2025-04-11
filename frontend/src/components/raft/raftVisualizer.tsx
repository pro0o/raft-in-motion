"use client"

import type React from "react"

import { motion, AnimatePresence } from "framer-motion"
import type { LogBarData } from "@/types/uiTypes"

interface LogVisualizerProps {
  containerRef: React.RefObject<HTMLDivElement | null>
  containerHeight: number
  bars: LogBarData[]
  handleBarExit: (id: number) => void
}

export function LogVisualizer({ containerRef, containerHeight, bars, handleBarExit }: LogVisualizerProps) {

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="w-full bg-zinc-900 h-28 sm:h-32 md:h-40 overflow-y-auto">
        <motion.div
          ref={containerRef}
          className="relative w-full bg-zinc-800/80 rounded-sm overflow-hidden backdrop-blur-sm"
          animate={{ height: containerHeight }}
          transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
          style={{ paddingTop: 8, paddingBottom: 8 }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/50 via-zinc-800/5 to-transparent pointer-events-none" />
          <AnimatePresence>
            {bars.map((bar) => (
              <motion.div
                key={bar.id}
                className="relative w-full h-5 flex items-center my-1"
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <motion.div
                  className={`absolute left-0 h-5 rounded-sm flex items-center justify-start px-2 sm:px-3 ${bar.color.bg} shadow-lg`}
                  style={{
                    width: "80%",
                    boxShadow: `0 0 15px 0 ${bar.color.glow.replace("bg-", "rgba(").replace("/20", ", 0.2)")}`,
                  }}
                  initial={{ x: "-100%", width: "60%" }}
                  animate={{ x: "200%" }}
                  transition={{ duration: bar.speed, ease: "linear" }}
                  onAnimationComplete={() => handleBarExit(bar.id)}
                >
                  <motion.span
                    className={`text-xs sm:text-sm font-mono ${bar.color.text} whitespace-nowrap opacity-90 truncate max-w-full`}
                  >
                    {bar.message}
                  </motion.span>
                  <motion.div
                    className={`absolute inset-0 ${bar.color.glow} rounded-md blur-sm -z-10`}
                    initial={{ opacity: 0.3, scale: 1 }}
                    animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" }}
                  />
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
