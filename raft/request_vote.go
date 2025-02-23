// REQ RPC
// RequestVote RPC from Figure 2 of the Raft paper.

package raft

import (
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
		return nil
	}

	localLastIndex, localLastTerm := rf.lastLogIndexAndTerm()

	if args.Term > rf.currentTerm {
		rf.becomeFollower(args.Term)
	}

	reply.VoteGranted = false
	if rf.currentTerm == args.Term &&
		(rf.votedFor == -1 || rf.votedFor == args.CandidateId) &&
		(args.LastLogTerm > localLastTerm ||
			(args.LastLogTerm == localLastTerm && args.LastLogIndex >= localLastIndex)) {
		reply.VoteGranted = true
		rf.votedFor = args.CandidateId
		rf.electionResetEvent = time.Now()

	} else {
	}

	reply.Term = rf.currentTerm

	rf.persistToStorage()

	return nil
}
