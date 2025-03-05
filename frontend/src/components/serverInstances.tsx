"use client"

import { Server, Plus } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useLogs } from "@/context/logsContext"
import type { Log, ServerLog } from "@/types/raftTypes";

const colorOptions = [
  { bg: "bg-blue-800/90", glow: "bg-blue-500/20", text: "text-blue-50" },
  { bg: "bg-emerald-800/90", glow: "bg-emerald-500/20", text: "text-emerald-50" },
  { bg: "bg-violet-800/90", glow: "bg-violet-500/20", text: "text-violet-50" },
  { bg: "bg-orange-800/90", glow: "bg-orange-500/20", text: "text-orange-50" },
]

const messages = [
  "election timer started",
  "heartbeat received",
  "leader elected",
  "consensus reached",
  "deployment initiated",
  "scaling resources",
]

export default function ServerInstance({ instanceId }) {
  const [bars, setBars] = useState([])
  const [containerHeight, setContainerHeight] = useState(40)
  const containerRef = useRef(null)
  

  const addBar = () => {
    const newId = bars.length > 0 ? Math.max(...bars.map((bar) => bar.id)) + 1 : 1
    const colorIndex = newId % colorOptions.length
    const messageIndex = newId % messages.length

    const newBar = {
      id: newId,
      color: colorOptions[colorIndex],
      message: messages[messageIndex],
      speed: 3 + Math.random() * 4, // Random speed between 3-5 seconds
    }

    setBars((prevBars) => [...prevBars, newBar])

    setTimeout(() => {
      setContainerHeight((prevHeight) => prevHeight + 16)
    }, 10)
  }

  const handleBarExit = (id) => {
    setBars((prevBars) => prevBars.filter((bar) => bar.id !== id))

    setTimeout(() => {
      setContainerHeight((prevHeight) => Math.max(40, prevHeight - 16))
    }, 100)
  }

  return (
    <div className="w-full py-5 px-5 space-y-6">
      {/* Server Info */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-zinc-800 p-2 rounded-md">
            <Server className="h-5 w-5 text-gray-200" />
          </div>
          <div>
            <span className="font-medium">Server Instance</span>
            <span className="text-sm font-medium text-zinc-400"> #{instanceId}</span> {/* Server No. */}
            <p className="text-xs text-zinc-400 font-medium mt-0.5">Term: 1</p> {/* Term */}
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center space-x-2 bg-zinc-800/70 px-3 py-1.5 rounded-xl border border-blue-800/30 shadow-md">
            <motion.div
              className="h-2.5 w-2.5 rounded-full bg-blue-400 shadow-lg"
              initial={{ scale: 0.8 }}
              animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            />
            <span className="text-sm font-medium text-blue-400">Follower</span>
          </div>
        </div>
      </div>

      {/* Bars */}
      <div className="flex flex-col items-center justify-center">
        <div className="w-full bg-zinc-900 h-40 overflow-y-auto">
          <motion.div
            ref={containerRef}
            className="relative w-full bg-zinc-800/80 rounded-sm overflow-hidden backdrop-blur-sm"
            animate={{ height: containerHeight }}
            transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
            style={{ paddingTop: 8, paddingBottom: 8 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-800/10 via-zinc-800/5 to-transparent pointer-events-none" />
            <AnimatePresence>
              {bars.map((bar) => (
                <motion.div
                  key={bar.id}
                  className="relative w-full h-4 flex items-center my-0.5"
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <motion.div
                    className={`absolute left-0 h-4 rounded-sm flex items-center justify-start px-3 ${bar.color.bg} shadow-lg`}
                    style={{
                      width: "80%",
                      boxShadow: `0 0 15px 0 ${bar.color.glow.replace("bg-", "rgba(").replace("/20", ", 0.2)")}`,
                    }}
                    initial={{ x: "-100%", width: "60%" }}
                    animate={{ x: "200%" }}
                    transition={{ duration: bar.speed, ease: "linear" }}
                    onAnimationComplete={() => handleBarExit(bar.id)}
                  >
                    <motion.span className={`text-xs font-mono ${bar.color.text} whitespace-nowrap opacity-90`}>
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
        {/* <motion.button
          onClick={addBar}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white rounded-full hover:bg-emerald-600 transition-colors shadow-lg"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 600, damping: 17 }}
        >
          <Plus size={16} />
          Add Bar
        </motion.button> */}
       
      </div>
    </div>
  )
}
