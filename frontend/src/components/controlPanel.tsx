"use client"

import type React from "react"
import { useLogs } from "@/context/logsContext"
import { Button } from "@/components/ui/button"
import { LogIn } from "lucide-react"

const ControlPanel: React.FC = () => {
  const { connect } = useLogs()

  return (
    <Button
      onClick={() => connect("put")}
      className="flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-white text-sm py-1 px-3 transition-colors duration-200"
    >
      <LogIn className="h-4 w-4 mr-1" />
      Connect
    </Button>
  )
}

export default ControlPanel
