"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useServerLogs } from "@/context/logsDispatcher"
import { RaftState } from "@/types/raftEnums"
import { ConnectionStatus, useLogs } from "@/context/logsContext"
import type { LogBarData } from "@/types/uiTypes"
import type { Log, StateTransitionLog, ElectionWonLog } from "@/types/raftTypes"
import { processLogMessage, getLogColor, getLogSpeed } from "@/lib/logUtils"
import { ServerHeader } from "@/components/raft/serverHeader"
import { LogVisualizer } from "@/components/raft/raftVisualizer"
import { LogMessageType } from "@/types/raftEnums"
import { LogProcessorService } from "@/services/logProcessorService"

const MIN_CONTAINER_HEIGHT = 150;
const MAX_VISIBLE_BARS = 12;

interface ServerInstanceProps {
  raftID: number
}

export default function ServerInstance({ raftID }: ServerInstanceProps) {
  const [currentState, setCurrentState] = useState<RaftState>(RaftState.FOLLOWER)
  const [currentTerm, setCurrentTerm] = useState<number>(0)
  const [bars, setBars] = useState<LogBarData[]>([])
  const [containerHeight, setContainerHeight] = useState(MIN_CONTAINER_HEIGHT)
  const containerRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  
  const targetHeightRef = useRef(MIN_CONTAINER_HEIGHT)

  const serverLogs = useServerLogs(raftID)
  const { connectionStatus } = useLogs()
  const logProcessor = useRef(new LogProcessorService(raftID, setCurrentState, setCurrentTerm)).current

  useEffect(() => {
    if (connectionStatus === ConnectionStatus.CONNECTING) {
      setBars([])
      setCurrentState(RaftState.FOLLOWER)
      setCurrentTerm(1)
      targetHeightRef.current = MIN_CONTAINER_HEIGHT
      setContainerHeight(MIN_CONTAINER_HEIGHT)
    }
  }, [connectionStatus])

  useEffect(() => {
    if (serverLogs.length === 0) return
    const latestLog = serverLogs[serverLogs.length - 1]
    processLog(latestLog)
  }, [serverLogs])

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])
  const animateHeight = useCallback(() => {
    const currentHeight = containerHeight
    const targetHeight = targetHeightRef.current
  
    if (Math.abs(targetHeight - currentHeight) < 0.5) {
      setContainerHeight(targetHeight)
      animationFrameRef.current = null
      return
    }
  
    const newHeight = currentHeight + (targetHeight - currentHeight) * 0.15
  
    setContainerHeight(newHeight)
  
    animationFrameRef.current = requestAnimationFrame(animateHeight)
  }, [containerHeight])
  

  const processLog = useCallback((log: Log) => {
    addLogBar(log)

    switch (log.message) {
      case LogMessageType.STATE_TRANSITION:
        logProcessor.processStateTransition(log as StateTransitionLog)
        break

      case LogMessageType.ELECTION_WON:
        logProcessor.processElectionWon(log as ElectionWonLog)
        break

      case LogMessageType.DISCONNECTING_LEADER:
      case LogMessageType.SERVICE_DISCONNECTING:
      case LogMessageType.RECONNECTING_ORIGINAL_LEADER:
      case LogMessageType.SERVICE_RECONNECTED:
        logProcessor.processLeaderConnection()
        break

      case LogMessageType.DISCONNECTION_INITIALIZED:
      case LogMessageType.DISCONNECTION_COMPLETE:
        logProcessor.processDisconnection()
        break

      case LogMessageType.PEER_CONNECTED:
      case LogMessageType.PEER_DISCONNECTED:
      case LogMessageType.ELECTION_TIMER_STARTED:
      case LogMessageType.ELECTION_TIMEOUT:
      case LogMessageType.ELECTION_TIMER_STOPPED_I:
      case LogMessageType.ELECTION_TIMER_STOPPED_II:
      case LogMessageType.SHUTDOWN_INITIALIZED:
      case LogMessageType.SHUTDOWN_COMPLETE:
      case LogMessageType.REQUEST_VOTE:
      case LogMessageType.RECEIVE_VOTE:
      case LogMessageType.VOTE_FAILURE:
      case LogMessageType.NODE_DEAD:
        break

      default:
        console.warn("Unhandled log message type:", log.message)
        break
    }
  }, [logProcessor])

  const addLogBar = useCallback((log: Log) => {
    setBars(prevBars => {
      const limitedBars = prevBars.length >= MAX_VISIBLE_BARS * 2 
        ? prevBars.slice(-MAX_VISIBLE_BARS) 
        : prevBars
      
      const newId = limitedBars.length > 0 
        ? Math.max(...limitedBars.map(bar => bar.id)) + 1 
        : 1
        
      const newBar = {
        id: newId,
        color: getLogColor(log),
        message: processLogMessage(log),
        speed: getLogSpeed(log),
        timestamp: new Date().toISOString()
      }
      
      return [...limitedBars, newBar]
    })
  }, [])

  const handleBarExit = useCallback((id: string | number) => {
    setBars(prevBars => prevBars.filter(bar => bar.id !== id))
  }, [])

  return (
    <div className="w-full py-2 sm:py-3 md:py-4 px-2 sm:px-3 md:px-4 space-y-3 sm:space-y-4 md:space-y-6">
      <ServerHeader raftID={raftID} currentState={currentState} currentTerm={currentTerm} />

      <LogVisualizer
        containerRef={containerRef}
        containerHeight={containerHeight}
        bars={bars}
        handleBarExit={handleBarExit}
      />
    </div>
  )
}