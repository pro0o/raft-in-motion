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
			rf.dlog("ElectionTimerStopped", map[string]interface{}{
				"reason": "state_changed",
				"state":  rf.state,
			})
			rf.mu.Unlock()
			return
		}

		// Stop timer if the term changes
		if termStarted != rf.currentTerm {
			rf.dlog("ElectionTimerTermChanged", map[string]interface{}{
				"oldTerm": termStarted,
				"newTerm": rf.currentTerm,
			})
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

	votesReceived := 1 // Vote for self

	// Send RequestVote RPCs to all other servers concurrently
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

			rf.dlog("RequestVoteSent", map[string]interface{}{
				"to":           peerId,
				"term":         savedCurrentTerm,
				"lastLogIndex": savedLastLogIndex,
				"lastLogTerm":  savedLastLogTerm,
			})

			var reply RequestVoteReply
			if err := rf.server.Call(peerId, "Raft.RequestVote", args, &reply); err == nil {
				rf.mu.Lock()
				defer rf.mu.Unlock()

				rf.dlog("RequestVoteReplyReceived", map[string]interface{}{
					"from":        peerId,
					"term":        reply.Term,
					"voteGranted": reply.VoteGranted,
				})

				// If no longer a candidate, ignore this reply
				if rf.state != Candidate {
					rf.dlog("RequestVoteIgnored", map[string]interface{}{
						"reason": "not_candidate",
						"state":  rf.state,
					})
					return
				}

				// If reply indicates a higher term, revert to follower
				if reply.Term > savedCurrentTerm {
					rf.dlog("TermMismatch", map[string]interface{}{
						"receivedTerm": reply.Term,
						"currentTerm":  savedCurrentTerm,
					})
					rf.becomeFollower(reply.Term)
					return
				}

				// If same term and vote granted, check for majority
				if reply.Term == savedCurrentTerm && reply.VoteGranted {
					votesReceived++
					if votesReceived*2 > len(rf.peerIds)+1 {
						rf.dlog("LeaderElected", map[string]interface{}{
							"term":          savedCurrentTerm,
							"votesReceived": votesReceived,
						})
						rf.startLeader()
						return
					}
				}
			}
		}(peerId)
	}

	// Restart election timer in case of no decision
	go rf.runElectionTimer()
}
