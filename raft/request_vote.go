// REQ RPC
// RequestVote RPC from Figure 2 of the Raft paper.

package raft

import (
	"log"
	"time"
)

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

func (rf *Raft) RequestVote(args RequestVoteArgs, reply *RequestVoteReply) error {
	rf.mu.Lock()
	defer rf.mu.Unlock()

	if rf.state == Dead {
		// log.Printf("[RequestVote] Server is dead, ignoring RequestVote from candidate %d (Term: %d)", args.CandidateId, args.Term)
		return nil
	}

	// Obtain the local Raft's last log index and term
	localLastIndex, localLastTerm := rf.lastLogIndexAndTerm()

	// Log the incoming RequestVote with current term and candidate details
	// log.Printf("[RequestVote] Received RequestVote from CandidateId %d (CandidateTerm: %d). CurrentTerm: %d, VotedFor: %d, LastLogIndex: %d, LastLogTerm: %d",
	// args.CandidateId, args.Term, rf.currentTerm, rf.votedFor, localLastIndex, localLastTerm)

	// If the candidate's term is higher, update our term and become a Follower.
	if args.Term > rf.currentTerm {
		// log.Printf("[RequestVote] Candidate's term %d is higher than our current term %d. Transitioning to Follower.", args.Term, rf.currentTerm)
		rf.becomeFollower(args.Term)
	}

	// Decide whether to grant the vote.
	reply.VoteGranted = false
	if rf.currentTerm == args.Term &&
		(rf.votedFor == -1 || rf.votedFor == args.CandidateId) &&
		(args.LastLogTerm > localLastTerm ||
			(args.LastLogTerm == localLastTerm && args.LastLogIndex >= localLastIndex)) {

		// Grant the vote and update our candidate state.
		// log.Printf("[RequestVote] Granting vote to CandidateId %d (CandidateTerm: %d). Updating votedFor from %d to %d", args.CandidateId, args.Term, rf.votedFor, args.CandidateId)
		reply.VoteGranted = true
		rf.votedFor = args.CandidateId
		rf.electionResetEvent = time.Now()

		// Log the updated candidate state.
		// log.Printf("[RequestVote] Vote granted. CurrentTerm: %d, New votedFor: %d", rf.currentTerm, rf.votedFor)
	} else {
		// Log why vote was not granted.
		// log.Printf("[RequestVote] Vote NOT granted to CandidateId %d. CurrentTerm: %d, VotedFor: %d", args.CandidateId, rf.currentTerm, rf.votedFor)
	}

	// Populate reply with our current term.
	reply.Term = rf.currentTerm

	// Persist any updated state.
	rf.persistToStorage()

	// Log the outcome of the RequestVote.
	log.Printf("[RequestVote] Replying to CandidateId %d (Term: %d). VoteGranted: %v", args.CandidateId, reply.Term, reply.VoteGranted)

	return nil
}
