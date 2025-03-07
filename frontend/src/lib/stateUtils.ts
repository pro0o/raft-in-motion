import { RaftState } from "@/types/raftEnums"

export function getStateName(state: RaftState): string {
  switch (state) {
    case RaftState.FOLLOWER:
      return "Follower"
    case RaftState.CANDIDATE:
      return "Candidate"
    case RaftState.LEADER:
      return "Leader"
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
    default:
      return "bg-gray-400"
  }
}

export function getStateBorderColor(state: RaftState): string {
  switch (state) {
    case RaftState.FOLLOWER:
      return "border-blue-600/30"
    case RaftState.CANDIDATE:
      return "border-amber-600/30"
    case RaftState.LEADER:
      return "border-emerald-600/30"
    default:
      return "border-gray-600/30"
  }
}

