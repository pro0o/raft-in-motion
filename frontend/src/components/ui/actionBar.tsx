"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown } from "lucide-react"
import SimulateButton from "./simulateButton"

interface Action {
  id: string
  label: string
  description?: string
  short?: string
  end?: string
}

const allActions = [
  {
    id: "1",
    label: "Book tickets",
    description: "Operator",
    short: "⌘K",
    end: "Agent",
  },
  {
    id: "2",
    label: "Summarize",
    description: "gpt-4o",
    short: "⌘cmd+p",
    end: "Command",
  },
  {
    id: "3",
    label: "Screen Studio",
    description: "gpt-4o",
    short: "",
    end: "Application",
  },
  {
    id: "4",
    label: "Talk to Jarvis",
    description: "gpt-4o voice",
    short: "",
    end: "Active",
  },
  {
    id: "5",
    label: "Translate",
    description: "gpt-4o",
    short: "",
    end: "Command",
  },
]

function ActionSearchBar({ actions = allActions }: { actions?: Action[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedAction, setSelectedAction] = useState<Action | null>(null)
  const [dropdownMaxHeight, setDropdownMaxHeight] = useState<number | undefined>(undefined)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  const handleSelectAction = (action: Action) => {
    setSelectedAction(action)
    setIsOpen(false)
  }

  return (
    <div className="w-full max-w-3xl mx-auto" ref={containerRef}>
      <div className="relative flex flex-col justify-start items-center min-h-[80px] text-white overflow-visible">
        <div className="w-full shadow-lg border-8 border-gray-200 rounded-2xl z-10 backdrop-blur-sm" ref={dropdownRef}>
          <div className="relative flex items-center justify-between px-4 py-6 h-16 text-lg rounded-xl bg-zinc-900 backdrop-blur-md hover:bg-zinc-800 cursor-pointer transition-all border border-zinc-700/30">
            <div ref={triggerRef} className="flex items-center gap-3 w-full" onClick={() => setIsOpen(!isOpen)}>
              <ChevronDown className={`h-8 w-8 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
              {selectedAction ? (
                <span className="text-zinc-100 text-lg font-medium">{selectedAction.label}</span>
              ) : (
                <span className="text-zinc-400 text-lg">Select an action</span>
              )}
            </div>

            <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              <SimulateButton />
            </div>
          </div>
{/* Dropdown menu - Fixed positioning */}
<AnimatePresence>
  {isOpen && (
    <motion.div
      className="w-full overflow-hidden bg-zinc-900/80 backdrop-blur-md text-white absolute left-0 right-0 mt-2 z-20 rounded-b-2xl border border-zinc-700/50"
      initial={{ opacity: 0, height: 0, y: -20 }}
      animate={{ opacity: 1, height: "auto", y: 0 }}
      exit={{ opacity: 0, height: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      style={{
        maxHeight: dropdownMaxHeight ? `${dropdownMaxHeight}px` : "300px",
        overflowY: "auto",
      }}
    >
      <motion.ul className="py-2">
        {actions.map((action) => (
          <motion.li
            key={action.id}
            className="px-6 py-3 flex items-center justify-between hover:bg-zinc-700/70 cursor-pointer transition-colors"
            onClick={() => handleSelectAction(action)}
          >
            <span className="text-lg font-medium text-zinc-100">{action.label}</span>
            <div className="flex items-center gap-4 flex-shrink-0">
              {action.short && (
                <span className="text-base text-zinc-300 bg-zinc-700/80 px-2 py-1 rounded-md">
                  {action.short}
                </span>
              )}
              {action.end && (
                <span className="text-base text-zinc-400 min-w-16 text-right">{action.end}</span>
              )}
            </div>
          </motion.li>
        ))}
      </motion.ul>
    </motion.div>
  )}
</AnimatePresence>

        </div>
      </div>
    </div>
  )
}

export default ActionSearchBar

