package raft

import (
	"fmt"
	"log"
	"math/rand"
	"os"
	"sync"
	"time"
)

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
	peerIds []int // end points of all Peers

	// Server is the server containing this Rf.
	// issue RPC calls to peers.
	server *Server

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

	// this chan reports committed log entries to the client. Provided during
	// construction, it's used to send `CommitEntry` structs once consensus is
	// reached, ensuring the client can apply the command to its state machine.
	commitChan chan<- CommitEntry

	// this chan is an internal channel used to signal when new committed
	// log entries are ready to be sent on `commitChan`. It's a simple notification
	// channel with an empty struct to minimize overhead.
	newCommitReadyChan chan struct{}
}

// key states defined straight outta figure2 of paper
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
	Success bool //tell the leader whether the follower saw a match for prevLogIndex and prevLogTerm
}

// CommitEntry reports consensus of a command to the commit channel.
// The client can now apply the command to its state machine.
type CommitEntry struct {
	Command any // The committed client command.
	Index   int // The index of the command in the Raft log.
	Term    int // The term when the command was committed.
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

func (rf *Raft) Kill() {
	rf.mu.Lock()
	defer rf.mu.Unlock()
	rf.state = Dead
	rf.dlog("becomes Dead")
	close(rf.newCommitReadyChan)
}

// the service or tester wants to create a Raft server. the ports
// of all the Raft servers (including this one) are in Peers[]. this
// server's port is Peers[me]. all the servers' Peers[] arrays
// have the same order. Persister is a place for this server to
// save its persistent State, and also initially holds the most
// recent saved State, if any. ApplyCh is a channel on which the
// tester or service expects Raft to send ApplyMsg messages.
// Make() must return quickly, so it should start goroutines
// for any long-running work.
func Make(id int, peerIds []int, server *Server, ready <-chan any, commitChan chan<- CommitEntry) *Raft {
	rf := &Raft{
		id:                 id,
		peerIds:            peerIds,
		server:             server,
		state:              Follower, // all peers start as follower
		votedFor:           -1,
		commitChan:         commitChan,
		newCommitReadyChan: make(chan struct{}, 16),
		commitIndex:        -1,
		lastApplied:        -1,
		nextIndex:          make(map[int]int),
		matchIndex:         make(map[int]int),
	}

	go func() {
		// after ready chn signal is sparked,
		// countdown for election starts.
		<-ready
		rf.mu.Lock()
		rf.electionResetEvent = time.Now()
		rf.mu.Unlock()
		rf.runElectionTimer()
	}()
	go rf.commitChanSender()

	return rf
}

/*
// basic workflow of election:
// follower_timeout -> become_candidate -> request_votes
// => if_majority_then_become_leader => send_heartbeats
// => if_higher_term_then_step_down => revert_to_follower => repeat
*/
func (rf *Raft) runElectionTimer() {
	timeoutDuration := rf.electionTimeout()
	rf.mu.Lock()
	termStarted := rf.currentTerm
	rf.mu.Unlock()
	rf.dlog("election timer started (%v), term=%d", timeoutDuration, termStarted)

	// This loops until either:
	// we discover the election timer is no longer needed, or
	// the election timer expires and this Rf becomes a candidate

	// while in a follower though, this typically keeps running in the background for the
	// duration of the Rf's lifetime.
	// until leader fumbles the baddie
	ticker := time.NewTicker(10 * time.Millisecond)
	defer ticker.Stop()
	//main followers timeout
	for {
		<-ticker.C

		rf.mu.Lock()
		if rf.state != Candidate && rf.state != Follower {
			rf.dlog("in election timer state=%s, bailing out", rf.state)
			rf.mu.Unlock()
			return
		}

		if termStarted != rf.currentTerm {
			rf.dlog("in election timer term changed from %d to %d, bailing out", termStarted, rf.currentTerm)
			rf.mu.Unlock()
			return
		}

		// Start an election if we haven't heard from a leader or haven't voted for
		// someone for the duration of the timeout.
		if elapsed := time.Since(rf.electionResetEvent); elapsed >= timeoutDuration {
			rf.startElection()
			rf.mu.Unlock()
			return
		}
		rf.mu.Unlock()
	}
}

// electionTimeout generates a pseudo-random election timeout duration.
func (rf *Raft) electionTimeout() time.Duration {
	// If RAFT_FORCE_MORE_REELECTION is set, stress-test by deliberately
	// generating a hard-coded number very often. This will create collisions
	// between different servers and force more re-elections.
	if len(os.Getenv("RAFT_FORCE_MORE_REELECTION")) > 0 && rand.Intn(3) == 0 {
		return time.Duration(150) * time.Millisecond
	} else {
		return time.Duration(150+rand.Intn(150)) * time.Millisecond
	}
}

func (rf *Raft) dlog(format string, args ...any) {
	if DebugRf > 0 {
		format = fmt.Sprintf("[%d] ", rf.id) + format
		log.Printf(format, args...)
	}
}

func (rf *Raft) lastLogIndexAndTerm() (int, int) {
	if len(rf.log) > 0 {
		lastIndex := len(rf.log) - 1
		return lastIndex, rf.log[lastIndex].Term
	} else {
		return -1, -1
	}
}

func (rf *Raft) startElection() {
	rf.state = Candidate
	rf.currentTerm += 1
	savedCurrentTerm := rf.currentTerm
	rf.electionResetEvent = time.Now()
	rf.votedFor = rf.id
	rf.dlog("becomes Candidate (currentTerm=%d); log=%v", savedCurrentTerm, rf.log)

	votesReceived := 1

	// Send RequestVote RPCs to all other servers concurrently.
	for _, peerId := range rf.peerIds {
		go func(peerId int) {
			rf.mu.Lock()
			savedLastLogIndex, savedLastLogTerm := rf.lastLogIndexAndTerm()
			rf.mu.Unlock()
			args := RequestVoteArgs{
				Term:         savedCurrentTerm,
				CandidateId:  rf.id,
				LastLogIndex: savedLastLogIndex,
				LastLogTerm:  savedLastLogTerm,
			}
			var reply RequestVoteReply

			rf.dlog("sending RequestVote to %d: %+v", peerId, args)
			if err := rf.server.Call(peerId, "Raft.RequestVote", args, &reply); err == nil {
				rf.mu.Lock()
				defer rf.mu.Unlock()
				rf.dlog("received RequestVoteReply %+v", reply)

				if rf.state != Candidate {
					rf.dlog("while waiting for reply, state = %v", rf.state)
					return
				}

				if reply.Term > savedCurrentTerm {
					rf.dlog("term out of date in RequestVoteReply")
					rf.becomeFollower(reply.Term)
					return

				} else if reply.Term == savedCurrentTerm {
					if reply.VoteGranted {
						votesReceived += 1
						// majority bruther
						if votesReceived*2 > len(rf.peerIds)+1 {
							// Won the election!!!
							rf.dlog("wins election with %d votes", votesReceived)
							rf.startLeader()
							return
						}
					}
				}
			}
		}(peerId)
	}

	// Run another election timer, in case this election is not successful.
	go rf.runElectionTimer()
}

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

// startLeader switches rf into a leader state and begins process of heartbeats.
// heartbeats as in the AE
func (rf *Raft) startLeader() {
	rf.state = Leader

	for _, peerId := range rf.peerIds {
		rf.nextIndex[peerId] = len(rf.log)
		rf.matchIndex[peerId] = -1
	}
	rf.dlog("becomes Leader; term=%d, nextIndex=%v, matchIndex=%v; log=%v", rf.currentTerm, rf.nextIndex, rf.matchIndex, rf.log)

	go func() {
		ticker := time.NewTicker(50 * time.Millisecond)
		defer ticker.Stop()

		// Send periodic heartbeats, as long as still leader.
		for {
			rf.leaderSendHeartbeats()
			<-ticker.C

			rf.mu.Lock()
			if rf.state != Leader {
				rf.mu.Unlock()
				return
			}
			rf.mu.Unlock()
		}
	}()
}

// leaderSendHeartbeats sends a round of heartbeats to all peers, collects their
// replies and adjusts rf's state.
func (rf *Raft) leaderSendHeartbeats() {
	rf.mu.Lock()
	savedCurrentTerm := rf.currentTerm
	rf.mu.Unlock()

	for _, peerId := range rf.peerIds {
		go func(peerId int) {

			rf.mu.Lock()
			nextIndex := rf.nextIndex[peerId]
			prevLogIndex := nextIndex - 1
			prevLogTerm := -1

			if prevLogIndex >= 0 {
				prevLogTerm = rf.log[prevLogIndex].Term
			}
			entries := rf.log[nextIndex:]

			args := AppendEntriesArgs{
				Term:         savedCurrentTerm,
				LeaderId:     rf.id,
				PrevLogIndex: prevLogIndex,
				PrevLogTerm:  prevLogTerm,
				Entries:      entries,
				LeaderCommit: rf.commitIndex,
			}
			rf.mu.Unlock()

			rf.dlog("sending AppendEntries to %v: nextIndex=%d, args=%+v", peerId, nextIndex, args)
			var reply AppendEntriesReply
			if err := rf.server.Call(peerId, "Raft.AppendEntries", args, &reply); err == nil {
				rf.mu.Lock()
				defer rf.mu.Unlock()

				// init check
				if reply.Term > savedCurrentTerm {
					rf.dlog("term out of date in heartbeat reply")
					rf.becomeFollower(reply.Term)
					return
				}

				if rf.state == Leader && savedCurrentTerm == reply.Term {
					if reply.Success {
						rf.nextIndex[peerId] = nextIndex + len(entries)
						rf.matchIndex[peerId] = rf.nextIndex[peerId] - 1
						rf.dlog("AppendEntries reply from %d success: nextIndex := %v, matchIndex := %v", peerId, rf.nextIndex, rf.matchIndex)

						savedCommitIndex := rf.commitIndex
						for i := rf.commitIndex + 1; i < len(rf.log); i++ {
							if rf.log[i].Term == rf.currentTerm {
								matchCount := 1
								for _, peerId := range rf.peerIds {
									if rf.matchIndex[peerId] >= i {
										matchCount++
									}
								}
								if matchCount*2 > len(rf.peerIds)+1 {
									rf.commitIndex = i
								}
							}
						}
						if rf.commitIndex != savedCommitIndex {
							rf.dlog("leader sets commitIndex := %d", rf.commitIndex)
							rf.newCommitReadyChan <- struct{}{} //signals that new entries are ready to be sent on the commit channel to the client
						}
					} else {
						rf.nextIndex[peerId] = nextIndex - 1
						rf.dlog("AppendEntries reply from %d !success: nextIndex := %d", peerId, nextIndex-1)
					}
				}
			}
		}(peerId)
	}
}

// commitChanSender is responsible for sending committed entries on
// rf.commitChan. It watches newCommitReadyChan for notifications and calculates
// which new entries are ready to be sent. This method should run in a separate
// background goroutine; rf.commitChan may be buffered and will limit how fast
// the client consumes new committed entries. Returns when newCommitReadyChan is
// closed.
func (rf *Raft) commitChanSender() {
	for range rf.newCommitReadyChan {
		// Find which entries we have to apply.
		rf.mu.Lock()
		savedTerm := rf.currentTerm
		savedLastApplied := rf.lastApplied
		var entries []LogEntry
		if rf.commitIndex > rf.lastApplied {
			entries = rf.log[rf.lastApplied+1 : rf.commitIndex+1]
			rf.lastApplied = rf.commitIndex
		}
		rf.mu.Unlock()
		rf.dlog("commitChanSender entries=%v, savedLastApplied=%d", entries, savedLastApplied)

		for i, entry := range entries {
			rf.commitChan <- CommitEntry{
				Command: entry.Command,
				Index:   savedLastApplied + i + 1,
				Term:    savedTerm,
			}
		}
	}
	rf.dlog("commitChanSender done")
}

// RequestVote RPC from figure 2 of paper
func (rf *Raft) RequestVote(args RequestVoteArgs, reply *RequestVoteReply) error {
	rf.mu.Lock()
	defer rf.mu.Unlock()
	if rf.state == Dead {
		return nil
	}
	rf.dlog("RequestVote: %+v [currentTerm=%d, votedFor=%d]", args, rf.currentTerm, rf.votedFor)

	// from the figure 2 itself
	// 1. Reply false if term < currentTerm
	if args.Term > rf.currentTerm {
		rf.dlog("... term out of date in RequestVote")
		rf.becomeFollower(args.Term)
	}

	// 2. If VotedFor is null or CandidateId, and candidate’s Log is at
	// least as up-to-date as receiver’s log, grant vote
	if rf.currentTerm == args.Term &&
		(rf.votedFor == -1 || rf.votedFor == args.CandidateId) {
		reply.VoteGranted = true
		rf.votedFor = args.CandidateId
		rf.electionResetEvent = time.Now()
	} else {
		reply.VoteGranted = false
	}
	reply.Term = rf.currentTerm
	rf.dlog("... RequestVote reply: %+v", reply)
	return nil
}

func (rf *Raft) AppendEntries(args AppendEntriesArgs, reply *AppendEntriesReply) error {
	rf.mu.Lock()
	defer rf.mu.Unlock()
	if rf.state == Dead {
		return nil
	}
	rf.dlog("AppendEntries: %+v", args)

	// 1. Reply false if term < currentTerm
	if args.Term > rf.currentTerm {
		rf.dlog("... term out of date in AppendEntries")
		rf.becomeFollower(args.Term)
	}

	// 2. Reply false if log doesn’t contain an entry at prevLogIndex
	// whose term matches prevLogTerm
	reply.Success = false
	if args.Term == rf.currentTerm {
		if rf.state != Follower {
			rf.becomeFollower(args.Term)
		}
		rf.electionResetEvent = time.Now()

		// 3. If an existing entry conflicts with a new one (same index
		// but different terms), delete the existing entry and all that
		// follow it.

		// Check if the log has an entry at PrevLogIndex with a matching PrevLogTerm.
		// If PrevLogIndex is -1, assume true as no entry exists to compare.
		if args.PrevLogIndex == -1 ||
			(args.PrevLogIndex < len(rf.log) && args.PrevLogTerm == rf.log[args.PrevLogIndex].Term) {

			reply.Success = true
			logInsertIndex := args.PrevLogIndex + 1
			newEntriesIndex := 0

			// The main goal here is to find where the terms in the log mismatch between
			// the follower and leader entries.
			for {
				if logInsertIndex >= len(rf.log) || newEntriesIndex >= len(args.Entries) {
					break
				}
				if rf.log[logInsertIndex].Term != args.Entries[newEntriesIndex].Term {
					break
				}
				logInsertIndex++
				newEntriesIndex++
			}

			// 4. Append any new entries not already in the log
			if newEntriesIndex < len(args.Entries) {
				rf.dlog("... inserting entries %v from index %d", args.Entries[newEntriesIndex:], logInsertIndex)
				rf.log = append(rf.log[:logInsertIndex], args.Entries[newEntriesIndex:]...)
				rf.dlog("... log is now: %v", rf.log)
			}

			if args.LeaderCommit > rf.commitIndex {
				rf.commitIndex = min(args.LeaderCommit, len(rf.log)-1)
				rf.dlog("... setting commitIndex=%d", rf.commitIndex)
				rf.newCommitReadyChan <- struct{}{} // motify others that the commit is ready.
			}
		}

	}

	reply.Term = rf.currentTerm
	rf.dlog("AppendEntries reply: %+v", *reply)
	return nil
}

func (rf *Raft) Report() (id int, term int, isLeader bool) {
	rf.mu.Lock()
	defer rf.mu.Unlock()
	return rf.id, rf.currentTerm, rf.state == Leader
}

// Submit attempts to submit a new command to the Raft instance (`rf`). This function
// is non-blocking, meaning it returns immediately after submission. The result of the
// submission will be reported on the commit channel provided during the creation of
// the Raft instance, allowing the client to track when the command has been committed
// (once consensus is reached).
func (rf *Raft) Submit(command any) bool {
	rf.mu.Lock()
	defer rf.mu.Unlock()

	rf.dlog("Submit received by %v: %v", rf.state, command)
	if rf.state == Leader {
		rf.log = append(rf.log, LogEntry{Command: command, Term: rf.currentTerm})
		rf.dlog("... log=%v", rf.log)
		return true
	}
	return false
}
