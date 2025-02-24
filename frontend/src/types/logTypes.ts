enum RaftState {
    FOLLOWER = 'follower',
    CANDIDATE = 'candidate',
    LEADER = 'leader'
  }
  
  enum LogMessageType {
    SERVER_LISTENING = 'serverListening',
    PEER_CONNECTED = 'peerConnected',
    PEER_DISCONNECTED = 'peerDisconnected',

    ELECTION_TIMER_STARTED = 'electionTimerStarted',
    ELECTION_TIMER_STOPPED_I = 'electionTimerStoppedI',
    ELECTION_TIMER_STOPPED_II = 'electionTimerStoppedII',
    ELECTION_TIMEOUT = 'electionTimeout',
    STATE_TRANSITION = 'stateTransition',
    REQUEST_VOTE = 'requestVote',
    RECEIVE_VOTE = 'recieveVote',
    ELECTION_WON = 'electionWon',

    PUT_REQUEST_INITIATED = 'putRequestInitiated',
    RESPONSE_NOT_LEADER = 'responseNotLeader',
    PUT_REQUEST_COMPLETED = 'putRequestCompleted',

    DISCONNECTING_LEADER = 'disconnectingLeader',
    SERVICE_DISCONNECTING = 'serviceDisconnecting',
    RECONNECTING_ORIGINAL_LEADER = 'reconnectingOriginalleader',
    SERVICE_RECONNECTED = 'serviceReconnected',
    NODE_DEAD = 'nodeDead',

    SHUTDOWN_INITIALIZED = 'shutdownInitialized',
    SHUTDOWN_COMPLETE = 'shutdownComplete',
    DISCONNECTION_INITIALIZED = 'disconnectionInitialized',
    DISCONNECTION_COMPLETE = 'disconnectionComplete'
  }
  
  interface BaseLog {
    message: LogMessageType;
    time: string;
  }
  
  interface ServerLog extends BaseLog {
    raftID: number;
  }
  
  interface NetworkAddressLog extends ServerLog {
    address: string;
  }
  
  interface ServerListeningLog extends NetworkAddressLog {
    message: LogMessageType.SERVER_LISTENING;
  }
  
  interface PeerConnectedLog extends ServerLog {
    message: LogMessageType.PEER_CONNECTED;
    address: string;
    peer: number;
  }
  
  interface PeerDisconnectedLog extends ServerLog {
    message: LogMessageType.PEER_DISCONNECTED;
    peer: number;
  }
  
  interface RaftStateLog extends ServerLog {
    state: number | string;
    term: number;
  }
  
  interface ElectionTimerLog extends RaftStateLog {
    message: LogMessageType.ELECTION_TIMER_STARTED | 
             LogMessageType.ELECTION_TIMEOUT | 
             LogMessageType.ELECTION_TIMER_STOPPED_I | 
             LogMessageType.ELECTION_TIMER_STOPPED_II;
  }
  
  interface StateTransitionLog extends ServerLog {
    message: LogMessageType.STATE_TRANSITION;
    oldState: string;
    newState: string;
    term: number;
  }
  
  interface VoteLog extends ServerLog {
    message: LogMessageType.REQUEST_VOTE | LogMessageType.RECEIVE_VOTE;
    peer: number;
    state: string;
    term: number;
  }
  
  interface ReceiveVoteLog extends VoteLog {
    message: LogMessageType.RECEIVE_VOTE;
    voteGranted: boolean;
  }
  
  interface ElectionWonLog extends RaftStateLog {
    message: LogMessageType.ELECTION_WON;
  }
  
  interface ClientRequestLog extends BaseLog {
    clientID: number;
  }
  
  interface KeyValueLog extends ClientRequestLog {
    key: string;
    value: string;
  }
  
  interface PutRequestInitiatedLog extends KeyValueLog {
    message: LogMessageType.PUT_REQUEST_INITIATED;
  }
  
  interface ResponseNotLeaderLog extends ClientRequestLog {
    message: LogMessageType.RESPONSE_NOT_LEADER;
    server: string;
  }
  
  interface PutRequestCompletedLog extends KeyValueLog {
    message: LogMessageType.PUT_REQUEST_COMPLETED;
  }
  
  interface LeaderConnectionLog extends ServerLog {
    message: LogMessageType.DISCONNECTING_LEADER | 
             LogMessageType.SERVICE_DISCONNECTING | 
             LogMessageType.RECONNECTING_ORIGINAL_LEADER | 
             LogMessageType.SERVICE_RECONNECTED;
  }
  
  interface ShutdownLog extends ServerLog {
    message: LogMessageType.SHUTDOWN_INITIALIZED | LogMessageType.SHUTDOWN_COMPLETE;
  }
  
  interface NodeDeadLog extends ServerLog {
    message: LogMessageType.NODE_DEAD;
    term: number;
  }
  
  interface DisconnectionLog extends ServerLog {
    message: LogMessageType.DISCONNECTION_INITIALIZED | LogMessageType.DISCONNECTION_COMPLETE;
  }
  
  type Log =
    | ServerListeningLog
    | PeerConnectedLog
    | PeerDisconnectedLog
    | ElectionTimerLog
    | StateTransitionLog
    | VoteLog
    | ReceiveVoteLog
    | ElectionWonLog
    | PutRequestInitiatedLog
    | ResponseNotLeaderLog
    | PutRequestCompletedLog
    | LeaderConnectionLog
    | ShutdownLog
    | NodeDeadLog
    | DisconnectionLog;
  
  const isLogOfType = <T extends Log>(
    log: Log, 
    messageType: LogMessageType
  ): log is T => log.message === messageType;
  
  const isServerListeningLog = (log: Log): log is ServerListeningLog => 
    isLogOfType<ServerListeningLog>(log, LogMessageType.SERVER_LISTENING);
  