import { 
  StateTransitionLog, 
  ElectionWonLog, 
  LeaderConnectionLog, 
  DisconnectionLog 
} from "@/types/raftTypes";
import { RaftState } from "@/types/raftEnums";

export class LogProcessorService {
  private raftID: number;
  private onStateChange: (state: RaftState) => void;
  private onTermChange: (term: number) => void;
  
  constructor(
    raftID: number, 
    onStateChange: (state: RaftState) => void,
    onTermChange: (term: number) => void
  ) {
    this.raftID = raftID;
    this.onStateChange = onStateChange;
    this.onTermChange = onTermChange;
  }
  
  processStateTransition(log: StateTransitionLog) {
    const { newState } = log;
    this.onStateChange(newState);
  }
  
  processElectionWon(log: ElectionWonLog) {
    this.onStateChange(log.state);
    this.onTermChange(log.term);
  }
  processLeaderConnection() {
    this.onStateChange(RaftState.FOLLOWER);
  }
  
  processDisconnection() {
    this.onStateChange(RaftState.DISCONNECTED);
  }
  processPeerConnected() { }
  processPeerDisconnected() { }
  processShutdown() { }
  processVote() { }
  processNodeDead() { }
}