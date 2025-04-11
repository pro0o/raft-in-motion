package raft

import (
	"math/rand"
	"time"

	"github.com/rs/zerolog/log"
)

func (rf *Raft) electionTimeout() time.Duration {
	return time.Duration(150+rand.Intn(150)) * time.Millisecond
}

func (rf *Raft) runElectionTimer() {
	timeoutDuration := rf.electionTimeout()

	rf.mu.Lock()
	termStarted := rf.currentTerm
	rf.mu.Unlock()

	log.Info().
		Int("raftID", rf.id).
		Int("term", termStarted).
		Int("state", int(rf.state)).
		Msg("electionTimerStarted")

	ticker := time.NewTicker(10 * time.Millisecond)
	defer ticker.Stop()

	for {
		<-ticker.C

		rf.mu.Lock()
		if rf.state != Candidate && rf.state != Follower {
			log.Info().
				Int("raftID", rf.id).
				Int("term", termStarted).
				Int("state", int(rf.state)).
				Msg("electionTimerStoppedI")
			rf.mu.Unlock()
			return
		}

		if termStarted != rf.currentTerm {
			log.Info().
				Int("raftID", rf.id).
				Int("term", termStarted).
				Int("state", int(rf.state)).
				Msg("electionTimerStoppedII")
			rf.mu.Unlock()
			return
		}

		// If timeout occurs, start a new election
		if time.Since(rf.electionResetEvent) >= timeoutDuration {
			log.Info().
				Int("raftID", rf.id).
				Int("term", termStarted).
				Int("state", int(rf.state)).
				Msg("electionTimeout")
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
	log.Info().
		Int("raftID", rf.id).
		Str("oldState", Follower.String()).
		Str("newState", rf.state.String()).
		Msg("stateTransition")
	votesReceived := 0
	repliesNeeded := len(rf.peerIds)

	for _, peerId := range rf.peerIds {
		go func(pid int) {
			rf.mu.Lock()
			savedLastLogIndex, savedLastLogTerm := rf.lastLogIndexAndTerm()
			rf.mu.Unlock()

			log.Info().
				Int("raftID", rf.id).
				Int("term", savedCurrentTerm).
				Str("state", rf.state.String()).
				Int("peer", pid).
				Msg("requestVote")

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
				log.Info().
					Int("raftID", rf.id).
					Int("term", reply.Term).
					Str("state", rf.state.String()).
					Bool("voteGranted", reply.VoteGranted).
					Int("peer", pid).
					Msg("recieveVote")

				if rf.state != Candidate {
					// log.Printf("[Election] Ignoring vote as node is no longer a candidate (state=%v)", rf.state)
				} else {
					if reply.Term > savedCurrentTerm {
						log.Info().
							Int("raftID", rf.id).
							Int("term", savedCurrentTerm).
							Str("state", rf.state.String()).
							Int("peer", pid).
							Msg("termMismatch")
						rf.becomeFollower(reply.Term)
					} else if reply.Term == savedCurrentTerm && reply.VoteGranted {
						votesReceived++
					}
				}
			} else {
				log.Info().
					Int("raftID", rf.id).
					Int("term", savedCurrentTerm).
					Str("state", rf.state.String()).
					Int("peer", pid).
					Msg("voteFailure")
			}

			if repliesNeeded == 0 {
				votesReceived++

				if rf.state == Candidate {
					if votesReceived*2 > len(rf.peerIds)+1 {
						rf.startLeader()
						log.Info().
							Int("raftID", rf.id).
							Int("term", savedCurrentTerm).
							Str("state", rf.state.String()).
							Msg("electionWon")
						return
					} else {
						log.Info().
							Int("raftID", rf.id).
							Int("term", savedCurrentTerm).
							Str("state", rf.state.String()).
							Msg("electionLost")
					}
				}
				go rf.runElectionTimer()
			}
		}(peerId)
	}

	go rf.runElectionTimer()
}
