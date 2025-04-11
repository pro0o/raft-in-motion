"use client"

import { LogsProvider } from "@/context/logsContext"
import ServerInstance from "@/components/serverInstance"
import { LogDispatcherProvider } from "@/context/logsDispatcher"
import PixelGrid from "@/components/pixelGrid"
import EventHistory from "@/components/eventHistory"
import ActionSearchBar from "@/components/ui/actionBar"
import Footer from "../footer"
import { useMediaQuery } from "@/context/mediaQuery"

export default function RaftPage() {
  const instances = [0, 1, 2]
  const isMobile = useMediaQuery("(max-width: 768px)")
  const isTablet = useMediaQuery("(max-width: 1024px)")

  return (
    <div className="flex flex-col bg-white min-h-screen items-center justify-start px-4 py-2 sm:py-3 md:pt-6 lg:pt-8 pb-4">
      <LogsProvider>
        <LogDispatcherProvider>
          <div
            className={`flex ${isMobile ? "flex-col" : "flex-row"} w-full max-w-6xl gap-4 md:gap-6 items-center justify-center`}
          >
            <div
              className={`${isMobile ? "w-full" : isTablet ? "w-1/2" : "w-2/5"} bg-zinc-900 text-white overflow-hidden shadow-lg border-4 sm:border-6 md:border-8 border-gray-200 rounded-xl sm:rounded-2xl md:rounded-3xl`}
            >
              {instances.map((id) => (
                <div key={id} className="relative">
                  <ServerInstance raftID={id} />
                </div>
              ))}
            </div>
            <div className={`${isMobile ? "w-full" : isTablet ? "w-1/2" : "w-2/5"} flex flex-col gap-4`}>
              <ActionSearchBar />
              <PixelGrid />
              <EventHistory />
            </div>
          </div>
        </LogDispatcherProvider>
      </LogsProvider>
      <div className="mt-auto pt-4">
        <Footer />
      </div>
    </div>
  )
}
