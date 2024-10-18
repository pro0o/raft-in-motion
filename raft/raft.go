package raft

import (
	"fmt"
	"log"
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
	Term    int //Raft term at which the client cmd is committed.
}

type LogEntry struct {
	Command any
	Term    int
}

type Raft struct {
	mu      sync.Mutex
	id      int   // server ID.
	peerIds []int // end points of all Peers

	server *Server // Server is the server containing this Rf.
	// also issues RPC calls to peers.

	// persistant States
	currentTerm int
	votedFor    int
	log         []LogEntry

	// volatile state on all servers
	commitIndex int
	lastApplied int

	// volatile State on leaders
	state              RfState
	electionResetEvent time.Time
	nextIndex          map[int]int
	matchIndex         map[int]int

	// Channels for communicating with the client and between internal components
	commitChan         chan<- CommitEntry // Channel to send committed entries to the client
	newCommitReadyChan chan struct{}      // Internal channel to notify when new commits are ready

	// persist state
	storage Storage

	// triggerAEChan is an internal notification channel used to trigger
	// sending new AEs to followers when interesting changes occurred.
	triggerAEChan chan struct{}
}

// HELPER FUNCS
func (rf *Raft) lastLogIndexAndTerm() (int, int) {
	if len(rf.log) > 0 {
		lastIndex := len(rf.log) - 1
		return lastIndex, rf.log[lastIndex].Term
	} else {
		return -1, -1
	}
}

// Report reports the state of this Rf.
func (rf *Raft) Report() (id int, term int, isLeader bool) {
	rf.mu.Lock()
	defer rf.mu.Unlock()
	return rf.id, rf.currentTerm, rf.state == Leader
}

// Submit submits a new command to the Rf. This function doesn't block; clients
// read the commit channel passed in the constructor to be notified of new
// committed entries.
// If this Rf is the leader, Submit returns the log index where the command
// is submitted. Otherwise, it returns -1
func (rf *Raft) Submit(command any) int {
	rf.mu.Lock()
	rf.dlog("Submit received by %v: %v", rf.state, command)
	if rf.state == Leader {
		submitIndex := len(rf.log)
		rf.log = append(rf.log, LogEntry{Command: command, Term: rf.currentTerm})
		rf.persistToStorage()
		rf.dlog("... log=%v", rf.log)
		rf.mu.Unlock()
		rf.triggerAEChan <- struct{}{}
		return submitIndex
	}

	rf.mu.Unlock()
	return -1
}

func (rf *Raft) Kill() {
	rf.mu.Lock()
	defer rf.mu.Unlock()
	rf.state = Dead
	rf.dlog("becomes Dead")
	close(rf.newCommitReadyChan)
}

// dlog logs a debugging message if DebugRF > 0.
func (rf *Raft) dlog(format string, args ...any) {
	if DebugRF > 0 {
		format = fmt.Sprintf("[%d] ", rf.id) + format
		log.Printf(format, args...)
	}
}

// SETUP THE RAFT
// the service or tester wants to create a Raft server. the ports
// of all the Raft servers (including this one) are in Peers[]. this
// server's port is Peers[me]. all the servers' Peers[] arrays
// have the same order. ApplyCh is a channel on which the
// tester or service expects Raft to send ApplyMsg messages.
// Make() must return quickly, so it should start goroutines
// for any long-running work.
func Make(id int, peerIds []int, server *Server, storage Storage, ready <-chan any, commitChan chan<- CommitEntry) *Raft {
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

	if rf.storage.HasData() {
		rf.restoreFromStorage()
	}

	go func() {
		// The Rf is dormant until ready is signaled; then, it starts a countdown
		// for leader election.
		<-ready
		rf.mu.Lock()
		rf.electionResetEvent = time.Now()
		rf.mu.Unlock()
		rf.runElectionTimer()
	}()

	go rf.commitChanSender()
	return rf
}

// RAFT STATES
// after eventual loss of leadership/ candidate,
// run election
func (rf *Raft) becomeFollower(term int) {
	rf.dlog("becomes Follower with term=%d; log=%v", term, rf.log)
	rf.state = Follower
	rf.currentTerm = term
	rf.votedFor = -1
	rf.electionResetEvent = time.Now()

	go rf.runElectionTimer()
}

// startLeader transitions the Raft server to the Leader state, initializes leader-specific state,
// and starts the process of sending heartbeats (AppendEntries) to followers.
func (rf *Raft) startLeader() {
	rf.state = Leader

	for _, peerId := range rf.peerIds {
		rf.nextIndex[peerId] = len(rf.log)
		rf.matchIndex[peerId] = -1
	}
	rf.dlog("becomes Leader; term=%d, nextIndex=%v, matchIndex=%v; log=%v", rf.currentTerm, rf.nextIndex, rf.matchIndex, rf.log)

	// Goroutine to handle sending heartbeats and AppendEntries to followers
	go func(heartbeatTimeout time.Duration) {
		rf.leaderSendHeartbeats()

		t := time.NewTimer(heartbeatTimeout)
		defer t.Stop()
		for {
			doSend := false
			select {
			case <-t.C:
				doSend = true

				// Reset timer to fire again after heartbeatTimeout.
				t.Stop()
				t.Reset(heartbeatTimeout)
			case _, ok := <-rf.triggerAEChan:
				if ok {
					doSend = true
				} else {
					return
				}

				// Reset timer for heartbeatTimeout.
				if !t.Stop() {
					<-t.C
				}
				t.Reset(heartbeatTimeout)
			}

			if doSend {
				// If this isn't a leader any more, stop the heartbeat loop.
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
