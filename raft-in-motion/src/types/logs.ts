export interface Command {
  Kind: number;
  Key: string;
  Value: string;
  CompareValue: string;
  ResultValue: string;
  ResultFound: boolean;
  Id: number;
}

export interface LogEntry {
  clientID?: number;
  event: string;
  path?: string;
  timestamp: number;
  raftID?: number;
  term?: number;
  kvID?: number;
  address?: string;
  duration?: number;
  newState?: string;
  reason?: string;
  command?: Command;
  request?: {
    Key: string;
    Value: string;
  };
  response?: {
    RespStatus: number;
    KeyFound: boolean;
    PrevValue: string;
  };
  log?: Array<{
    Command: Command;
    Term: number;
  }> | null;
  action?: string;
  currentLog?: Array<{
    Command: Command;
    Term: number;
  }> | null;
  newEntries?: Array<{
    Command: Command;
    Term: number;
  }>;
  matchIndex?: Record<string, number>;
  nextIndex?: Record<string, number>;
  newCommitIndex?: number;
  oldCommitIndex?: number;
  commitIndex?: number;
  state?: number;
  candidateId?: number;
  candidateTerm?: number;
  lastIndex?: number;
  lastTerm?: number;
  localTerm?: number;
  votedFor?: number;
  voteGranted?: boolean;
  from?: number;
  to?: number;
  votesReceived?: number;
}