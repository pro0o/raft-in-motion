// AE RPC
// Appending Entries
package raft

import "time"

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
	Success bool

	// Faster conflict resolution optimization (described near the end of section
	// 5.3 in the paper.)
	ConflictIndex int
	ConflictTerm  int
}

// AppendEntries handles an incoming AppendEntries RPC request from a leader.
// It updates the follower's log to match the leader's log and advances the commit index
// if the leader's log is ahead of the follower's. It also handles heartbeats.
func (rf *Raft) AppendEntries(args AppendEntriesArgs, reply *AppendEntriesReply) error {
	rf.mu.Lock()
	defer rf.mu.Unlock()

	if rf.state == Dead {
		return nil
	}

	// 1. If leader’s term is newer than ours, update our term and convert to Follower
	if args.Term > rf.currentTerm {
		// rf.dlog("AppendEntries: new term detected (ourTerm=%d, leaderTerm=%d). Becoming FOLLOWER.", rf.currentTerm, args.Term)
		rf.becomeFollower(args.Term)
	}

	// Initialize the default reply (false) with our current term
	reply.Term = rf.currentTerm
	reply.Success = false

	// 2. If the leader’s term is the same as ours, remain (or become) a Follower
	//    and reset the election timer.
	if args.Term == rf.currentTerm {
		if rf.state != Follower {
			rf.dlog("AppendEntries: converting to FOLLOWER in current term=%d.", args.Term)
			rf.becomeFollower(args.Term)
		}
		rf.electionResetEvent = time.Now()

		// 3. Check if our log has an entry at PrevLogIndex with a matching PrevLogTerm.
		//    If args.PrevLogIndex == -1, that implies an empty log, so treat as no conflict.
		if args.PrevLogIndex == -1 ||
			(args.PrevLogIndex < len(rf.log) && args.PrevLogTerm == rf.log[args.PrevLogIndex].Term) {

			// We have a match. Mark Success = true.
			reply.Success = true
			logInsertIndex := args.PrevLogIndex + 1
			newEntriesIndex := 0

			// Advance through the common log portion where terms match.
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

			// If we still have new entries to insert, append them to our log after removing
			// any conflicting entries first.
			if newEntriesIndex < len(args.Entries) {
				rf.dlog("AppendEntries: inserting entries %v at local index %d", args.Entries[newEntriesIndex:], logInsertIndex)
				rf.log = append(rf.log[:logInsertIndex], args.Entries[newEntriesIndex:]...)
				// rf.dlog("AppendEntries: local log is now: %v", rf.log)
			}

			// 4. Update commitIndex if the leader’s commit is greater than ours.
			if args.LeaderCommit > rf.commitIndex {
				oldCommit := rf.commitIndex
				rf.commitIndex = min(args.LeaderCommit, len(rf.log)-1)
				rf.dlog("AppendEntries: updating commitIndex from %d to %d", oldCommit, rf.commitIndex)
				rf.newCommitReadyChan <- struct{}{}
			}

		} else {
			// There is a conflict (either PrevLogIndex out of range or terms do not match).
			// Provide conflict info for faster conflict resolution.
			if args.PrevLogIndex >= len(rf.log) {
				// The leader wants to access an index we do not have.
				reply.ConflictIndex = len(rf.log)
				reply.ConflictTerm = -1
				rf.dlog("AppendEntries: conflict - leader index=%d beyond local log. ConflictIndex=%d.",
					args.PrevLogIndex, reply.ConflictIndex)
			} else {
				// Mismatch term at PrevLogIndex
				conflictTerm := rf.log[args.PrevLogIndex].Term
				reply.ConflictTerm = conflictTerm
				i := args.PrevLogIndex - 1
				for i >= 0 && rf.log[i].Term == conflictTerm {
					i--
				}
				reply.ConflictIndex = i + 1
				rf.dlog("AppendEntries: conflict - mismatch term at index=%d. ConflictTerm=%d, ConflictIndex=%d.",
					args.PrevLogIndex, conflictTerm, reply.ConflictIndex)
			}
		}
	}

	rf.persistToStorage()
	return nil
}

