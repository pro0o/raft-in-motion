import React, { createContext, useContext, useRef, useState} from "react";
import { WebSocketService } from "@/services/wsService";
import { LogEntry } from "@/types/logs";

interface LogsContextType {
  connect: (action: string) => void;
  logs: LogEntry[];
}

const LogsContext = createContext<LogsContextType | undefined>(undefined);

export const LogsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const wsServiceRef = useRef<WebSocketService | null>(null);
  
  // This queue will temporarily hold incoming logs
  // until we flush them out to `logs` at 1-second intervals
  const logQueueRef = useRef<LogEntry[]>([]);
  
  // The interval ID for flushing the queue
  const flushIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [logs, setLogs] = useState<LogEntry[]>([]);

  /**
   * This function starts an interval that flushes one log at a time
   * from `logQueueRef` into the `logs` state every 1 second.
   */
  const startFlushing = () => {
    // If there's already a flusher running, do nothing
    if (flushIntervalRef.current) return;

    flushIntervalRef.current = setInterval(() => {
      // If the queue is empty, stop the interval
      if (logQueueRef.current.length === 0) {
        if (flushIntervalRef.current) {
          clearInterval(flushIntervalRef.current);
          flushIntervalRef.current = null;
        }
        return;
      }

      // Dequeue the first log and add it to `logs`
      const nextLog = logQueueRef.current.shift()!;
      setLogs((prevLogs) => [...prevLogs, nextLog]);
    }, 1000);
  };

  /**
   * Adds the new log to the queue and ensures the flusher is running.
   */
  const enqueueLog = (newLog: LogEntry) => {
    logQueueRef.current.push(newLog);
    startFlushing();
  };

  /**
   * Called when we click a button or otherwise want to connect
   * and re-initialize logs.
   */
  const connect = (action: string) => {
    try {
      // Clear any existing WebSocket service
      wsServiceRef.current = null;

      // Also clear logs and any queued logs
      setLogs([]);
      logQueueRef.current = [];

      // Clear any existing flusher
      if (flushIntervalRef.current) {
        clearInterval(flushIntervalRef.current);
        flushIntervalRef.current = null;
      }

      // Create and connect a new WebSocket
      const newWsService = new WebSocketService("ws://localhost:8081/ws");

      // Instead of setting logs immediately, enqueue them
      newWsService.onLogReceived = (newLog: LogEntry) => {
        enqueueLog(newLog);
      };

      newWsService.connect(action);
      wsServiceRef.current = newWsService;
    } catch (error) {
      console.error("Failed to establish WebSocket connection:", error);
      throw error;
    }
  };

  const contextValue = React.useMemo(() => ({ connect, logs }), [logs]);

  return (
    <LogsContext.Provider value={contextValue}>
      {children}
    </LogsContext.Provider>
  );
};

export const useLogs = (): LogsContextType => {
  const context = useContext(LogsContext);
  if (!context) {
    throw new Error("useLogs must be used within LogsProvider");
  }
  return context;
};
