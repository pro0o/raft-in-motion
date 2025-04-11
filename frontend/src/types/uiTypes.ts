import { LogTypeColors } from "@/components/styles/logStyles";

export interface LogBarData {
  id: number;
  color: LogTypeColors;
  message: string;
  speed: number;
  timestamp: string;
}