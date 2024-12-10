// AE RPC
// Apending Entries
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
	rf.dlog("AppendEntries: %+v", args)

	// 1. Reply false if term < currentTerm
	if args.Term > rf.currentTerm {
		rf.dlog("... term out of date in AppendEntries")
		rf.becomeFollower(args.Term)
	}

	// 2. Reply false if log doesn’t contain an entry at prevLogIndex
	// whose term matches prevLogTerm
	reply.Success = false
	if args.Term == rf.currentTerm {
		if rf.state != Follower {
			rf.becomeFollower(args.Term)
		}
		rf.electionResetEvent = time.Now()

		// 3. If an existing entry conflicts with a new one (same index
		// but different terms), delete the existing entry and all that
		// follow it.

		// Check if the log has an entry at PrevLogIndex with a matching PrevLogTerm.
		// If PrevLogIndex is -1, assume true as no entry exists to compare.
		if args.PrevLogIndex == -1 ||
			(args.PrevLogIndex < len(rf.log) && args.PrevLogTerm == rf.log[args.PrevLogIndex].Term) {
			reply.Success = true
			logInsertIndex := args.PrevLogIndex + 1
			newEntriesIndex := 0

			// The main goal here is to find where the terms in the log mismatch between
			// the follower and leader entries.
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
			// At the end of this loop:
			// - logInsertIndex points at the end of the log, or an index where the
			//   term mismatches with an entry from the leader
			// - newEntriesIndex points at the end of Entries, or an index where the
			//   term mismatches with the corresponding log entry
			if newEntriesIndex < len(args.Entries) {
				rf.dlog("... inserting entries %v from index %d", args.Entries[newEntriesIndex:], logInsertIndex)
				rf.log = append(rf.log[:logInsertIndex], args.Entries[newEntriesIndex:]...)
				rf.dlog("... log is now: %v", rf.log)
			}

			// Set commit index.
			if args.LeaderCommit > rf.commitIndex {
				rf.commitIndex = min(args.LeaderCommit, len(rf.log)-1)
				rf.dlog("... setting commitIndex=%d", rf.commitIndex)
				rf.newCommitReadyChan <- struct{}{}
			}
		} else {
			// Conflict detected: set the conflict information to assist the leader
			// in finding the correct log position quickly.
			if args.PrevLogIndex >= len(rf.log) {
				reply.ConflictIndex = len(rf.log)
				reply.ConflictTerm = -1
			} else {
				// Mismatch in term at PrevLogIndex; populate ConflictTerm and ConflictIndex.
				reply.ConflictTerm = rf.log[args.PrevLogIndex].Term
				var i int
				for i = args.PrevLogIndex - 1; i >= 0; i-- {
					if rf.log[i].Term != reply.ConflictTerm {
						break
					}
				}
				reply.ConflictIndex = i + 1
			}
		}
	}

	reply.Term = rf.currentTerm
	rf.persistToStorage()
	rf.dlog("AppendEntries reply: %+v", *reply)
	return nil
}

// leaderSendHeartbeats sends a round of heartbeats to all peers, collects their
// replies and adjusts rf's state.
// figure 2 of paper, check the Send HEartbeats
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
			ni := rf.nextIndex[peerId]
			prevLogIndex := ni - 1
			prevLogTerm := -1
			if prevLogIndex >= 0 {
				prevLogTerm = rf.log[prevLogIndex].Term
			}
			entries := rf.log[ni:]

			args := AppendEntriesArgs{
				Term:         savedCurrentTerm,
				LeaderId:     rf.id,
				PrevLogIndex: prevLogIndex,
				PrevLogTerm:  prevLogTerm,
				Entries:      entries,
				LeaderCommit: rf.commitIndex,
			}
			rf.mu.Unlock()
			rf.dlog("sending AppendEntries to %v: ni=%d, args=%+v", peerId, ni, args)
			var reply AppendEntriesReply
			if err := rf.server.Call(peerId, "Raft.AppendEntries", args, &reply); err == nil {
				rf.mu.Lock()
				// Unfortunately, we cannot just defer mu.Unlock() here, because one
				// of the conditional paths needs to send on some channels. So we have
				// to carefully place mu.Unlock() on all exit paths from this point
				// on.
				if reply.Term > rf.currentTerm {
					rf.dlog("term out of date in heartbeat reply")
					rf.becomeFollower(reply.Term)
					rf.mu.Unlock()
					return
				}

				if rf.state == Leader && savedCurrentTerm == reply.Term {
					if reply.Success {
						rf.nextIndex[peerId] = ni + len(entries)
						rf.matchIndex[peerId] = rf.nextIndex[peerId] - 1

						savedCommitIndex := rf.commitIndex
						for i := rf.commitIndex + 1; i < len(rf.log); i++ {
							if rf.log[i].Term == rf.currentTerm {
								matchCount := 1
								for _, peerId := range rf.peerIds {
									if rf.matchIndex[peerId] >= i {
										matchCount++
									}
								}
								if matchCount*2 > len(rf.peerIds)+1 {
									rf.commitIndex = i
								}
							}
						}
						rf.dlog("AppendEntries reply from %d success: nextIndex := %v, matchIndex := %v; commitIndex := %d", peerId, rf.nextIndex, rf.matchIndex, rf.commitIndex)
						if rf.commitIndex != savedCommitIndex {
							rf.dlog("leader sets commitIndex := %d", rf.commitIndex)
							// Commit index changed: the leader considers new entries to be
							// committed. Send new entries on the commit channel to this
							// leader's clients, and notify followers by sending them AEs.
							rf.mu.Unlock()
							rf.newCommitReadyChan <- struct{}{}
							rf.triggerAEChan <- struct{}{}
						} else {
							rf.mu.Unlock()
						}
					} else {
						if reply.ConflictTerm >= 0 {
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
						} else {
							rf.nextIndex[peerId] = reply.ConflictIndex
						}
						rf.dlog("AppendEntries reply from %d !success: nextIndex := %d", peerId, ni-1)
						rf.mu.Unlock()
					}
				} else {
					rf.mu.Unlock()
				}
			}
		}(peerId)
	}
}

// commitChanSender sends committed entries on rf.commitChan by monitoring
// newCommitReadyChan for new ready entries. It runs in a background goroutine,
// and rf.commitChan may be buffered to control the consumption speed.
// It exits when newCommitReadyChan is closed.
func (rf *Raft) commitChanSender() {
	for range rf.newCommitReadyChan {
		// Find which entries we have to apply.
		rf.mu.Lock()
		savedTerm := rf.currentTerm
		savedLastApplied := rf.lastApplied
		var entries []LogEntry
		if rf.commitIndex > rf.lastApplied {
			entries = rf.log[rf.lastApplied+1 : rf.commitIndex+1]
			rf.lastApplied = rf.commitIndex
		}
		rf.mu.Unlock()
		// rf.dlog("commitChanSender entries=%v, savedLastApplied=%d", entries, savedLastApplied)

		for i, entry := range entries {
			// rf.dlog("send on commitchan i=%v, entry=%v", i, entry)
			rf.commitChan <- CommitEntry{
				Command: entry.Command,
				Index:   savedLastApplied + i + 1,
				Term:    savedTerm,
			}
		}
	}
	// rf.dlog("commitChanSender done")
}
