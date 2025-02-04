"use client"

import RaftVisualization from "@/components/raftVisualization"
import RaftLogReplicationChart from "@/components/lineChart"
import ControlPanel from "@/components/controlPanel"
import { LogsProvider } from "@/context/logsContext"

export default function Home() {
  return (
    <main className="flex flex-col bg-white h-screen p-3">
      <header className="flex justify-between items-center pb-2">
        <div className="flex items-center gap-2">
          <p className="font-mono text-2xl">Raft in motion</p>
        </div>
        <p className="text-md text-slate-500">Simulating raft consensus algorithm in go.</p>
      </header>

      <LogsProvider>
        <div className="flex-grow overflow-y-auto w-full bg-slate-100 border border-slate-200 rounded p-4">
          <div className="grid grid-cols-3 h-full gap-5">
            {/* Server Column - Takes up 2/3 of the space */}
            <div className="col-span-2">
              <RaftVisualization />
            </div>
            {/* Control Panel Column - Takes up 1/3 of the space */}
            <div className="flex flex-col gap-3">
              <ControlPanel />
              <RaftLogReplicationChart/>
            </div>
          </div>
        </div>
      </LogsProvider>
    </main>
  )
}

