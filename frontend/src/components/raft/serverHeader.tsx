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
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3 sm:gap-0">
      <div className="flex items-center space-x-3">
        <div className="bg-zinc-800 p-2 rounded-md">
          <Server className="h-5 w-5 text-gray-200" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-medium">
            Server Instance
            <span className="text-md font-medium text-zinc-400"> #{raftID}</span>
          </h2>
          <p className="text-sm text-zinc-400 font-medium mt-0.5">Term: {currentTerm}</p>
        </div>
      </div>
      <div className="text-right">
        <div className={`flex items-center space-x-2 bg-zinc-800/70 px-3 py-1.5 rounded-xl`}>
          <motion.div
            className={`h-2.5 w-2.5 rounded-full shadow-lg ${stateBgColor}`}
            initial={{ scale: 0.8 }}
            animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            aria-hidden="true"
          />
          <span className={`text-md font-medium ${stateColor}`}>{getStateName(currentState)}</span>
        </div>
      </div>
    </div>
  )
}
