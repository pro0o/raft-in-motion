"use client"

import type React from "react"
import { useLogs } from "@/context/logsContext"
import { Button } from "@/components/ui/button"
import { LogIn } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const ControlPanel: React.FC = () => {
  const { connect } = useLogs()

  return (
    <Card className="w-full max-w-2xl mx-auto bg-white border border-gray-200 shadow-sm rounded-lg">
      <CardHeader className="text-left`">
        <CardTitle className="text-md font-semibold uppercase tracking-wider text-gray-700">
          Connection Controls
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full">
        <Button
  variant="outline"
  onClick={() => connect("put")}
  className="flex-1 flex items-center justify-center bg-gray-800 hover:bg-gray-700 border-gray-700 text-white py-2"
>
  
  <LogIn className="h-4 w-4 mr-2 text-white" />
  Connect Put
</Button>


          <Button
  variant="outline"
  onClick={() => connect("get")}
  className="flex-1 flex items-center justify-center bg-gray-800 hover:bg-gray-700 border-gray-700 text-white py-2"
>
  <LogIn className="h-4 w-4 mr-2 text-white" />
  Connect Get
</Button>

        </div>
      </CardContent>
    </Card>
  )
}

export default ControlPanel
