"use client"

import type React from "react"
import { useLogs } from "@/context/logsContext"
import { Button } from "@/components/ui/button"
import { LogIn } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const ControlPanel: React.FC = () => {
  const { connect } = useLogs()

  return (
    <Card className="w-full max-w-xl mx-auto bg-white border border-gray-200 shadow-sm rounded-lg">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full">
          <Button
            onClick={() => connect("put")}
            className="flex-1 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-white py-2 transition-colors duration-200"
          >
            <LogIn className="h-4 w-4 mr-2" />
            Connect the ws
          </Button>
        </div>
    </Card>
  )
}

export default ControlPanel

