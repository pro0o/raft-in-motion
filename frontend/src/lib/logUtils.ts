import { Log, StateTransitionLog, PeerConnectedLog, PeerDisconnectedLog, VoteLog, ReceiveVoteLog } from "@/types/raftTypes";
import { LogMessageType } from "@/types/raftEnums";
import { logTypeColors } from "@/components/styles/logStyles";

export const processLogMessage = (log: Log): string => {
    switch (log.message) {
      case LogMessageType.STATE_TRANSITION:
        const stateLog = log as StateTransitionLog;
        return `State: ${stateLog.oldState} → ${stateLog.newState}`;
      
      case LogMessageType.PEER_CONNECTED:
        const connectedLog = log as PeerConnectedLog;
        return `Peer ${connectedLog.peer} Connected (${connectedLog.address})`;
      
      case LogMessageType.PEER_DISCONNECTED:
        const disconnectedLog = log as PeerDisconnectedLog;
        return `Peer ${disconnectedLog.peer} Disconnected`;
      
      case LogMessageType.ELECTION_TIMER_STARTED:
        return `Election Timer Started`;
      
      case LogMessageType.ELECTION_TIMEOUT:
        return `Election Timeout`;
    
        case LogMessageType.ELECTION_WON:
        return `Election Won`;
    
      case LogMessageType.ELECTION_TIMER_STOPPED_I:
      case LogMessageType.ELECTION_TIMER_STOPPED_II:
        return `Election Timer Stopped`;
      
      case LogMessageType.SHUTDOWN_INITIALIZED:
        return `Shutdown Initialized`;
      
      case LogMessageType.SHUTDOWN_COMPLETE:
        return `Shutdown Complete`;
      
      case LogMessageType.SERVER_LISTENING:
        return `Server Listening at ${log.address}`;
      
      case LogMessageType.REQUEST_VOTE:
        const requestVoteLog = log as VoteLog;
        return `Request Vote from Peer ${requestVoteLog.peer}`;
      
      case LogMessageType.RECEIVE_VOTE:
        const receiveVoteLog = log as ReceiveVoteLog;
        return `Received Vote from Peer ${receiveVoteLog.peer} (${receiveVoteLog.voteGranted})`;
      
      case LogMessageType.DISCONNECTING_LEADER:
        return `Disconnecting Leader`;
      
      case LogMessageType.SERVICE_DISCONNECTING:
        return `Service Disconnecting`;
      
      case LogMessageType.DISCONNECTION_INITIALIZED:
        return `Disconnection Initialized`;
      
      case LogMessageType.DISCONNECTION_COMPLETE:
        return `Disconnection Complete`;
      
      case LogMessageType.VOTE_FAILURE:
        return `Vote Failure (Term: ${log.term})`;
      
      case LogMessageType.RECONNECTING_ORIGINAL_LEADER:
        return `Reconnecting Original Leader`;
      
      case LogMessageType.SERVICE_RECONNECTED:
        return `Service Reconnected`;
      
      case LogMessageType.NODE_DEAD:
          return `Node Dead`;
      
      default:
        return `${log.message}`;
    }
  };  

export const getLogColor = (log: Log) => {
  const messageType = log.message;
  
  if (messageType === LogMessageType.STATE_TRANSITION) {
    return logTypeColors.STATE_COLOR;
  } else if (messageType === LogMessageType.PEER_CONNECTED) {
    return logTypeColors.SERVER_COLOR; 
  } else if (messageType === LogMessageType.PEER_DISCONNECTED) {
    return logTypeColors.SERVER_COLOR;  
  } else if ([
    LogMessageType.ELECTION_TIMER_STARTED,
    LogMessageType.ELECTION_TIMEOUT,
    LogMessageType.ELECTION_TIMER_STOPPED_I,
    LogMessageType.ELECTION_TIMER_STOPPED_II,
    LogMessageType.REQUEST_VOTE,
    LogMessageType.RECEIVE_VOTE,

  ].includes(messageType)) {
    return logTypeColors.ELECTION_COLOR;  
  } else if (messageType === LogMessageType.ELECTION_WON) {
    return logTypeColors.ELECTION_COLOR;  
  } else if ([
    LogMessageType.SHUTDOWN_INITIALIZED,
    LogMessageType.SHUTDOWN_COMPLETE
  ].includes(messageType)) {
    return logTypeColors.CONNECTION_COLOR;
  }
  
  return logTypeColors.CONNECTION_COLOR;
};

