// ELECTION
package raft

import (
	"math/rand"
	"time"
)

func (rf *Raft) electionTimeout() time.Duration {
	// Randomized election timeout between 150ms and 300ms
	return time.Duration(150+rand.Intn(150)) * time.Millisecond
}

// runElectionTimer implements an election timer. It should be launched whenever
// we want to start a timer towards becoming a candidate in a new election.
//
// This function is blocking and should be launched in a separate goroutine;
// it's designed to work for a single (one-shot) election timer, as it exits
// whenever the Raft state changes from follower/candidate or the term changes.
func (rf *Raft) runElectionTimer() {
	timeoutDuration := rf.electionTimeout()

	rf.mu.Lock()
	termStarted := rf.currentTerm
	rf.mu.Unlock()

	rf.dlog("Election timer started (duration: %v), term=%d", timeoutDuration, termStarted)

	ticker := time.NewTicker(10 * time.Millisecond)
	defer ticker.Stop()

	for {
		<-ticker.C

		rf.mu.Lock()
		// If the node is neither a Follower nor a Candidate, stop the timer.
		if rf.state != Candidate && rf.state != Follower {
			rf.dlog("Exiting election timer because node state is now %s", rf.state)
			rf.mu.Unlock()
			return
		}

		// If term changed, this timer is obsolete; stop it.
		if termStarted != rf.currentTerm {
			rf.dlog("Election timer term changed from %d to %d, stopping timer", termStarted, rf.currentTerm)
			rf.mu.Unlock()
			return
		}

		// If no leader contact (or no vote) within timeout, start a new election.
		if time.Since(rf.electionResetEvent) >= timeoutDuration {
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

	rf.dlog("Node transitioned to CANDIDATE for term=%d. Current log: %v", savedCurrentTerm, rf.log)

	votesReceived := 1 // Vote for self

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

			rf.dlog("Sending RequestVote to %d: %+v", peerId, args)
			var reply RequestVoteReply
			if err := rf.server.Call(peerId, "Raft.RequestVote", args, &reply); err == nil {
				rf.mu.Lock()
				defer rf.mu.Unlock()

				rf.dlog("Received RequestVoteReply: %+v", reply)

				// If we're no longer a candidate, ignore this reply.
				if rf.state != Candidate {
					rf.dlog("Vote reply ignored because node state is now %v (not Candidate)", rf.state)
					return
				}

				// If reply indicates a higher term, revert to follower.
				if reply.Term > savedCurrentTerm {
					rf.dlog("Vote reply indicates a higher term (term=%d). Reverting to FOLLOWER.", reply.Term)
					rf.becomeFollower(reply.Term)
					return
				}

				// If same term and vote granted, check if we have a majority.
				if reply.Term == savedCurrentTerm && reply.VoteGranted {
					votesReceived++
					if votesReceived*2 > len(rf.peerIds)+1 {
						rf.dlog("Node received %d votes (majority) in term=%d. Becoming LEADER.", votesReceived, savedCurrentTerm)
						rf.startLeader()
						return
					}
				}
			}
		}(peerId)
	}

	// If the election isn't decided quickly, we need to start a new timer
	// to handle the possibility of another election.
	go rf.runElectionTimer()
}
