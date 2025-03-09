import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { useLogs } from "@/context/logsContext";
import { ConnectionStatus } from "@/context/logsContext";
import { processLogMessage, getLogColor } from "@/lib/logUtils";
import { Log } from "@/types/raftTypes";
import { getRgbFromGlow } from "@/lib/logUtils";

interface LogVisualizationContextType {
  color: string;
  activityText: string;
}

const LogVisualizationContext = createContext<LogVisualizationContextType>({
  color: "256, 256, 256",
  activityText: "Nothing Happening",
});

export const useLogVisualization = () => useContext(LogVisualizationContext);

interface LogVisualizationProviderProps {
  children: React.ReactNode;
}

const LogChecker: React.FC<LogVisualizationProviderProps> = ({ children }) => {
  const { logs, connectionStatus } = useLogs();
  const [color, setColor] = useState<string>("256, 256, 256");
  const [activityText, setActivityText] = useState<string>("Nothing Happening");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  console.log("state called!")
  const updateVisualization = (log: Log) => {
    const logColor = getLogColor(log);
    const glowRgb = getRgbFromGlow(logColor.glow);
    setColor(glowRgb);
    setActivityText(processLogMessage(log));
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (connectionStatus !== ConnectionStatus.CONNECTED) {
      setColor("256, 256, 256");
      setActivityText("Nothing Happening");
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    if (logs.length > 0) {
      updateVisualization(logs[logs.length - 1]);
    }

    if (!intervalRef.current) {
      intervalRef.current = setInterval(() => {
        if (logs.length > 0) {
          const latestLog = logs[logs.length - 1];
          updateVisualization(latestLog);
        }
      }, 5000);
    }

  }, [connectionStatus, logs]);

  useEffect(() => {
    console.log("color:", color);
    console.log("activity:", activityText);
  }, [color, activityText]);

  return (
    <LogVisualizationContext.Provider value={{ color, activityText }}>
      {children}
    </LogVisualizationContext.Provider>
  );
};

export default LogChecker;