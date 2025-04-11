export interface LogTypeColors {
  bg: string;
  glow: string;
  text: string;
}

export const logTypeColors = {
  ELECTION_COLOR: { bg: "bg-blue-800/90", glow: "bg-blue-600/20", text: "text-white" },
  STATE_COLOR: { bg: "bg-pink-800/90", glow: "bg-emerald-500/20", text: "text-white" },
  SERVER_COLOR: { bg: "bg-emerald-900/80", glow: "bg-green-500/20", text: "text-white" },
  CONNECTION_COLOR: { bg: "bg-gray-950/80", glow: "bg-gray-700/20", text: "text-white" },
};
