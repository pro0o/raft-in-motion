// REQ RPC
// RequestVote RPC from Figure 2 of the Raft paper.

package raft

import "time"

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
		return nil
	}

	// Obtain the local Raft's last log index and term
	localLastIndex, localLastTerm := rf.lastLogIndexAndTerm()

	// Log the incoming RequestVote
	rf.dlog("Received RequestVote from candidate=%d (term=%d). Local state: [term=%d, votedFor=%d, lastIndex=%d, lastTerm=%d]",
		args.CandidateId, args.Term, rf.currentTerm, rf.votedFor, localLastIndex, localLastTerm)

	// If the candidate's term is higher, update our term and become Follower
	if args.Term > rf.currentTerm {
		rf.dlog("RequestVote: candidate term (%d) is newer than local term (%d). Converting to FOLLOWER.",
			args.Term, rf.currentTerm)
		rf.becomeFollower(args.Term)
	}

	// Decide whether to grant the vote
	reply.VoteGranted = false
	if rf.currentTerm == args.Term &&
		(rf.votedFor == -1 || rf.votedFor == args.CandidateId) &&
		(args.LastLogTerm > localLastTerm ||
			(args.LastLogTerm == localLastTerm && args.LastLogIndex >= localLastIndex)) {

		// Grant the vote
		reply.VoteGranted = true
		rf.votedFor = args.CandidateId
		rf.electionResetEvent = time.Now()
		rf.dlog("Granting vote to candidate=%d for term=%d", args.CandidateId, args.Term)
	}

	// Populate reply with our current term
	reply.Term = rf.currentTerm

	// Persist any updated state
	rf.persistToStorage()

	// Log the outcome of the RequestVote
	rf.dlog("RequestVote reply to candidate=%d: [term=%d, voteGranted=%t]", args.CandidateId, reply.Term, reply.VoteGranted)

	return nil
}
