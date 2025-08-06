"use client"

import { useLogs } from "@/context/logsContext"
import { getLogColor, processLogMessage } from "@/lib/logUtils"
import { useMediaQuery } from "@/context/mediaQuery"
import { useMemo } from "react"

const EventHistory = () => {
  const { logs } = useLogs()
  const logColor = logs.length > 0 ? getLogColor(logs[logs.length - 1]) : { bg: "" }
  const isMobile = useMediaQuery("(max-width: 640px)")
  const isTablet = useMediaQuery("(max-width: 1024px)")

  // Match the exact sizing logic from PixelGrid
  const config = useMemo(
    () => ({
      canvasSize: isMobile ? 300 : isTablet ? 350 : 400,
      padding: isMobile ? 8 : isTablet ? 12 : 16, // p-2, p-3, p-4 in pixels
    }),
    [isMobile, isTablet],
  )

  const totalWidth = config.canvasSize + config.padding * 2

  return (
    <div className="flex justify-center">
      <div
        className="bg-zinc-900 rounded-xl sm:rounded-xl overflow-hidden shadow-md" // Updated sm:rounded-2xl to sm:rounded-xl
        style={{ width: `${totalWidth}px` }}
      >
        <div className="flex items-center justify-between px-3 sm:px-5 py-2 sm:py-3">
          <h3 className="font-medium text-white text-sm sm:text-base">Event History</h3>
          <span className="text-xs text-zinc-400 font-medium">{logs.length} events</span>
        </div>
        {logs.length > 0 && (
          <div className={`px-3 sm:px-5 py-2 sm:py-3 ${logColor.bg}`}>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-300 font-medium uppercase tracking-wide">Current Event</span>
            </div>
            <div className="mt-1 text-sm sm:text-md font-medium text-white break-words">
              {processLogMessage(logs[logs.length - 1])}
            </div>
          </div>
        )}
        <div className="h-16 sm:h-20 md:h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900">
          {logs.length > 0 ? (
            <div className="divide-y divide-zinc-800/50">
              {logs
                .slice(0, -1)
                .reverse()
                .map((log, index) => (
                  <div key={index} className="px-3 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm text-zinc-400 break-words">
                    {processLogMessage(log)}
                  </div>
                ))}
            </div>
          ) : (
            <div className="px-3 sm:px-4 py-6 sm:py-10 text-xs sm:text-sm text-center text-zinc-500">
              Run the simulation bruh.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default EventHistory
