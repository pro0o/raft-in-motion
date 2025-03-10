"use client"

import { LogsProvider } from "@/context/logsContext"
import ServerInstance from "@/components/serverInstance"
import { LogDispatcherProvider } from "@/context/logsDispatcher"
import PixelGrid from "@/components/pixelGrid";
import EventHistory from "@/components/eventHistory";
import ControlPanel from "@/components/controlPanel";
import ActionSearchBar from "@/components/ui/actionBar";
import Footer from "./footer";

export default function Home() {
  const instances = [0, 1, 2];

  return (
    <main className="flex flex-col bg-white h-screen p-8 items-center justify-center">
      {/* <header className="absolute top-10 lowercase text-md font-medium text-zinc-800 opacity-100">
        <img src="/assets/raft-in-motion.svg" alt="Raft-in-motion" className="h-5" />
      </header> */}
      <LogsProvider>
        <LogDispatcherProvider>
          <div className="flex flex-row w-full max-w-6xl gap-4 items-center justify-center">
            <div className="w-2/5 bg-zinc-900 text-white overflow-hidden shadow-lg border-8 border-gray-200 rounded-2xl">
              {instances.map((id) => (
                <div key={id} className="relative">
                  <ServerInstance raftID={id} />
                </div>
              ))}
            </div>
            <div className="w-2/5 flex flex-col gap-4">
              <ActionSearchBar/>
              <PixelGrid />
              <EventHistory />
            </div>
          </div>
        </LogDispatcherProvider>
        {/* <ControlPanel/> */}
      {/* <SimulateButton/> */}
      </LogsProvider>
      <Footer/>
    </main>
  );
}
