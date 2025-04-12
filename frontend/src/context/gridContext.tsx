"use client"

import { useState, useEffect } from "react"
import { useLogs } from "@/context/logsContext"
import { processActivity } from "@/lib/logUtils"

export interface LogVisualizationContextType {
  color: string | null
  activity: string | null
}

export const useLogVisualization = (): LogVisualizationContextType => {
  const [color, setColor] = useState<string | null>("220, 220, 220");

  const [activity, setActivity] = useState<string | null>("Nothing much happenning rn")
  const { logs, connectionStatus } = useLogs()

  useEffect(() => {
    if (!logs.length) return

    if (logs.length % 7 === 0) {
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