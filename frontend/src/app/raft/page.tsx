"use client"

import { LogsProvider } from "@/context/logsContext"
import ServerInstance from "@/components/serverInstance"
import { LogDispatcherProvider } from "@/context/logsDispatcher"
import PixelGrid from "@/components/pixelGrid"
import EventHistory from "@/components/eventHistory"
import ActionSearchBar from "@/components/ui/actionBar"
import Footer from "../footer"

export default function RaftPage() {
  const instances = [0, 1, 2]

  return (
    <div className="flex flex-col bg-white h-screen items-center justify-center pt-32 pb-8">
      <LogsProvider>
        <LogDispatcherProvider>
          <div className="flex flex-row w-full max-w-6xl gap-4 items-center justify-center">
            <div className="w-2/5 bg-zinc-900 text-white overflow-hidden shadow-lg border-8 border-gray-200 rounded-3xl">
              {instances.map((id) => (
                <div key={id} className="relative">
                  <ServerInstance raftID={id} />
                </div>
              ))}
            </div>
            <div className="w-2/5 flex flex-col gap-4">
              <ActionSearchBar />
              <PixelGrid />
              <EventHistory />
            </div>
          </div>
        </LogDispatcherProvider>
      </LogsProvider>
      <Footer />
    </div>
  )
}
