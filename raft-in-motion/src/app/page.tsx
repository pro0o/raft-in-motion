"use client"

import RaftVisualization from "@/components/raftVisualization"
import RaftLogReplicationChart from "@/components/lineChart"
import ControlPanel from "@/components/controlPanel"
import { LogsProvider } from "@/context/logsContext"

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
        <div className="flex-grow overflow-y-auto w-full bg-slate-100 border border-slate-200 rounded p-4">
          <div className="grid grid-cols-3 h-full gap-8">
            {/* Server Column - Takes up 2/3 of the space */}
            <div className="col-span-2">
              <RaftVisualization />
            </div>
            {/* Control Panel Column - Takes up 1/3 of the space */}
            <div className="flex flex-col gap-2">
              <ControlPanel />
              <RaftLogReplicationChart/>
            </div>
          </div>
        </div>
      </LogsProvider>
    </main>
  )
}

