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
  const visibleBarCount = Math.ceil(containerHeight / 20); 
  const visibleBars = bars.slice(-visibleBarCount);
  
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="w-full bg-zinc-900 h-28 sm:h-32 md:h-40 overflow-y-auto">
        <motion.div
          ref={containerRef}
          className="relative w-full bg-zinc-800/80 rounded-sm overflow-hidden backdrop-blur-sm"
          animate={{ height: containerHeight }}
          transition={{ 
            height: { 
              duration: 0.4, 
              ease: [0.34, 1.56, 0.64, 1] 
            } 
          }}
          style={{ padding: "8px 0" }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/50 via-zinc-800/5 to-transparent pointer-events-none" />
          
          <motion.div
            className="relative w-full"
            layout="position"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <AnimatePresence mode="popLayout">
              {visibleBars.map((bar) => (
                <motion.div
                key={bar.id}
                layout="position"
                className="relative w-full h-5 flex items-center my-1"
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                transition={{
                  layout: {
                    type: "spring",
                    stiffness: 1000, 
                    damping: 30,     
                    mass: 0.5        
                  },
                  opacity: { duration: 0.1 },
                  y: { duration: 0.1 },
                  scale: { duration: 0.1 }
                }}
              >
                    <motion.div
                      className={`absolute left-0 h-5 rounded-sm flex items-center justify-start px-2 sm:px-3 ${bar.color.bg} shadow-lg`}
                      style={{
                        width: "80%",
                        boxShadow: `0 0 15px 0 ${bar.color.glow.replace("bg-", "rgba(").replace("/20", ", 0.2)")}`,
                      }}
                      initial={{ x: "-100%", width: "80%" }}
                      animate={{ x: "200%" }}
                      transition={{
                        x: {
                          duration: bar.speed,
                          ease: "linear"
                        },
                        width: { duration: 0.1 }
                      }}
                      onAnimationStart={() => {
                        setTimeout(() => handleBarExit(bar.id), bar.speed * 700);
                      }}
                    >
                    <span className={`text-xs sm:text-sm font-mono ${bar.color.text} whitespace-nowrap opacity-90 truncate max-w-full`}>
                      {bar.message}
                    </span>
                    <div
                      className={`absolute inset-0 ${bar.color.glow} rounded-md blur-sm -z-10 opacity-40`}
                    />
                  </motion.div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}