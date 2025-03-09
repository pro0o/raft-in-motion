"use client"
import { useLogs } from "@/context/logsContext"
import { getLogColor, processLogMessage } from "@/lib/logUtils"

const EventHistory = () => {
  const { logs } = useLogs()
  const logColor = logs.length > 0 ? getLogColor(logs[logs.length - 1]) : { bg: "" }
  
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-zinc-900 border-8 border-gray-200 rounded-2xl overflow-hidden shadow-md">
        <div className="flex items-center justify-between px-5 py-3 0">
          <h3 className="font-semibold text-white text-base">Event History</h3>
          <span className="text-xs text-zinc-400 font-medium">{logs.length} events</span>
        </div>
        {logs.length > 0 && (
          <div className={`px-5 py-3 ${logColor.bg}`}>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-300 font-medium uppercase tracking-wide">Current Event</span>
            </div>
            <div className="mt-1 text-md font-medium text-white break-words">
              {processLogMessage(logs[logs.length - 1])}
            </div>
          </div>
        )}
        <div className="h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900">
          {logs.length > 0 ? (
            <div className="divide-y divide-zinc-800/50">
              {logs
                .slice(0, -1)
                .reverse()
                .map((log, index) => (
                  <div key={index} className="px-5 py-2 text-sm text-zinc-400 break-words">
                    {processLogMessage(log)}
                  </div>
                ))}
            </div>
          ) : (
            <div className="px-4 py-10 text-sm text-center text-zinc-500">No events recorded yet</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default EventHistory