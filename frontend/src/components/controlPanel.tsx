"use client"

import { useState } from "react"
import type React from "react"
import { useLogs } from "@/context/logsContext"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { LogIn } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const ControlPanel: React.FC = () => {
  const { connect } = useLogs()
  const [logFrequency, setLogFrequency] = useState(2)
  const [requestRate, setRequestRate] = useState(3)

  return (
    <Card className="w-full max-w-xl mx-auto bg-white border border-gray-200 shadow-sm rounded-lg">
      <CardHeader className="text-left">
      <CardTitle className="text-2xl font-semibold  text-gray-700">
  Simulation Control Panel
</CardTitle>
<p className="text-sm text-gray-500">
  Control the active connections & logs frequency.
</p>

      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-[minmax(auto,120px)_1fr_auto] items-center gap-5">
            <p className="text-sm font-medium text-gray-700">Log Frequency</p>
            <Slider
              value={[logFrequency]}
              onValueChange={(value) => setLogFrequency(Math.round(value[0]))}
              min={1}
              max={4}
              step={1}
              className="[&_[role=slider]]:bg-gray-800 [&_[role=slider]]:border-gray-800 [&_[role=slider]]:hover:bg-gray-700"
            />
            <span className="text-sm text-gray-500 whitespace-nowrap">{logFrequency}</span>
          </div>

          <div className="grid grid-cols-[minmax(auto,120px)_1fr_auto] items-center gap-5">
            <p className="text-sm font-medium text-gray-700">Request Rate</p>
            <Slider
              value={[requestRate]}
              onValueChange={(value) => setRequestRate(Math.round(value[0]))}
              min={1}
              max={5}
              step={1}
              className="[&_[role=slider]]:bg-gray-800 [&_[role=slider]]:border-gray-800 [&_[role=slider]]:hover:bg-gray-700"
            />
            <span className="text-sm text-gray-500 whitespace-nowrap">{requestRate}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full">
          <Button
            onClick={() => connect("put", { logFrequency, requestRate })}
            className="flex-1 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-white py-2 transition-colors duration-200"
          >
            <LogIn className="h-4 w-4 mr-2" />
            Connect Put
          </Button>

          <Button
            onClick={() => connect("get", { logFrequency, requestRate })}
            className="flex-1 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-white py-2 transition-colors duration-200"
          >
            <LogIn className="h-4 w-4 mr-2" />
            Connect Get
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default ControlPanel

