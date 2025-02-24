package raft

import (
	"sync"
	"time"

	"github.com/pro0o/raft-in-motion/internal/client"

	"github.com/rs/zerolog/log"
)

const DebugRF = 1

type RfState int

const (
	Follower RfState = iota
	Candidate
	Leader
	Dead
)

func (s RfState) String() string {
	switch s {
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

type CommitEntry struct {
	Command any
	Index   int
	Term    int
}

type LogEntry struct {
	Command any
	Term    int
}

type Raft struct {
	mu      sync.Mutex
	id      int   // server ID
	peerIds []int // IDs of all other peers

	server *Server // The Server that hosts this Raft instance (and handles RPC calls).

	// Persistent state on all servers
	currentTerm int
	votedFor    int
	log         []LogEntry

	// Volatile state on all servers
	commitIndex int
	lastApplied int

	// Volatile state on the leader
	state              RfState
	electionResetEvent time.Time
	nextIndex          map[int]int
	matchIndex         map[int]int

	// Communication channels
	commitChan         chan<- CommitEntry // Channel for delivering committed entries to the client
	newCommitReadyChan chan struct{}      // Internal notification channel when new commits are ready

	// Persist state
	storage Storage

	// Internal notification channel to trigger sending AppendEntries
	triggerAEChan chan struct{}

	// Client for logging (or additional communication)
	client *client.Client
}

func (rf *Raft) lastLogIndexAndTerm() (int, int) {
	if len(rf.log) > 0 {
		lastIndex := len(rf.log) - 1
		return lastIndex, rf.log[lastIndex].Term
	} else {
		return -1, -1
	}
}

func (rf *Raft) Report() (id int, term int, isLeader bool) {
	rf.mu.Lock()
	defer rf.mu.Unlock()
	return rf.id, rf.currentTerm, rf.state == Leader
}

func (rf *Raft) Submit(command any) int {
	rf.mu.Lock()
	if rf.state != Leader {
		rf.mu.Unlock()
		return -1
	}
	submitIndex := len(rf.log)
	rf.log = append(rf.log, LogEntry{Command: command, Term: rf.currentTerm})
	rf.persistToStorage()

	rf.mu.Unlock()

	rf.triggerAEChan <- struct{}{}
	return submitIndex
}

func (rf *Raft) Kill() {
	rf.mu.Lock()

	if rf.state == Dead {
		rf.mu.Unlock()
		return
	}
	log.Info().
		Int("raftID", rf.id).
		Int("term", rf.currentTerm).
		Msg("nodeDead")

	rf.state = Dead

	close(rf.newCommitReadyChan)
	close(rf.triggerAEChan)

	rf.mu.Unlock()

}

// Make initializes a Raft instance. The `ready` channel is used to signal
// when the node should start its background processes (like the election timer).
func Make(
	id int,
	peerIds []int,
	server *Server,
	storage Storage,
	ready <-chan any,
	commitChan chan<- CommitEntry,
	c *client.Client,
) *Raft {
	rf := new(Raft)
	rf.id = id
	rf.peerIds = peerIds
	rf.server = server
	rf.storage = storage
	rf.commitChan = commitChan
	rf.newCommitReadyChan = make(chan struct{}, 16)
	rf.triggerAEChan = make(chan struct{}, 1)
	rf.state = Follower
	rf.votedFor = -1
	rf.commitIndex = -1
	rf.lastApplied = -1
	rf.nextIndex = make(map[int]int)
	rf.matchIndex = make(map[int]int)
	rf.client = c

	if rf.storage.HasData() {
		rf.restoreFromStorage()
	}
	go func() {
		<-ready
		rf.mu.Lock()
		rf.electionResetEvent = time.Now()
		rf.mu.Unlock()
		rf.runElectionTimer()
	}()

	go rf.commitChanSender()
	return rf
}

func (rf *Raft) becomeFollower(term int) {
	log.Info().
		Int("raftID", rf.id).
		Int("term", term).
		Str("oldState", rf.state.String()).
		Str("newState", Follower.String()).
		Msg("stateTransition")

	rf.state = Follower
	rf.currentTerm = term
	rf.votedFor = -1
	rf.electionResetEvent = time.Now()

	go rf.runElectionTimer()
}

func (rf *Raft) startLeader() {
	rf.state = Leader
	for _, peerId := range rf.peerIds {
		rf.nextIndex[peerId] = len(rf.log)
		rf.matchIndex[peerId] = -1
	}
	log.Info().
		Int("raftID", rf.id).
		Int("term", rf.currentTerm).
		Str("oldState", Candidate.String()).
		Str("newState", rf.state.String()).
		Msg("stateTransition")

	go func(heartbeatTimeout time.Duration) {
		rf.leaderSendHeartbeats()

		t := time.NewTimer(heartbeatTimeout)
		defer t.Stop()

		for {
			doSend := false
			select {
			case <-t.C:
				doSend = true
				t.Stop()
				t.Reset(heartbeatTimeout)

			case _, ok := <-rf.triggerAEChan:
				if !ok {
					return
				}
				doSend = true

				if !t.Stop() {
					<-t.C
				}
				t.Reset(heartbeatTimeout)
			}

			if doSend {
				rf.mu.Lock()
				if rf.state != Leader {
					rf.mu.Unlock()
					return
				}
				rf.mu.Unlock()
				rf.leaderSendHeartbeats()
			}
		}
	}(50 * time.Millisecond)
}
