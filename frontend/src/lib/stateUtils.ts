import { RaftState } from "@/types/raftEnums"

export function getStateName(state: RaftState): string {
  switch (state) {
    case RaftState.FOLLOWER:
      return "Follower"
    case RaftState.CANDIDATE:
      return "Candidate"
    case RaftState.LEADER:
      return "Leader"
    case RaftState.DEAD:
      return "Dead"
    case RaftState.DISCONNECTED:
      return "Disconnected"
    default:
      return "Unknown"
  }
}

export function getStateColor(state: RaftState): string {
  switch (state) {
    case RaftState.FOLLOWER:
      return "text-blue-400"
    case RaftState.CANDIDATE:
      return "text-yellow-400"
    case RaftState.LEADER:
      return "text-emerald-400"
    case RaftState.DEAD:
      return "text-zinc-400"
    case RaftState.DISCONNECTED:
      return "text-pink-500"
    default:
      return "text-gray-400"
  }
}

export function getStateBgColor(state: RaftState): string {
  switch (state) {
    case RaftState.FOLLOWER:
      return "bg-blue-400"
    case RaftState.CANDIDATE:
      return "bg-yellow-400"
    case RaftState.LEADER:
      return "bg-green-500"
    case RaftState.DEAD:
      return "bg-gray-500"
    case RaftState.DISCONNECTED:
      return "bg-pink-500/90"
    default:
      return "bg-gray-400"
  }
}
