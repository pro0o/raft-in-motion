import { RaftState, LogMessageType } from "./raftEnums";

export interface BaseLog {
  level: string; 
  message: LogMessageType;
  time: string;
}

export interface ServerLog extends BaseLog {
  raftID: number;
}

export interface NetworkAddressLog extends ServerLog {
  address: string;
}

export interface ServerListeningLog extends NetworkAddressLog {
  message: LogMessageType.SERVER_LISTENING;
}

export interface PeerConnectedLog extends ServerLog {
  message: LogMessageType.PEER_CONNECTED;
  address: string;
  peer: number;
}

export interface PeerDisconnectedLog extends ServerLog {
  message: LogMessageType.PEER_DISCONNECTED;
  peer: number;
}

export interface RaftStateLog extends ServerLog {
  state: RaftState;
  term: number;
}

export interface ElectionTimerLog extends RaftStateLog {
  message:
    | LogMessageType.ELECTION_TIMER_STARTED
    | LogMessageType.ELECTION_TIMEOUT
    | LogMessageType.ELECTION_TIMER_STOPPED_I
    | LogMessageType.ELECTION_TIMER_STOPPED_II;
}

export interface StateTransitionLog extends ServerLog {
  message: LogMessageType.STATE_TRANSITION;
  oldState: RaftState;
  newState: RaftState;
}

export interface VoteLog extends ServerLog {
  message: 
    | LogMessageType.REQUEST_VOTE 
    | LogMessageType.RECEIVE_VOTE 
    | LogMessageType.VOTE_FAILURE;
  peer: number;
  state: string;
  term: number;
}

export interface ReceiveVoteLog extends VoteLog {
  message: LogMessageType.RECEIVE_VOTE;
  voteGranted: boolean;
}

export interface ElectionWonLog extends RaftStateLog {
  message: LogMessageType.ELECTION_WON;
}

export interface ElectionLostLog extends RaftStateLog {
  message: LogMessageType.ELECTION_LOST;
}

export interface ClientRequestLog extends BaseLog {
  clientID: number;
}

export interface KeyValueLog extends ClientRequestLog {
  key: string;
  value: string;
}

export interface PutRequestInitiatedLog extends KeyValueLog {
  message: LogMessageType.PUT_REQUEST_INITIATED;
}

export interface ResponseLeaderLog extends ClientRequestLog {
  message: LogMessageType.RESPONSE_NOT_LEADER | LogMessageType.FOUND_LEADER;
  server: string;
}

export interface PutRequestCompletedLog extends KeyValueLog {
  message: LogMessageType.PUT_REQUEST_COMPLETED;
}

export interface LeaderConnectionLog extends ServerLog {
  message:
    | LogMessageType.DISCONNECTING_LEADER
    | LogMessageType.SERVICE_DISCONNECTING
    | LogMessageType.RECONNECTING_ORIGINAL_LEADER
    | LogMessageType.SERVICE_RECONNECTED;
}

export interface ShutdownLog extends ServerLog {
  message: LogMessageType.SHUTDOWN_INITIALIZED | LogMessageType.SHUTDOWN_COMPLETE;
}

export interface NodeDeadLog extends ServerLog {
  message: LogMessageType.NODE_DEAD;
  term: number;
}

export interface DisconnectionLog extends ServerLog {
  message: 
    | LogMessageType.DISCONNECTION_INITIALIZED
    | LogMessageType.DISCONNECTION_COMPLETE;
}

export type Log =
  | ServerListeningLog
  | PeerConnectedLog
  | PeerDisconnectedLog
  | ElectionTimerLog
  | StateTransitionLog
  | VoteLog
  | ReceiveVoteLog
  | ElectionWonLog
  | ElectionLostLog
  | PutRequestInitiatedLog
  | ResponseLeaderLog
  | PutRequestCompletedLog
  | LeaderConnectionLog
  | ShutdownLog
  | NodeDeadLog
  | DisconnectionLog;
