import React, { createContext, useContext, useRef, useState, useCallback, useMemo } from "react";
import  { WebSocketService}  from "@/services/wsService";
import { LogMessageType } from "@/types/raftEnums";
import { Log, ServerListeningLog, PeerConnectedLog,
  PeerDisconnectedLog, ElectionTimerLog, StateTransitionLog, VoteLog,
  ElectionWonLog, PutRequestInitiatedLog, ResponseLeaderLog,
  PutRequestCompletedLog, LeaderConnectionLog, ShutdownLog, NodeDeadLog, DisconnectionLog  } from "@/types/raftTypes";

const WS_ENDPOINT = process.env.NEXT_PUBLIC_WS_ENDPOINT || 'wss://localhost:8081/ws';
const LOG_FLUSH_INTERVAL = 750; 

export enum ConnectionStatus {
  DISCONNECTED,
  CONNECTING,
  CONNECTED
}

interface LogsContextType {
  connect: (action: string) => void;
  logs: Log[];
  clearLogs: () => void;
  disconnect: () => void;
  connectionStatus: ConnectionStatus; 
}

const parseLog = (rawLog: Partial<Log>): Log | null => {
  if (!rawLog || typeof rawLog !== "object" || !rawLog.message) {
    console.warn("Invalid log received:", rawLog);
    return null;
  }

  const { message } = rawLog;

  switch (message) {
    case LogMessageType.SERVER_LISTENING:
      return rawLog as ServerListeningLog;

    case LogMessageType.PEER_CONNECTED:
      return rawLog as PeerConnectedLog;

    case LogMessageType.PEER_DISCONNECTED:
      return rawLog as PeerDisconnectedLog;

    case LogMessageType.ELECTION_TIMER_STARTED:
    case LogMessageType.ELECTION_TIMER_STOPPED_I:
    case LogMessageType.ELECTION_TIMER_STOPPED_II:
    case LogMessageType.ELECTION_TIMEOUT:
      return rawLog as ElectionTimerLog;

    case LogMessageType.STATE_TRANSITION:
      return rawLog as StateTransitionLog;

    case LogMessageType.REQUEST_VOTE:
    case LogMessageType.RECEIVE_VOTE:
    case LogMessageType.VOTE_FAILURE:
      return rawLog as VoteLog;

    case LogMessageType.ELECTION_WON:
    case LogMessageType.ELECTION_LOST:
      return rawLog as ElectionWonLog;

    case LogMessageType.PUT_REQUEST_INITIATED:
      return rawLog as PutRequestInitiatedLog;

    case LogMessageType.RESPONSE_NOT_LEADER:
    case LogMessageType.FOUND_LEADER:
      return rawLog as ResponseLeaderLog;

    case LogMessageType.PUT_REQUEST_COMPLETED:
      return rawLog as PutRequestCompletedLog;

    case LogMessageType.DISCONNECTING_LEADER:
    case LogMessageType.SERVICE_DISCONNECTING:
    case LogMessageType.RECONNECTING_ORIGINAL_LEADER:
    case LogMessageType.SERVICE_RECONNECTED:
      return rawLog as LeaderConnectionLog;

    case LogMessageType.SHUTDOWN_INITIALIZED:
    case LogMessageType.SHUTDOWN_COMPLETE:
      return rawLog as ShutdownLog;

    case LogMessageType.NODE_DEAD:
      return rawLog as NodeDeadLog;

    case LogMessageType.DISCONNECTION_INITIALIZED:
    case LogMessageType.DISCONNECTION_COMPLETE:
      return rawLog as DisconnectionLog;

    default:
      console.warn("Unknown log message type:", message);
      return null;
  }
};


const LogsContext = createContext<LogsContextType | undefined>(undefined);

export const LogsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const wsServiceRef = useRef<WebSocketService | null>(null);
  const logQueueRef = useRef<Log[]>([]);
  const flushIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);

  const cleanupResources = useCallback(() => {
    if (flushIntervalRef.current) {
      clearInterval(flushIntervalRef.current);
      flushIntervalRef.current = null;
    }
    
    if (wsServiceRef.current?.ws) {
      wsServiceRef.current.ws.close();
      wsServiceRef.current = null;
    }
    setConnectionStatus(ConnectionStatus.DISCONNECTED);
    // console.log(`Total logs processed: ${logs.length}`);
  }, [logs.length]);

  const startFlushing = useCallback(() => {
    if (flushIntervalRef.current) {
      clearInterval(flushIntervalRef.current);
    }
    
    flushIntervalRef.current = setInterval(() => {
      if (logQueueRef.current.length === 0) {
        clearInterval(flushIntervalRef.current!);
        flushIntervalRef.current = null;
        return;
      }
      
      const nextLog = logQueueRef.current.shift()!;
      setLogs(prevLogs => [...prevLogs, nextLog]);
    }, LOG_FLUSH_INTERVAL);
  }, []);

  const enqueueLog = useCallback((rawLogs: Log | Log[]) => {
    if (Array.isArray(rawLogs)) {
      rawLogs.forEach((rawLog) => {
        const parsedLog = parseLog(rawLog);
        if (parsedLog) {
          logQueueRef.current.push(parsedLog);
        }
      });
    } else {
      const parsedLog = parseLog(rawLogs);
      if (parsedLog) {
        logQueueRef.current.push(parsedLog);
      }
    }
  
    if (!flushIntervalRef.current && logQueueRef.current.length > 0) {
      startFlushing();
    }
  }, [startFlushing]);

  const resetState = useCallback(() => {
    setLogs([]);
    logQueueRef.current = [];
    
    if (flushIntervalRef.current) {
      clearInterval(flushIntervalRef.current);
      flushIntervalRef.current = null;
    }
  }, []);
  

  const connect = useCallback((action: string) => {
    try {
      cleanupResources();
      resetState();
      
      setConnectionStatus(ConnectionStatus.CONNECTING);
      // console.log("the ws endpoint is:", WS_ENDPOINT)
      
      const newWsService = new WebSocketService(WS_ENDPOINT);
      newWsService.onLogReceived = enqueueLog;
      newWsService.onOpen = () => setConnectionStatus(ConnectionStatus.CONNECTED);
      newWsService.onClose = () => setConnectionStatus(ConnectionStatus.DISCONNECTED);
      
      newWsService.connect(action);
      wsServiceRef.current = newWsService;
    } catch (error) {
      console.error("Failed to establish WebSocket connection:", error);
      setConnectionStatus(ConnectionStatus.DISCONNECTED);
      throw error;
    }
  }, [enqueueLog, resetState, cleanupResources]);

  const clearLogs = useCallback(() => {
    resetState();
  }, [resetState]);

  const disconnect = useCallback(() => {
    cleanupResources();
  }, [cleanupResources]);

  const contextValue = useMemo(() => ({
    connect,
    logs,
    clearLogs,
    disconnect,
    connectionStatus,
  }), [connect, logs, clearLogs, disconnect, connectionStatus]);

  return <LogsContext.Provider value={contextValue}>{children}</LogsContext.Provider>;
};

export const useLogs = (): LogsContextType => {
  const context = useContext(LogsContext);
  if (!context) {
    throw new Error("useLogs must be used within a LogsProvider");
  }
  return context;
};