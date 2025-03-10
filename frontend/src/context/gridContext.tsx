"use client"

import { useState, useEffect } from "react"
import { useLogs, ConnectionStatus } from "@/context/logsContext"
import { processActivity } from "@/lib/logUtils"

export interface LogVisualizationContextType {
  color: string | null
  activity: string | null
}

export const useLogVisualization = (): LogVisualizationContextType => {
  const [color, setColor] = useState<string | null>("255, 255, 255")
  const [activity, setActivity] = useState<string | null>("Nothing much happenning")
  const { logs, connectionStatus } = useLogs()

  useEffect(() => {
    if (!logs.length || connectionStatus !== ConnectionStatus.CONNECTED) return

    if (logs.length % 15 === 0) {
      const latestLog = logs[logs.length - 1]
      if (!latestLog) return

      const { activityText, color } = processActivity(latestLog)
      setActivity(activityText)
      setColor(color)
    }
  }, [logs, connectionStatus])

  return {
    color,
    activity
  }
}