export enum RaftState {
    FOLLOWER = 'Follower',
    CANDIDATE = 'Candidate',
    LEADER = 'Leader',
}
  
export enum LogMessageType {
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
    VOTE_FAILURE = 'voteFailure',
    ELECTION_WON = 'electionWon',
    ELECTION_LOST = 'electionLost',
  
    PUT_REQUEST_INITIATED = 'putRequestInitiated',
    RESPONSE_NOT_LEADER = 'responseNotLeader',
    FOUND_LEADER = 'foundLeader',
    PUT_REQUEST_COMPLETED = 'putRequestCompleted',
  
    DISCONNECTING_LEADER = 'disconnectingLeader',
    SERVICE_DISCONNECTING = 'serviceDisconnecting',
    RECONNECTING_ORIGINAL_LEADER = 'reconnectingOriginalleader',
    SERVICE_RECONNECTED = 'serviceReconnected',
    NODE_DEAD = 'nodeDead',
  
    SHUTDOWN_INITIALIZED = 'shutdownInitialized',
    SHUTDOWN_COMPLETE = 'shutdownComplete',
    DISCONNECTION_INITIALIZED = 'disconnectionInitialized',
    DISCONNECTION_COMPLETE = 'disconnectionComplete',
}