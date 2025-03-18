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
    const { oldState, newState} = log;
    this.onStateChange(newState);
  }
  
  processElectionWon(log: ElectionWonLog) {
    this.onStateChange(log.state);
    this.onTermChange(log.term);
  }
  
  processLeaderConnection(log: LeaderConnectionLog) {
    this.onStateChange(RaftState.FOLLOWER);
  }
  
  processDisconnection(log: DisconnectionLog) {
    this.onStateChange(RaftState.DISCONNECTED);
  }
}