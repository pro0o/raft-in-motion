package raft

import (
	"sync"
	"time"
)

// as each Raft peer becomes aware that successive Log entries are
// committed, the peer should send an ApplyMsg to the service (or
// tester) on the same server, via the ApplyCh passed to Make(). set
// CommandValid to true to indicate that the ApplyMsg contains a newly
// committed Log entry.

const DebugRf = 1

type LogEntry struct {
	Command any
	Term    int
}

type RfState int

const (
	Follower RfState = iota
	Candidate
	Leader
	Dead
)

// implements a single node of Raft consensus.
type Raft struct {
	mu      sync.Mutex
	id      int   // server ID.
	peerIds []int //end points of all Peers

	// server is the server containing this CM. It's used to issue RPC calls
	// to peers.
	server *Server

	// persistant States
	currentTerm int
	votedFor    int
	log         []LogEntry

	//volatile State on leaders
	state              RfState
	electionResetEvent time.Time
}

type RequestVoteArgs struct {
	Term         int
	CandidateId  int
	LastLogIndex int
	LastLogTerm  int
}

type RequestVoteReply struct {
	Term        int
	VoteGranted bool
}

type AppendEntriesArgs struct {
	Term     int
	LeaderId int

	PrevLogIndex int
	PrevLogTerm  int
	Entries      []LogEntry
	LeaderCommit int
}

type AppendEntriesReply struct {
	Term    int
	Success bool
}

func (rf RfState) String() string {
	switch rf {
	case Follower:
		return "Follower"
	case Candidate:
		return "Candidate"
	case Leader:
		return "Leader"
	case Dead:
		return "Dead"
	default:
		panic("unreachable")
	}
}
