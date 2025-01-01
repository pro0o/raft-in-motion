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
func (rf *Raft) runElectionTimer() {
	timeoutDuration := rf.electionTimeout()

	rf.mu.Lock()
	termStarted := rf.currentTerm
	rf.mu.Unlock()

	rf.dlog("ElectionTimerStarted", map[string]interface{}{
		"duration": timeoutDuration,
		"term":     termStarted,
	})

	ticker := time.NewTicker(10 * time.Millisecond)
	defer ticker.Stop()

	for {
		<-ticker.C

		rf.mu.Lock()
		// Exit if the node is no longer a follower or candidate
		if rf.state != Candidate && rf.state != Follower {
			// rf.dlog("ElectionTimerStopped", map[string]interface{}{
			// 	"reason": "state_changed",
			// 	"state":  rf.state,
			// })
			rf.mu.Unlock()
			return
		}

		// Stop timer if the term changes
		if termStarted != rf.currentTerm {
			// rf.dlog("ElectionTimerTermChanged", map[string]interface{}{
			// 	"oldTerm": termStarted,
			// 	"newTerm": rf.currentTerm,
			// })
			rf.mu.Unlock()
			return
		}

		// If timeout occurs, start a new election
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

	rf.dlog("StateTransition", map[string]interface{}{
		"newState": "Candidate",
		"term":     savedCurrentTerm,
	})

	// We'll collect votes here (but not counting our own yet).
	votesReceived := 0

	// How many peer replies are we expecting in total?
	repliesNeeded := len(rf.peerIds)

	// Send RequestVote RPC to all other servers
	for _, peerId := range rf.peerIds {
		go func(pid int) {
			// Grab the log state under the lock
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
			err := rf.server.Call(pid, "Raft.RequestVote", args, &reply)

			// Re-acquire the lock to modify shared state
			rf.mu.Lock()
			defer rf.mu.Unlock()

			// We'll consider this peer's response "done" whether
			// it succeeded or failed, so decrement `repliesNeeded`.
			repliesNeeded--

			if err == nil {
				rf.dlog("RequestVoteReplyReceived", map[string]interface{}{
					"from":        pid,
					"term":        reply.Term,
					"voteGranted": reply.VoteGranted,
				})

				// Ignore if we're no longer a candidate.
				if rf.state != Candidate {
					rf.dlog("RequestVoteIgnored", map[string]interface{}{
						"reason": "not_candidate",
						"state":  rf.state,
					})
				} else {
					// If reply indicates a higher term, revert to follower.
					if reply.Term > savedCurrentTerm {
						rf.dlog("TermMismatch", map[string]interface{}{
							"receivedTerm": reply.Term,
							"currentTerm":  savedCurrentTerm,
						})
						rf.becomeFollower(reply.Term)
					} else if reply.Term == savedCurrentTerm && reply.VoteGranted {
						// Count their vote
						votesReceived++
					}
				}
			}

			// If we've heard from *all* peers, finalize the election.
			if repliesNeeded == 0 {
				// Add our own self-vote now, after collecting all other votes.
				votesReceived++

				// Double-check: are we still a candidate?
				if rf.state == Candidate {
					// Check if we have a majority
					if votesReceived*2 > len(rf.peerIds)+1 {
						rf.dlog("LeaderElected", map[string]interface{}{
							"term":          savedCurrentTerm,
							"votesReceived": votesReceived,
						})
						rf.startLeader()
						return
					}
				}
				// If we didn't become leader, or we're no longer candidate,
				// just restart the election timer.
				go rf.runElectionTimer()
			}
		}(peerId)
	}

	// In case nothing finalizes early, we can also keep the election timer running
	// so we don't get stuck indefinitely if some peers never respond at all.
	go rf.runElectionTimer()
}
