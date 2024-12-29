import React, { createContext, useContext, useRef, useState } from "react";
import { WebSocketService, LogEntry } from "@/services/wsService";

interface LogsContextType {
    connect: (action: string) => void;
    resetLogs: () => void;
    logs: LogEntry[];
    logCount: number; // Add log count to the context
}

const LogsContext = createContext<LogsContextType | null>(null);

export const LogsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const wsServiceRef = useRef<WebSocketService | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]); // State to store logs
    const [logCount, setLogCount] = useState(0); // State to store log count for the current session

    if (!wsServiceRef.current) {
        wsServiceRef.current = new WebSocketService("ws://localhost:8080/ws");

        // Attach callback for when logs are received or reset
        wsServiceRef.current.onLogReceived = (newLog: LogEntry | null) => {
            if (newLog === null) {
                console.log("[LogsProvider] Logs reset"); // Debug log for reset
                setLogs([]); // Clear logs when reset is signaled
                setLogCount(0); // Reset log count
            } else {
                setLogs((prevLogs) => {
                    const maxLogs = 100; // Limit the log size
                    const updatedLogs = [...prevLogs.slice(-maxLogs + 1), newLog];
                    // console.log("[LogsProvider] Log received:", newLog); // Debug log for new log
                    return updatedLogs;
                });
                setLogCount((prevCount) => prevCount + 1); // Increment log count
            }
        };
    }

    const connect = (action: string) => {
        console.log(`[LogsProvider] Connecting with action: ${action}`); // Debug log for connection
        resetLogs(); // Reset logs before establishing a new WebSocket connection
        wsServiceRef.current?.connect(action);
    };

    const resetLogs = () => {
        console.log("[LogsProvider] Resetting logs"); // Debug log for reset
        wsServiceRef.current?.resetLogs(); // Reset logs in the WebSocketService
        setLogCount(0); // Reset log count
    };

    return (
        <LogsContext.Provider value={{ connect, resetLogs, logs, logCount }}>
            {children}
        </LogsContext.Provider>
    );
};

export const useLogs = () => {
    const context = useContext(LogsContext);
    if (!context) {
        throw new Error("useLogs must be used within LogsProvider");
    }
    return context;
};
