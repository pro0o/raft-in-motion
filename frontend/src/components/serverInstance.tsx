"use client"

import { useState, useRef, useEffect } from "react"
import { useServerLogs } from "@/context/logsDispatcher"
import { RaftState } from "@/types/raftEnums";
import { ConnectionStatus, useLogs } from "@/context/logsContext";
import { LogBarData } from "@/types/uiTypes";
import { Log, StateTransitionLog,  
  ElectionWonLog, 
  LeaderConnectionLog, DisconnectionLog } from "@/types/raftTypes";
import { processLogMessage, getLogColor, getLogSpeed } from "@/lib/logUtils";
import { ServerHeader } from "@/components/raft/serverHeader";
import { LogVisualizer } from "@/components/raft/raftVisualizer";
import { LogMessageType } from "@/types/raftEnums";
import { LogProcessorService } from "@/services/logProcessorService";

interface ServerInstanceProps {
  raftID: number;
}

export default function ServerInstance({ raftID }: ServerInstanceProps) {
  const [currentState, setCurrentState] = useState<RaftState>(RaftState.FOLLOWER);
  const [currentTerm, setCurrentTerm] = useState<number>(0);
  const [bars, setBars] = useState<LogBarData[]>([]);
  const [containerHeight, setContainerHeight] = useState(40);
  const containerRef = useRef(null);
  
  const serverLogs = useServerLogs(raftID);
  const { connectionStatus } = useLogs(); 
  const logProcessor = new LogProcessorService(raftID, setCurrentState, setCurrentTerm);

  useEffect(() => {
    if (connectionStatus === ConnectionStatus.CONNECTING) {
      setBars([]);
      setCurrentState(RaftState.FOLLOWER);
      setCurrentTerm(1);
      setContainerHeight(40);
    }
  }, [connectionStatus]);
  
  useEffect(() => {
    if (serverLogs.length === 0) return;

    const latestLog = serverLogs[serverLogs.length - 1];
    processLog(latestLog);
  }, [serverLogs]);

  const processLog = (log: Log) => {
    addLogBar(log);
  
    switch (log.message) {
      case LogMessageType.STATE_TRANSITION:
        logProcessor.processStateTransition(log as StateTransitionLog);
        break;
  
      case LogMessageType.PEER_CONNECTED:
        break;
  
      case LogMessageType.PEER_DISCONNECTED:
        break;
  
      case LogMessageType.ELECTION_TIMER_STARTED:
      case LogMessageType.ELECTION_TIMEOUT:
      case LogMessageType.ELECTION_TIMER_STOPPED_I:
      case LogMessageType.ELECTION_TIMER_STOPPED_II:
        break;
  
      case LogMessageType.ELECTION_WON:
        logProcessor.processElectionWon(log as ElectionWonLog);
        break;
  
      case LogMessageType.SHUTDOWN_INITIALIZED:
      case LogMessageType.SHUTDOWN_COMPLETE:
        break;
  
      case LogMessageType.REQUEST_VOTE:
      case LogMessageType.RECEIVE_VOTE:
      case LogMessageType.VOTE_FAILURE:
        break;
  
      case LogMessageType.DISCONNECTING_LEADER:
      case LogMessageType.SERVICE_DISCONNECTING:
      case LogMessageType.RECONNECTING_ORIGINAL_LEADER:
      case LogMessageType.SERVICE_RECONNECTED:
        logProcessor.processLeaderConnection(log as LeaderConnectionLog);
        break;
  
      case LogMessageType.DISCONNECTION_INITIALIZED:
      case LogMessageType.DISCONNECTION_COMPLETE:
        logProcessor.processDisconnection(log as DisconnectionLog);
        break;
  
      case LogMessageType.NODE_DEAD:
        break;
  
      default:
        console.warn("Unhandled log message type:", log.message);
        break;
    }
  };

  const addLogBar = (log: Log) => {
    const newId = bars.length > 0 ? Math.max(...bars.map((bar) => bar.id)) + 1 : 1;
    const formattedMessage = processLogMessage(log);
    const color = getLogColor(log);
    const speed = getLogSpeed(log);

    const newBar = {
      id: newId,
      color: color,
      message: formattedMessage,
      speed: speed, 
      timestamp: new Date().toISOString()
    };

    setBars((prevBars) => [...prevBars, newBar]);

    setTimeout(() => {
      setContainerHeight((prevHeight) => prevHeight + 25);
    }, 10);
  };

  const handleBarExit = (id) => {
    setBars((prevBars) => prevBars.filter((bar) => bar.id !== id));

    setTimeout(() => {
      setContainerHeight((prevHeight) => Math.max(40, prevHeight - 25));
    }, 100);
  };

  return (
    <div className="w-full py-4 px-4 space-y-6">
      <ServerHeader 
        raftID={raftID} 
        currentState={currentState} 
        currentTerm={currentTerm} 
      />

      <LogVisualizer 
        containerRef={containerRef}
        containerHeight={containerHeight}
        bars={bars}
        handleBarExit={handleBarExit}
      />
    </div>
  )
}