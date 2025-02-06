import React, { createContext, useContext, useRef, useState, useCallback } from "react"
import { WebSocketService } from "@/services/wsService"
import type { LogEntry } from "@/types/logs"

interface LogsContextType {
  connect: (action: string, options: { logFrequency: number; requestRate: number }) => void
  logs: LogEntry[]
  clearLogs: () => void
  resetServerStates: () => void
}

const LogsContext = createContext<LogsContextType | undefined>(undefined)

export const LogsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const wsServiceRef = useRef<WebSocketService | null>(null)
  const logQueueRef = useRef<LogEntry[]>([])
  const flushIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const initialServerStates = [
    { id: 0, raftID: 0, state: "Follower", term: 0, votedFor: null, hasVoted: false },
    { id: 1, raftID: 1, state: "Follower", term: 0, votedFor: null, hasVoted: false },
    { id: 2, raftID: 2, state: "Follower", term: 0, votedFor: null, hasVoted: false }
  ]
  const serverStatesRef = useRef(initialServerStates)

  const startFlushing = useCallback((logFrequency: number) => {
    if (flushIntervalRef.current) {
      clearInterval(flushIntervalRef.current)
      flushIntervalRef.current = null
    }

    flushIntervalRef.current = setInterval(() => {
      if (logQueueRef.current.length === 0) {
        if (flushIntervalRef.current) {
          clearInterval(flushIntervalRef.current)
          flushIntervalRef.current = null
          resetServerStates()
        }
        return
      }

      const nextLog = logQueueRef.current.shift()!
      setLogs((prevLogs) => [...prevLogs, nextLog])
    }, logFrequency * 250)
  }, [])

  const resetServerStates = useCallback(() => {
    serverStatesRef.current = [...initialServerStates]
  }, [])

  const enqueueLog = useCallback((newLog: LogEntry, logFrequency: number) => {
    logQueueRef.current.push(newLog)
    if (!flushIntervalRef.current) {
      startFlushing(logFrequency)
    }
  }, [startFlushing])

  const connect = useCallback((action: string, options: { logFrequency: number; requestRate: number }) => {
    try {
      wsServiceRef.current?.ws?.close()
      wsServiceRef.current = null
      setLogs([])
      logQueueRef.current = []
      resetServerStates()

      if (flushIntervalRef.current) {
        clearInterval(flushIntervalRef.current)
        flushIntervalRef.current = null
      }

      const newWsService = new WebSocketService('ws://localhost:8081/ws', { requestRate: options.requestRate })

      newWsService.onLogReceived = (newLog: LogEntry) => {
        enqueueLog(newLog, options.logFrequency)
      }

      newWsService.connect('put')
      wsServiceRef.current = newWsService
    } catch (error) {
      console.error("Failed to establish WebSocket connection:", error)
      throw error
    }
  }, [enqueueLog, resetServerStates])

  const clearLogs = useCallback(() => {
    setLogs([])
    logQueueRef.current = []
    resetServerStates()
    if (flushIntervalRef.current) {
      clearInterval(flushIntervalRef.current)
      flushIntervalRef.current = null
    }
  }, [resetServerStates])

  const contextValue = React.useMemo(() => ({ 
    connect, 
    logs, 
    clearLogs,
    resetServerStates
  }), [connect, logs, clearLogs, resetServerStates])

  return <LogsContext.Provider value={contextValue}>{children}</LogsContext.Provider>
}

export const useLogs = (): LogsContextType => {
  const context = useContext(LogsContext)
  if (!context) {
    throw new Error("useLogs must be used within LogsProvider")
  }
  return context
}