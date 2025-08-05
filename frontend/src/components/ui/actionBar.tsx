"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown } from "lucide-react"
import SimulateButton from "./simulateButton"
import { useLogs, ConnectionStatus } from "@/context/logsContext"
import { useMediaQuery } from "@/context/mediaQuery"

interface Action {
  id: string
  label: string
  end?: string
}

const allActions = [
  { id: "6", label: "Kill & Respawn", end: "Kill & respawn leader" },
  { id: "1", label: "Setup Harness", end: "Available soon" },
  { id: "2", label: "Request Before Consensus", end: "Available soon" },
  { id: "3", label: "Put/Get Single Client", end: "Available soon" },
  { id: "4", label: "Concurrent Requests", end: "Available soon" },
  { id: "5", label: "Crash Follower", end: "Available soon" },
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
  const isMobile = useMediaQuery("(max-width: 640px)")
  const isTablet = useMediaQuery("(max-width: 1024px)")

  const config = useMemo(
    () => ({
      canvasSize: isMobile ? 300 : isTablet ? 350 : 400,
      padding: isMobile ? 8 : isTablet ? 12 : 16,
    }),
    [isMobile, isTablet],
  )

  const totalWidth = config.canvasSize + config.padding * 2

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
    <div className="flex justify-center">
      <div
        className="relative flex flex-col justify-start items-center text-white overflow-visible"
        style={{ width: `${totalWidth}px` }}
        ref={containerRef}
      >
        <div className="w-full shadow-lg z-10 backdrop-blur-sm" ref={dropdownRef}>
          {" "}
          <div
            className="relative flex flex-col sm:flex-row sm:items-center justify-between px-3 sm:px-4 py-3 sm:py-4 md:py-6 h-auto sm:h-16 text-base sm:text-lg rounded-2xl sm:rounded-2xl bg-zinc-900 backdrop-blur-md hover:bg-zinc-800 cursor-pointer transition-all" 
          >
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
                <span className="text-zinc-400 text-md sm:text-base">Select a simulation to try</span>
              )}
            </div>
            <div className="flex-shrink-0 self-center sm:self-auto" onClick={(e) => e.stopPropagation()}>
              <SimulateButton onClick={handleSimulateClick} connectionStatus={buttonStatus} onCancel={handleCancel} />
            </div>
          </div>
          <AnimatePresence>
            {isOpen && (
              <motion.div
                className="w-full overflow-hidden bg-zinc-900/80 backdrop-blur-md text-white absolute left-0 right-0 mt-2 z-20 rounded-b-xl sm:rounded-b-xl" /* Updated sm:rounded-b-2xl to sm:rounded-b-xl */
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
