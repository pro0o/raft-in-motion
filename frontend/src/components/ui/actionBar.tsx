"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown } from "lucide-react"
import SimulateButton from "./simulateButton"
import { useLogs, ConnectionStatus } from "@/context/logsContext"

interface Action {
  id: string
  label: string
  end?: string
}

const allActions = [
  { id: "6", label: "Kill And Respawn", end: "Kill and respawn leader after consensus" },
  { id: "1", label: "SetupHarness", end: "Available soon" },
  { id: "2", label: "RequestBeforeConsensus", end: "Available soon" },
  { id: "3", label: "PutGetSingleClient", end: "Available soon" },
  { id: "4", label: "ConcurrentRequests", end: "Available soon" },
  { id: "5", label: "CrashFollower", end: "Available soon" },
]

function ActionSearchBar({ actions = allActions }: { actions?: Action[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedAction, setSelectedAction] = useState<Action | null>(null)
  const [dropdownMaxHeight] = useState<number | undefined>(undefined)
  const [buttonStatus, setButtonStatus] = useState<"idle" | "connecting" | "failed" | "simulating" | "cancel">("idle")

  const dropdownRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  const { connect, disconnect, logs, connectionStatus } = useLogs()

  useEffect(() => {
    switch (connectionStatus) {
      case ConnectionStatus.CONNECTING:
        setButtonStatus("connecting")
        break
      case ConnectionStatus.CONNECTED:
        if (logs.length > 0) {
          if (logs.length >= 10) {
            setButtonStatus("cancel")
          } else {
            setButtonStatus("simulating")
          }
        }
        break
      case ConnectionStatus.DISCONNECTED:
        if (buttonStatus === "connecting") {
          setButtonStatus("failed")
          const timer = setTimeout(() => {
            setButtonStatus("idle")
          }, 3000)
          return () => clearTimeout(timer)
        } else if (buttonStatus !== "failed") {
          setButtonStatus("idle")
        }
        break
    }
  }, [connectionStatus, logs.length, buttonStatus])

  const handleSimulateClick = () => {
    if (selectedAction && buttonStatus === "idle") {
      connect(selectedAction.id)
    }
  }

  const handleCancel = () => {
    disconnect()
  }
  const handleSelectAction = (action: Action) => {
    setSelectedAction(action)
    setIsOpen(false)
    setButtonStatus("idle")
  }

  return (
    <div className="w-full max-w-3xl mx-auto" ref={containerRef}>
      <div className="relative flex flex-col justify-start items-center min-h-[60px] sm:min-h-[70px] md:min-h-[80px] text-white overflow-visible">
        <div
          className="w-full shadow-lg border-4 sm:border-6 md:border-8 border-gray-200 rounded-xl sm:rounded-2xl z-10 backdrop-blur-sm"
          ref={dropdownRef}
        >
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-4 py-3 sm:py-4 md:py-6 h-auto sm:h-16 text-base sm:text-lg rounded-lg sm:rounded-xl bg-zinc-900 backdrop-blur-md hover:bg-zinc-800 cursor-pointer transition-all border border-zinc-700/30">
            <div
              ref={triggerRef}
              className="flex items-center gap-2 sm:gap-3 w-full mb-2 sm:mb-0"
              onClick={() => (buttonStatus === "idle" || buttonStatus === "failed" ? setIsOpen(!isOpen) : null)}
            >
              <ChevronDown
                className={`h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
              />
              {selectedAction ? (
                <span className="text-zinc-100 text-md sm:text-md font-medium">{selectedAction.label}</span>
              ) : (
                <span className="text-zinc-400 text-sm sm:text-base font-normal">Select a simulation to try</span>
              )}
            </div>

            <div className="flex-shrink-0 self-center sm:self-auto" onClick={(e) => e.stopPropagation()}>
              <SimulateButton onClick={handleSimulateClick} connectionStatus={buttonStatus} onCancel={handleCancel} />
            </div>
          </div>
          <AnimatePresence>
            {isOpen && (
              <motion.div
                className="w-full overflow-hidden bg-zinc-900/80 backdrop-blur-md text-white absolute left-0 right-0 mt-2 z-20 rounded-b-xl sm:rounded-b-2xl border border-zinc-700/50"
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
                      className="px-4 sm:px-6 py-2 sm:py-3 flex items-center justify-between hover:bg-zinc-700/70 cursor-pointer transition-colors"
                      onClick={() => handleSelectAction(action)}
                    >
                      <span className="text-sm sm:text-md font-medium text-zinc-200">{action.label}</span>
                      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                        {action.end && (
                          <span className="text-xs sm:text-sm text-zinc-400 min-w-16 text-right tracking-wide">
                            {action.end}
                          </span>
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
