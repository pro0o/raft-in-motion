package raft

import (
	"log"
	"math/rand"
	"time"
)

func (rf *Raft) electionTimeout() time.Duration {
	// Randomized election timeout between 150ms and 300ms
	return time.Duration(150+rand.Intn(150)) * time.Millisecond
}

// runElectionTimer implements an election timer. It should be launched whenever
// we want to start a timer towards becoming a candidate in a new election.
func (rf *Raft) runElectionTimer() {
	timeoutDuration := rf.electionTimeout()

	rf.mu.Lock()
	termStarted := rf.currentTerm
	rf.mu.Unlock()

	log.Printf("[Election Timer] Started for term %d with timeout %v", termStarted, timeoutDuration)
	// rf.logElectionTimerStarted()
	ticker := time.NewTicker(10 * time.Millisecond)
	defer ticker.Stop()

	for {
		<-ticker.C

		rf.mu.Lock()
		// Exit if the node is no longer a follower or candidate
		if rf.state != Candidate && rf.state != Follower {
			log.Printf("[Election Timer] Stopped due to state change: %v", rf.state)
			// rf.logElectionTimerStopped()
			rf.mu.Unlock()
			return
		}

		// Stop timer if the term changes
		if termStarted != rf.currentTerm {
			log.Printf("[Election Timer] Stopped due to term change: oldTerm=%d, newTerm=%d", termStarted, rf.currentTerm)
			// rf.logElectionTimerStopped()
			rf.mu.Unlock()
			return
		}

		// If timeout occurs, start a new election
		if time.Since(rf.electionResetEvent) >= timeoutDuration {
			log.Printf("[Election Timer] Timeout reached, starting election for term %d", rf.currentTerm+1)
			// rf.logElectionTimeout(int(timeoutDuration.Seconds() * 1000))
			rf.startElection()
			rf.mu.Unlock()
			return
		}
		rf.mu.Unlock()
	}
}

func (rf *Raft) startElection() {
	rf.state = Candidate
	rf.currentTerm++
	savedCurrentTerm := rf.currentTerm
	rf.electionResetEvent = time.Now()
	rf.votedFor = rf.id

	log.Printf("[Election] Node %d became Candidate for term %d", rf.id, savedCurrentTerm)
	// rf.logState(client.Follower, client.Candidate)
	// We'll collect votes here (but not counting our own yet).
	votesReceived := 0
	repliesNeeded := len(rf.peerIds)

	// Send RequestVote RPC to all other servers
	for _, peerId := range rf.peerIds {
		go func(pid int) {
			// Grab the log state under the lock
			// rf.logRequestVote(pid)
			rf.mu.Lock()
			savedLastLogIndex, savedLastLogTerm := rf.lastLogIndexAndTerm()
			rf.mu.Unlock()

			log.Printf("[Election] Sending RequestVote to peer %d for term %d", pid, savedCurrentTerm)
			args := RequestVoteArgs{
				Term:         savedCurrentTerm,
				CandidateId:  rf.id,
				LastLogIndex: savedLastLogIndex,
				LastLogTerm:  savedLastLogTerm,
			}

			var reply RequestVoteReply
			err := rf.server.Call(pid, "Raft.RequestVote", args, &reply)

			rf.mu.Lock()
			defer rf.mu.Unlock()

			repliesNeeded--

			if err == nil {
				log.Printf("[Election] Received RequestVoteReply from %d: term=%d, voteGranted=%v", pid, reply.Term, reply.VoteGranted)
				// rf.logReceiveVote(pid, reply.VoteGranted)
				if rf.state != Candidate {
					log.Printf("[Election] Ignoring vote as node is no longer a candidate (state=%v)", rf.state)
				} else {
					if reply.Term > savedCurrentTerm {
						log.Printf("[Election] Term mismatch detected (received %d, current %d), reverting to Follower", reply.Term, savedCurrentTerm)
						rf.becomeFollower(reply.Term)
					} else if reply.Term == savedCurrentTerm && reply.VoteGranted {
						votesReceived++
						log.Printf("[Election] Vote granted from %d, total votes: %d", pid, votesReceived)
					}
				}
			} else {
				// rf.logVoteFailure(pid)
				log.Printf("[Election] Failed to receive vote response from %d: %v", pid, err)
			}

			if repliesNeeded == 0 {
				votesReceived++

				if rf.state == Candidate {
					if votesReceived*2 > len(rf.peerIds)+1 {
						rf.startLeader()
						// rf.logElectionWon()
						log.Printf("[Election] Node %d won the election for term %d with %d votes", rf.id, savedCurrentTerm, votesReceived)
						return
					} else {
						// rf.logElectionLost()
						log.Printf("[Election] Node %d lost the election for term %d (votes: %d)", rf.id, savedCurrentTerm, votesReceived)
					}
				}
				go rf.runElectionTimer()
			}
		}(peerId)
	}

	go rf.runElectionTimer()
}
