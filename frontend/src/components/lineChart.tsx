// "use client"

// import { useState, useEffect, useMemo } from "react"
// import {
//   Scatter,
//   ScatterChart,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   ResponsiveContainer,
//   Tooltip,
//   ZAxis,
//   Legend,
// } from "recharts"
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { useLogs } from "@/context/logsContext"
// import type { LogEntry } from "@/types/logs"

// interface AppendEntriesLog extends LogEntry {
//   raftID: number
// }

// export default function RaftAppendEntriesChart() {
//   const { logs } = useLogs()
//   const [startTime, setStartTime] = useState<number>(Date.now())
//   const [chartData, setChartData] = useState<Array<{ x: number; y: number }>>([])

//   useEffect(() => {
//     const newData = logs
//       .filter((log: LogEntry): log is AppendEntriesLog => log.event === "AppendEntries" && "raftID" in log)
//       .map((log: AppendEntriesLog) => ({
//         x: (Date.now() - startTime) / 1000, // Convert to seconds
//         y: log.raftID,
//       }))

//     setChartData((prevData) => [...prevData, ...newData])
//   }, [logs, startTime])

//   const maxTime = useMemo(() => Math.max(10, ...chartData.map((d) => d.x)), [chartData])

//   return (
//     <Card className="w-full max-w-2xl bg-white">
//       <CardHeader className="pb-4">
//         <CardTitle className="text-2xl font-semibold text-gray-700">Leader Ping-Pong Events</CardTitle>
//         <p className="text-sm text-gray-500">AppendEntries Call from leader to other servers</p>
//       </CardHeader>
      
//       <CardContent className="pt-0">
//         <div className="aspect-[4/3] w-full">
//           <ResponsiveContainer width="100%" height="100%">
//             <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: -10 }}>
//               <CartesianGrid strokeDasharray="4 4" stroke="#d6d6d6" />
//               <XAxis
//                 type="number"
//                 dataKey="x"
//                 name="Time"
//                 label={{
//                   value: "Time (s)",
//                   position: "bottom",
//                   offset: -5,
//                   fontSize: 14,
//                 }}
//                 domain={[0, maxTime]}
//                 tickFormatter={(value) => value.toFixed(1)}
//                 fontSize={11}
//                 stroke="#666"
//               />
//               <YAxis
//                 type="number"
//                 dataKey="y"
//                 name="Server ID"
//                 label={{
//                   value: "Server ID",
//                   angle: -90,
//                   position: "Left",
//                   offset: 10,
//                   fontSize: 14,
//                 }}
//                 ticks={[-1, 0, 1, 2]}
//                 domain={[-1, 2]}
//                 fontSize={11}
//                 stroke="#666"
//               />
//               <ZAxis range={[40, 40]} />
//               <Tooltip
//                 contentStyle={{
//                   backgroundColor: "white",
//                   border: "1px solid #e2e8f0",
//                   borderRadius: "6px",
//                   fontSize: "12px",
//                   padding: "8px",
//                 }}
//                 formatter={(value: number, name: string) => {
//                   if (name === "Time") {
//                     return [`${value.toFixed(2)} s`, name]
//                   }
//                   return [value, name]
//                 }}
//               />
              
//               <Scatter name="AppendEntries" data={chartData} fill="#4b5563" fillOpacity={0.8} />
//             </ScatterChart>
//           </ResponsiveContainer>
//         </div>
//       </CardContent>
//     </Card>
//   )
// }

