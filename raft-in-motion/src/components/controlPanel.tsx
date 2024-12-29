"use client"

import React from "react"
import { useLogs } from "@/context/logsContext"
import { Button } from "@/components/ui/button"
import { LogIn } from 'lucide-react'

const ControlPanel: React.FC = () => {
  const { connect } = useLogs()

  return (
    <div className="bg-white p-3 sm:p-4 md:p-6 rounded-lg flex items-center justify-center w-full max-w-xs sm:max-w-md md:max-w-lg mx-auto">
      <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 md:gap-4 w-full">
        <Button
          className="w-full sm:w-auto border border-gray-200 shadow-sm rounded-lg bg-white hover:bg-gray-50 text-gray-700 text-sm sm:text-base px-3 sm:px-4 py-2 sm:py-2.5"
          onClick={() => connect("put")}
        >
          <LogIn className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
          Connect: Put
        </Button>

        <Button
          className="w-full sm:w-auto border border-gray-200 shadow-sm rounded-lg bg-white hover:bg-gray-50 text-gray-700 text-sm sm:text-base px-3 sm:px-4 py-2 sm:py-2.5"
          onClick={() => connect("get")}
        >
          <LogIn className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
          Connect: Get
        </Button>
        
      </div>
    </div>
  )
}

export default ControlPanel

