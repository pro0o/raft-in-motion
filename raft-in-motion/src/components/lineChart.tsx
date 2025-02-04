"use client"

import { useState, useEffect, useMemo } from "react"
import { Scatter, ScatterChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, ZAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useLogs } from "@/context/logsContext"
import type { LogEntry } from "@/types/logs"

interface AppendEntriesLog extends LogEntry {
  raftID: number
}

export default function RaftAppendEntriesChart() {
  const { logs } = useLogs()
  const [startTime, setStartTime] = useState<number>(Date.now())
  const [chartData, setChartData] = useState<Array<{ x: number; y: number }>>([])

  useEffect(() => {
    const newData = logs
      .filter((log: LogEntry): log is AppendEntriesLog => log.event === "AppendEntries" && "raftID" in log)
      .map((log: AppendEntriesLog) => ({
        x: (Date.now() - startTime) / 1000, // Convert to seconds
        y: log.raftID,
      }))

    setChartData((prevData) => [...prevData, ...newData])
  }, [logs, startTime])

  const maxTime = useMemo(() => Math.max(10, ...chartData.map((d) => d.x)), [chartData])

  return (
    <Card className="w-full max-w-3xl bg-white">
      <CardHeader>
        <CardTitle>Raft AppendEntries Events</CardTitle>
        <CardDescription>Visualizing AppendEntries events over time for different Raft IDs</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="x"
                name="Time"
                label={{ value: "Time (seconds)", position: "insideBottom", offset: -10 }}
                domain={[0, maxTime]}
                tickFormatter={(value) => value.toFixed(1)}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Server ID"
                label={{ value: "Raft ID", angle: -90, position: "insideLeft" }}
                ticks={[-1, 0, 1, 2]}
                domain={[-1, 2]}
              />
              <ZAxis range={[60, 60]} />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === "Time") {
                    return [`${value.toFixed(2)} s`, name]
                  }
                  return [value, name]
                }}
              />
              <Scatter name="AppendEntries" data={chartData} fill="hsl(var(--chart-1))" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

