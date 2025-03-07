import { StateTransitionLog, PeerConnectedLog, PeerDisconnectedLog, 
    ElectionTimerLog, ElectionWonLog, ShutdownLog, VoteLog, 
    LeaderConnectionLog, NodeDeadLog, DisconnectionLog } from "@/types/raftTypes";
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
      const { oldState, newState, term } = log;
      this.onStateChange(newState);
      this.onTermChange(term);
    }
  
    processPeerConnected(log: PeerConnectedLog) {
    }
  
    processPeerDisconnected(log: PeerDisconnectedLog) {
    }
  
    processElectionTimer(log: ElectionTimerLog) {
      // this.onStateChange(log.state);
      // this.onTermChange(log.term);
    }
  
    processElectionWon(log: ElectionWonLog) {
      this.onStateChange(log.state);
      this.onTermChange(log.term);
    }
  
    processShutdown(log: ShutdownLog) {
    }
  
    processVote(log: VoteLog) {
    }
  
    processLeaderConnection(log: LeaderConnectionLog) {
    }
  
    processDisconnection(log: DisconnectionLog) {
    }
  
    processNodeDead(log: NodeDeadLog) {
    }
  }