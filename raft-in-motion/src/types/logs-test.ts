interface BaseLogEntry {
    event: string;
    timestamp: number;
}

interface RaftLogEntry extends BaseLogEntry {
    raftID: number;
    term: number;
    state: number;
}

interface VoteLogEntry extends RaftLogEntry {
    voteGranted: boolean;
    from: number | null;
    to: number | null;
}

interface TimeoutLogEntry extends RaftLogEntry {
    timeout: number;
}

interface KVLogEntry extends BaseLogEntry {
    kvID: number;
    key: string;
    value: string;
    clientID: number;
}

interface ServerListeningLogEntry extends BaseLogEntry {
    raftID: number;
    address: string;
}

interface PeerConnectionLogEntry extends ServerListeningLogEntry {
    to: number;
}

interface StateTransitionLogEntry extends RaftLogEntry {
    oldState: string;
    newState: string;
}

type LogEntry = 
    | RaftLogEntry 
    | VoteLogEntry 
    | TimeoutLogEntry 
    | KVLogEntry 
    | ServerListeningLogEntry 
    | PeerConnectionLogEntry
    | StateTransitionLogEntry;
