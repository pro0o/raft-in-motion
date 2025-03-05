"use client"

import ControlPanel from "@/components/controlPanel"
import { LogsProvider } from "@/context/logsContext"
import ServerInstance from "@/components/serverInstances"

export default function Home() {
  return (
    <main className="flex flex-col bg-white h-screen p-14">
      <header className="flex items-center justify-between  w-full">
  <div className="flex items-center gap-4">
    <p className="text-3xl font-medium font-mono tracking-tighter text-gray-700">
      Raft-in-motion
    </p>
  </div>
  <p className="text-base text-gray-500">Simulating raft consensus algorithm in golang.</p>
</header>


      <LogsProvider>
        {/* <div className="flex-grow overflow-y-auto w-full bg-slate-100 border border-slate-200 rounded p-4">
              <ControlPanel />
        </div> */}
      <div className="w-full max-w-4xl mx-auto bg-zinc-900 text-white rounded-2xl overflow-hidden border-8 border-gray-200 shadow-lg">
        {[0, 1, 2].map((id, index) => (
          <div key={id} className="relative">
            <ServerInstance instanceId={id} />
            {index < 3 && <div className="absolute bottom-0 left-32 right-32 h-1 rounded-xl bg-zinc-800" />}
          </div>
        ))}
      </div>
      </LogsProvider>
    </main>
  )
}

