"use client"

import ControlPanel from "@/components/controlPanel"
import { LogsProvider } from "@/context/logsContext"
import ServerInstance from "@/components/serverInstance"
import { LogDispatcherProvider } from "@/context/logsDispatcher"
import PixelGrid from "@/components/pixelGrid"

export default function Home() {
  return (
    <main className="flex bg-white-900 text-white h-screen p-8">
      <LogsProvider>
        <LogDispatcherProvider>
          <div className="flex gap-8 w-full max-w-16xl">
            {/* Server Instances (Left Side) */}
            <div className="flex flex-col gap-4 w-full max-w-4xl">
              {[0, 1, 2].map((id) => (
                <div key={id} className="w-full bg-zinc-900 text-white rounded-2xl overflow-hidden border-8 border-zinc-300 shadow-lg">
                  <div className="relative">
                    <ServerInstance raftID={id} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </LogDispatcherProvider>
      </LogsProvider>

            {/* PixelGrid (Right Side) */}
            <div className="flex items-center">
              <PixelGrid />
            </div>
    </main>
  )
}
