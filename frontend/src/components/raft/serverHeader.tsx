"use client"

import { Server } from "lucide-react"
import { motion } from "framer-motion"
import type { RaftState } from "@/types/raftEnums"
import { getStateName, getStateColor, getStateBgColor } from "@/lib/stateUtils"

interface ServerHeaderProps {
  raftID: number
  currentState: RaftState
  currentTerm: number
}

export function ServerHeader({ raftID, currentState, currentTerm }: ServerHeaderProps) {
  const stateColor = getStateColor(currentState)
  const stateBgColor = getStateBgColor(currentState)

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 sm:mb-3 md:mb-4 gap-2 sm:gap-3">
      <div className="flex items-center space-x-2 sm:space-x-3">
        <div className="bg-zinc-800 p-1.5 sm:p-2 rounded-md">
          <Server className="h-4 w-4 sm:h-5 sm:w-5 text-gray-200" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-base sm:text-lg font-medium">
            Server Instance
            <span className="text-sm sm:text-md font-medium text-zinc-400"> #{raftID}</span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 font-medium mt-0.5">Term: {currentTerm}</p>
        </div>
      </div>
      <div className="text-right">
        <div
          className={`flex items-center space-x-1.5 sm:space-x-2 bg-zinc-800/70 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl`}
        >
          <motion.div
            className={`h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full shadow-lg ${stateBgColor}`}
            initial={{ scale: 0.8 }}
            animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            aria-hidden="true"
          />
          <span className={`text-sm sm:text-md font-medium ${stateColor}`}>{getStateName(currentState)}</span>
        </div>
      </div>
    </div>
  )
}
