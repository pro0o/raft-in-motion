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
	rf.dlog("RequestVoteReceived", map[string]interface{}{
		"candidateId":   args.CandidateId,
		"candidateTerm": args.Term,
		"localTerm":     rf.currentTerm,
		"votedFor":      rf.votedFor,
		"lastIndex":     localLastIndex,
		"lastTerm":      localLastTerm,
	})

	// If the candidate's term is higher, update our term and become Follower
	if args.Term > rf.currentTerm {
		rf.dlog("StateTransition", map[string]interface{}{
			"newState": "Follower",
			"reason":   "Newer term",
			"term":     args.Term,
		})
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
		// rf.dlog("VoteGranted", map[string]interface{}{
		// 	"candidateId": args.CandidateId,
		// 	"term":        args.Term,
		// })
	}

	// Populate reply with our current term
	reply.Term = rf.currentTerm

	// Persist any updated state
	rf.persistToStorage()

	// // Log the outcome of the RequestVote
	// rf.dlog("RequestVoteReply", map[string]interface{}{
	// 	"candidateId": args.CandidateId,
	// 	"term":        reply.Term,
	// 	"voteGranted": reply.VoteGranted,
	// })

	return nil
}
