package raft

import (
	"fmt"
	"main/client"
	"sync"
	"time"
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
	Command any // client command
	Index   int // log index at which the client cmd is committed.
	Term    int // Raft term at which the client cmd is committed.
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

// Helper function to return the last log's index and term.
func (rf *Raft) lastLogIndexAndTerm() (int, int) {
	if len(rf.log) > 0 {
		lastIndex := len(rf.log) - 1
		return lastIndex, rf.log[lastIndex].Term
	} else {
		return -1, -1
	}
}

// Report returns the ID, currentTerm, and whether this Raft is a leader.
func (rf *Raft) Report() (id int, term int, isLeader bool) {
	rf.mu.Lock()
	defer rf.mu.Unlock()
	return rf.id, rf.currentTerm, rf.state == Leader
}

// Submit queues a new command to be appended to the Raft log.
// Returns the index of the log entry if this Raft is the leader.
// Otherwise returns -1.
func (rf *Raft) Submit(command any) int {
	rf.mu.Lock()
	// If not the leader, reject the submit request.
	if rf.state != Leader {
		rf.mu.Unlock()
		return -1
	}
	// This Raft is the leader, so append the command locally.
	submitIndex := len(rf.log)
	rf.log = append(rf.log, LogEntry{Command: command, Term: rf.currentTerm})
	rf.persistToStorage()

	// Unlock before triggering the heartbeat to avoid holding the lock too long.
	rf.mu.Unlock()

	// Notify the leader’s heartbeat/AppendEntries loop to replicate the new entry.
	rf.triggerAEChan <- struct{}{}
	return submitIndex
}

// Kill marks this Raft node as Dead and cleans up.
func (rf *Raft) Kill() {
	rf.mu.Lock()
	defer rf.mu.Unlock()

	rf.state = Dead
	rf.dlog("Node transitioning to state=Dead. Closing commit-ready channel.")
	close(rf.newCommitReadyChan)
}

// dlog writes logs if DebugRF > 0, using the provided client logger.
func (rf *Raft) dlog(format string, args ...any) {
	if DebugRF > 0 {
		formattedMsg := fmt.Sprintf("[%d] ", rf.id) + fmt.Sprintf(format, args...)
		rf.client.AddLog("Raft", rf.id, formattedMsg)
	}
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

	// If we have data in storage, restore it (e.g. after a restart).
	if rf.storage.HasData() {
		rf.restoreFromStorage()
	}

	// This goroutine waits until `ready` is signaled before starting the election timer.
	go func() {
		<-ready
		rf.mu.Lock()
		rf.electionResetEvent = time.Now()
		rf.mu.Unlock()
		rf.runElectionTimer()
	}()

	// The commitChanSender goroutine waits for new commits to be ready, and sends them to commitChan.
	go rf.commitChanSender()
	return rf
}

// becomeFollower transitions the node to Follower state in the given term.
func (rf *Raft) becomeFollower(term int) {
	rf.dlog("Transitioning to FOLLOWER in term=%d. Current log: %v", term, rf.log)
	rf.state = Follower
	rf.currentTerm = term
	rf.votedFor = -1
	rf.electionResetEvent = time.Now()

	go rf.runElectionTimer()
}

// startLeader transitions the node to Leader state and initializes leader-specific
// structures, then starts sending AppendEntries heartbeats.
func (rf *Raft) startLeader() {
	rf.state = Leader
	for _, peerId := range rf.peerIds {
		rf.nextIndex[peerId] = len(rf.log)
		rf.matchIndex[peerId] = -1
	}
	rf.dlog("Transitioning to LEADER in term=%d. nextIndex=%v, matchIndex=%v, current log=%v",
		rf.currentTerm, rf.nextIndex, rf.matchIndex, rf.log)

	// This goroutine regularly sends heartbeats (AppendEntries) or logs to followers.
	go func(heartbeatTimeout time.Duration) {
		rf.leaderSendHeartbeats() // Send an immediate set of heartbeats

		t := time.NewTimer(heartbeatTimeout)
		defer t.Stop()

		for {
			doSend := false
			select {
			case <-t.C:
				doSend = true
				// Reset the timer for the next heartbeat.
				t.Stop()
				t.Reset(heartbeatTimeout)

			case _, ok := <-rf.triggerAEChan:
				// If channel is closed, stop.
				if !ok {
					return
				}
				doSend = true

				// Reset the timer, discarding any pending trigger.
				if !t.Stop() {
					<-t.C
				}
				t.Reset(heartbeatTimeout)
			}

			if doSend {
				// Check if we are still leader before sending.
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
