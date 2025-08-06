// AE RPC
// Appending Entries
package raft

import (
	"time"
)

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

func (rf *Raft) AppendEntries(args AppendEntriesArgs, reply *AppendEntriesReply) error {
	rf.mu.Lock()
	defer rf.mu.Unlock()

	if rf.state == Dead {
		return nil
	}

	if args.Term > rf.currentTerm {
		rf.becomeFollower(args.Term)
		rf.electionResetEvent = time.Now()
	}

	reply.Term = rf.currentTerm
	reply.Success = false

	// check if leader regime is ON.
	if args.Term == rf.currentTerm {
		if rf.state != Follower {
			rf.becomeFollower(args.Term)
		}
		rf.electionResetEvent = time.Now()

		// leader fresh af.
		if args.PrevLogIndex == -1 {
			if len(rf.log) == 0 {
				reply.Success = true
			} else {
				reply.ConflictIndex = 0
				reply.ConflictTerm = rf.log[0].Term
			} // check if the follower logs are synced.
		} else if args.PrevLogIndex < len(rf.log) && args.PrevLogTerm == rf.log[args.PrevLogIndex].Term {
			reply.Success = true
			logInsertIndex := args.PrevLogIndex + 1 // follower
			newEntriesIndex := 0                    // leader

			// find the entry offset via pattern(term) matching .
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

			if newEntriesIndex < len(args.Entries) {
				rf.log = append(rf.log[:logInsertIndex], args.Entries[newEntriesIndex:]...)
			}

			if args.LeaderCommit > rf.commitIndex {
				rf.commitIndex = min(args.LeaderCommit, len(rf.log)-1)
				rf.newCommitReadyChan <- struct{}{}
			}
		}
	} else { // collison detection
		if args.PrevLogIndex >= len(rf.log) {
			reply.ConflictIndex = len(rf.log)
			reply.ConflictTerm = -1
		} else {
			if args.PrevLogIndex < 0 || args.PrevLogIndex >= len(rf.log) {
				reply.Success = false
				reply.ConflictIndex = len(rf.log)
				return nil
			}
			conflictTerm := rf.log[args.PrevLogIndex].Term
			reply.ConflictTerm = conflictTerm
			i := args.PrevLogIndex - 1
			for i >= 0 && rf.log[i].Term == conflictTerm {
				i--
			}
			reply.ConflictIndex = i + 1
		}
	}

	rf.persistToStorage()
	return nil
}

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
			if err := rf.server.Call(peerId, "Raft.AppendEntries", args, &reply); err == nil {
				rf.mu.Lock()
				defer rf.mu.Unlock()

				if reply.Term > rf.currentTerm {
					rf.becomeFollower(reply.Term)
					return
				}

				if rf.state == Leader && savedCurrentTerm == reply.Term {
					if reply.Success {
						rf.nextIndex[peerId] = nextIndexForPeer + len(entries)
						rf.matchIndex[peerId] = rf.nextIndex[peerId] - 1

						// updating the commitIndex of leader
						oldCommitIndex := rf.commitIndex
						for i := rf.commitIndex + 1; i < len(rf.log); i++ {
							if rf.log[i].Term == rf.currentTerm {
								matchCount := 1
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
							rf.newCommitReadyChan <- struct{}{}
							rf.triggerAEChan <- struct{}{}
						}
					} else {
						// conflict resolution
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
			//rf.dlog("CommitEntryDelivered", map[string]interface{}{
			// 	"commitIndex": commitIndex,
			// 	"term":        savedTerm,
			// 	"command":     entry.Command,
			// })
		}
	}

	// When newCommitReadyChan is closed, this goroutine ends
	//rf.dlog("CommitChanSenderStopped", map[string]interface{}{
	// 	"reason": "newCommitReadyChan closed",
	// 	"raftID": rf.id,
	// })
}
