"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SimulateButtonProps {
  onClick: () => void
  connectionStatus: "home" | "idle" | "connecting" | "failed" | "simulating" | "cancel"
  onCancel?: () => void
}

export default function SimulateButton({ onClick, connectionStatus, onCancel }: SimulateButtonProps) {
  const isIdleOrHome = connectionStatus === "home" || connectionStatus === "idle"

  const buttonText =
    connectionStatus === "home"
      ? "Let's Simulate"
      : connectionStatus === "idle"
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
    "transition-all duration-300 ease-in-out",
    "bg-zinc-200 hover:bg-blue-600",
    "text-lg tracking-normal",
    connectionStatus === "cancel" ? "text-red-900" : "text-zinc-800",
    "hover:text-white",
    "shadow-none hover:shadow-[0_4px_6px_rgba(24,24,27,0.2)]",
    "hover:scale-[1.03] active:scale-[0.98]",
    "px-6 py-2 text-lg font-medium",
    isDisabled && "opacity-80 cursor-not-allowed"
  )}
>
  {buttonText}
</Button>

    </div>
  )
}