// leaderSendHeartbeats sends a round of heartbeats (AppendEntries with no new log entries)
// to all peers. It collects replies and updates internal state accordingly.
func (rf *Raft) leaderSendHeartbeats() {
	rf.mu.Lock()
	if rf.state != Leader {
		rf.mu.Unlock()
		return
	}
	savedCurrentTerm := rf.currentTerm
	rf.mu.Unlock()

	for _, peerId := range rf.peerIds {
		go func(peerId int) {
			rf.mu.Lock()
			nextIndexForPeer := rf.nextIndex[peerId]
			prevLogIndex := nextIndexForPeer - 1
			prevLogTerm := -1
			if prevLogIndex >= 0 {
				prevLogTerm = rf.log[prevLogIndex].Term
			}
			entries := rf.log[nextIndexForPeer:]

			args := AppendEntriesArgs{
				Term:         savedCurrentTerm,
				LeaderId:     rf.id,
				PrevLogIndex: prevLogIndex,
				PrevLogTerm:  prevLogTerm,
				Entries:      entries,
				LeaderCommit: rf.commitIndex,
			}
			rf.mu.Unlock()

			var reply AppendEntriesReply
			// Send the AppendEntries RPC as a heartbeat or log replication
			if err := rf.server.Call(peerId, "Raft.AppendEntries", args, &reply); err == nil {
				rf.mu.Lock()
				defer rf.mu.Unlock()

				// If a higher term is found, revert to follower
				if reply.Term > rf.currentTerm {
					rf.dlog("Heartbeat reply from %d indicates newer term=%d; converting to FOLLOWER.", peerId, reply.Term)
					rf.becomeFollower(reply.Term)
					return
				}

				// If we’re still the leader in this term, process the results
				if rf.state == Leader && savedCurrentTerm == reply.Term {
					if reply.Success {
						// Update nextIndex and matchIndex upon successful replication
						rf.nextIndex[peerId] = nextIndexForPeer + len(entries)
						rf.matchIndex[peerId] = rf.nextIndex[peerId] - 1

						// Attempt to advance commitIndex if a new majority forms
						oldCommitIndex := rf.commitIndex
						for i := rf.commitIndex + 1; i < len(rf.log); i++ {
							if rf.log[i].Term == rf.currentTerm {
								matchCount := 1 // include leader’s own match
								for _, pid := range rf.peerIds {
									if rf.matchIndex[pid] >= i {
										matchCount++
									}
								}
								if matchCount*2 > len(rf.peerIds)+1 {
									rf.commitIndex = i
								}
							}
						}
						if rf.commitIndex != oldCommitIndex {
							rf.dlog("Leader has a new commitIndex=%d. Broadcasting new commits to peers.", rf.commitIndex)
							rf.newCommitReadyChan <- struct{}{}
							rf.triggerAEChan <- struct{}{}
						}
					} else {
						// Handle conflict resolution
						if reply.ConflictTerm >= 0 {
							// Try to find the last index of ConflictTerm in our log.
							lastIndexOfTerm := -1
							for i := len(rf.log) - 1; i >= 0; i-- {
								if rf.log[i].Term == reply.ConflictTerm {
									lastIndexOfTerm = i
									break
								}
							}
							if lastIndexOfTerm >= 0 {
								rf.nextIndex[peerId] = lastIndexOfTerm + 1
							} else {
								rf.nextIndex[peerId] = reply.ConflictIndex
							}
							rf.dlog("Conflict with %d. Updated nextIndex=%d based on conflict term %d.",
								peerId, rf.nextIndex[peerId], reply.ConflictTerm)
						} else {
							rf.nextIndex[peerId] = reply.ConflictIndex
							rf.dlog("Conflict with %d. Updated nextIndex=%d with no conflictTerm info.",
								peerId, rf.nextIndex[peerId])
						}
					}
				}
			}
		}(peerId)
	}
}

// commitChanSender sends committed entries on rf.commitChan by monitoring
// newCommitReadyChan for newly ready entries. It runs in a background goroutine,
// and rf.commitChan may be buffered to control the consumption speed.
// It exits when newCommitReadyChan is closed.
func (rf *Raft) commitChanSender() {
	for range rf.newCommitReadyChan {
		// Gather all entries to apply
		rf.mu.Lock()
		savedTerm := rf.currentTerm
		savedLastApplied := rf.lastApplied
		var readyEntries []LogEntry

		if rf.commitIndex > rf.lastApplied {
			readyEntries = rf.log[rf.lastApplied+1 : rf.commitIndex+1]
			rf.lastApplied = rf.commitIndex
		}
		rf.mu.Unlock()

		// Send each newly committed entry on commitChan
		for i, entry := range readyEntries {
			commitIndex := savedLastApplied + i + 1
			rf.commitChan <- CommitEntry{
				Command: entry.Command,
				Index:   commitIndex,
				Term:    savedTerm,
			}
			rf.dlog("commitChanSender: delivered entry at index=%d to commitChan", commitIndex)
		}
	}
	// When newCommitReadyChan is closed, this goroutine ends
	rf.dlog("commitChanSender: newCommitReadyChan closed, stopping commit loop.")
}