export const getLogSpeed = (log: Log): number => {
    switch (log.message) {
      case LogMessageType.STATE_TRANSITION:
      case LogMessageType.ELECTION_WON:
      case LogMessageType.NODE_DEAD:
        return 7; 
        
      case LogMessageType.ELECTION_TIMEOUT:
      case LogMessageType.REQUEST_VOTE:
      case LogMessageType.RECEIVE_VOTE:
      case LogMessageType.VOTE_FAILURE:
      case LogMessageType.DISCONNECTING_LEADER:
      case LogMessageType.RECONNECTING_ORIGINAL_LEADER:
        return 5; 

      case LogMessageType.ELECTION_TIMER_STARTED:
      case LogMessageType.ELECTION_TIMER_STOPPED_I:
      case LogMessageType.ELECTION_TIMER_STOPPED_II:
      case LogMessageType.PEER_CONNECTED:
      case LogMessageType.PEER_DISCONNECTED:
        return 7;
        
      case LogMessageType.SHUTDOWN_INITIALIZED:
      case LogMessageType.SHUTDOWN_COMPLETE:
      case LogMessageType.SERVICE_DISCONNECTING:
      case LogMessageType.SERVICE_RECONNECTED:
      case LogMessageType.DISCONNECTION_INITIALIZED:
      case LogMessageType.DISCONNECTION_COMPLETE:
        return 6;
        
      default:
        return 6; 
    }
  };
  export const processActivity = (log: Log): { activityText: string; color: string } => {
    switch (log.message) {
      case LogMessageType.ELECTION_TIMER_STARTED:
      case LogMessageType.ELECTION_TIMEOUT:
      case LogMessageType.ELECTION_WON:
      case LogMessageType.ELECTION_TIMER_STOPPED_I:
      case LogMessageType.ELECTION_TIMER_STOPPED_II:
      case LogMessageType.REQUEST_VOTE:
      case LogMessageType.RECEIVE_VOTE:
      case LogMessageType.VOTE_FAILURE:
        return { activityText: "General election happening", color: "251,207,132" }; // Amber-400
  
      case LogMessageType.PEER_CONNECTED:
      case LogMessageType.PEER_DISCONNECTED:
        return { activityText: "Peer connection activity occurring", color: "96, 165, 250" }; // Blue-400
  
      case LogMessageType.SHUTDOWN_INITIALIZED:
      case LogMessageType.SHUTDOWN_COMPLETE:
      case LogMessageType.SERVICE_DISCONNECTING:
      case LogMessageType.SERVICE_RECONNECTED:
      case LogMessageType.DISCONNECTION_INITIALIZED:
      case LogMessageType.DISCONNECTION_COMPLETE:
        return { activityText: "Service connection status changing", color: "147, 197, 253" }; // Blue-300/400
  
      case LogMessageType.STATE_TRANSITION:
        return { activityText: "System state is transitioning", color: "192, 132, 252" }; // Purple-400
  
      case LogMessageType.NODE_DEAD:
        return { activityText: "A node has gone down", color: "248, 113, 113" }; // Red-400
  
      case LogMessageType.RECONNECTING_ORIGINAL_LEADER:
      case LogMessageType.DISCONNECTING_LEADER:
        return { activityText: "Leader node reconnection activity happening", color: "52, 211, 153" }; // Emerald-400
  
      default:
        return { activityText: "System Idle...", color: "156, 163, 175" }; // Gray-400 (unchanged)
    };
  };
