"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SimulateButtonProps {
  onClick: () => void
  connectionStatus: "idle" | "connecting" | "failed" | "simulating" | "cancel"
  onCancel?: () => void
}

export default function SimulateButton({ onClick, connectionStatus, onCancel }: SimulateButtonProps) {
  const isIdleOrHome = connectionStatus === "idle"

  const buttonText =
       connectionStatus === "idle"
        ? "Simulate"
        : connectionStatus === "connecting"
          ? "Connecting"
          : connectionStatus === "failed"
            ? "Failed"
            : connectionStatus === "simulating"
              ? "Simulating"
              : "Cancel"

  const handleClick = () => {
    if (connectionStatus === "cancel") {
      onCancel?.()
    } else if (isIdleOrHome) {
      onClick()
    }
  }

  const isDisabled =
    connectionStatus === "connecting" || connectionStatus === "failed" || connectionStatus === "simulating"

  return (
    <div className="relative flex justify-center items-center">
      <Button
        onClick={handleClick}
        disabled={isDisabled}
        className={cn(
          "rounded-xl border-4 border-zinc-400/30 shadow-[0_2px_6px_rgba(255,255,255,0.2)]",
          "transition-all duration-100 ease-in-out",
          "bg-zinc-200 hover:bg-blue-600",
          "text-lg tracking-normal",
          connectionStatus === "cancel" ? "text-red-900" : "text-zinc-800",
          "hover:text-white",
          "px-6 text-lg font-medium",
          isDisabled && "opacity-80 cursor-not-allowed"
        )}
      >
        {buttonText}
      </Button>

    </div>
  )
}
