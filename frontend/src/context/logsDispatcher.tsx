import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { Log } from "@/types/raftTypes";
import { useLogs } from "@/context/logsContext";

type LogCallback = (log: Log) => void;

interface LogDispatcherContextType {
  registerServer: (raftId: number, callback: LogCallback) => void;
  unregisterServer: (raftId: number) => void;
  resetLogProcessing: () => void; // Add method to reset processing state
}

const LogDispatcherContext = createContext<LogDispatcherContextType | undefined>(undefined);

export const LogDispatcherProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { logs, connectionStatus } = useLogs(); // Add connectionStatus to track connection state
  const lastProcessedIndexRef = useRef<number>(-1);
  const serverCallbacksRef = useRef<Map<number, LogCallback>>(new Map());

  const resetLogProcessing = useCallback(() => {
    lastProcessedIndexRef.current = -1;
  }, []);

  useEffect(() => {
    if (lastProcessedIndexRef.current >= logs.length - 1) return;

    const unprocessedLogs = logs
      .slice(lastProcessedIndexRef.current + 1)
      .filter((log): log is Log => 'raftID' in log && typeof log.raftID === 'number');
    
    if (unprocessedLogs.length === 0) {
      lastProcessedIndexRef.current = logs.length - 1;
      return;
    }

    unprocessedLogs.forEach((log) => {
      const callback = serverCallbacksRef.current.get(log.raftID);
      if (callback) {
        callback(log);
      }
    });

    lastProcessedIndexRef.current = logs.length - 1;
  }, [logs]);

  useEffect(() => {
    resetLogProcessing();
  }, [connectionStatus, resetLogProcessing]);

  const registerServer = useCallback((raftId: number, callback: LogCallback) => {
    serverCallbacksRef.current.set(raftId, callback);
  }, []);

  const unregisterServer = useCallback((raftId: number) => {
    serverCallbacksRef.current.delete(raftId);
  }, []);

  const contextValue = {
    registerServer,
    unregisterServer,
    resetLogProcessing
  };

  return (
    <LogDispatcherContext.Provider value={contextValue}>
      {children}
    </LogDispatcherContext.Provider>
  );
};

export const useLogDispatcher = () => {
  const context = useContext(LogDispatcherContext);
  if (!context) {
    throw new Error("useLogDispatcher must be used within a LogDispatcherProvider");
  }
  return context;
};

export const useServerLogs = (raftId: number) => {
  const { registerServer, unregisterServer } = useLogDispatcher();
  const { connectionStatus } = useLogs(); 
  const [serverLogs, setServerLogs] = useState<Log[]>([]);

  useEffect(() => {
    setServerLogs([]);
  }, [connectionStatus]);

  useEffect(() => {
    const logCallback = (log: Log) => {
      setServerLogs(prev => [...prev, log]);
    };
    
    registerServer(raftId, logCallback);
    return () => unregisterServer(raftId);
  }, [raftId, registerServer, unregisterServer, connectionStatus]);

  return serverLogs;
};