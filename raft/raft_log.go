package raft

import (
	"main/client"
	"time"

	"github.com/rs/zerolog/log"
)

type LogEventType string

const (
	LogEventRequestVote          LogEventType = "requestVote"
	LogEventRecieveVote          LogEventType = "recieveVote"
	LogEventElectionTimeout      LogEventType = "electionTimeout"
	LogEventElectionTimerStopped LogEventType = "electionTimerStopped"
	LogEventElectionTimerStarted LogEventType = "electionTimerStarted"
	LogEventServerListening      LogEventType = "serverListening"
	LogEventPeerConnection       LogEventType = "peerConnection"
	LogEventStateTransition      LogEventType = "stateTransition"
	LogEventElectionWon          LogEventType = "electionWon"
	LogEventElectionLost         LogEventType = "electionLost"
	LogEventVoteFailure          LogEventType = "voteFailure"
)

// LogDetails consolidates all possible log details into a single struct
type LogDetails struct {
	From        *int
	To          *int
	VoteGranted *bool
	Timeout     *int
	Address     *string
	OldState    *client.RfState
	NewState    *client.RfState
}

type LogEntryCreator func(*Raft, client.BaseLogEntry, LogDetails) client.LogEntry

var logEntryCreators = map[LogEventType]LogEntryCreator{
	LogEventRequestVote: func(rf *Raft, base client.BaseLogEntry, details LogDetails) client.LogEntry {
		return client.VoteLogEntry{
			RaftLogEntry: createBaseRaftEntry(rf, base),
			To:           details.To,
		}
	},
	LogEventRecieveVote: createVoteEntry,
	LogEventVoteFailure: func(rf *Raft, base client.BaseLogEntry, details LogDetails) client.LogEntry {
		return client.VoteLogEntry{
			RaftLogEntry: createBaseRaftEntry(rf, base),
			To:           details.To,
		}
	},
	LogEventElectionTimeout:      createTimeoutEntry,
	LogEventElectionTimerStopped: createTimeoutEntry,
	LogEventElectionTimerStarted: createTimeoutEntry,
	LogEventServerListening: func(rf *Raft, base client.BaseLogEntry, details LogDetails) client.LogEntry {
		return client.ServerListeningLogEntry{
			BaseLogEntry: base,
			RaftID:       rf.id,
			Address:      getValueOrEmpty(details.Address),
		}
	},
	LogEventPeerConnection: func(rf *Raft, base client.BaseLogEntry, details LogDetails) client.LogEntry {
		return client.PeerConnectionLogEntry{
			ServerListeningLogEntry: client.ServerListeningLogEntry{
				BaseLogEntry: base,
				RaftID:       rf.id,
				Address:      getValueOrEmpty(details.Address),
			},
			To: details.To,
		}
	},
	LogEventStateTransition: func(rf *Raft, base client.BaseLogEntry, details LogDetails) client.LogEntry {
		return client.StateTransitionLogEntry{
			RaftLogEntry: createBaseRaftEntry(rf, base),
			OldState:     *details.OldState,
			NewState:     *details.NewState,
		}
	},
}

func createVoteLogEntry(rf *Raft, base client.BaseLogEntry, details LogDetails, isRequest bool) client.LogEntry {
	entry := client.VoteLogEntry{
		RaftLogEntry: createBaseRaftEntry(rf, base),
	}

	if isRequest {
		entry.To = details.To
	} else {
		entry.From = details.From
		entry.VoteGranted = details.VoteGranted != nil && *details.VoteGranted
	}

	return entry
}

func createVoteEntry(rf *Raft, base client.BaseLogEntry, details LogDetails) client.LogEntry {
	return client.VoteLogEntry{
		RaftLogEntry: createBaseRaftEntry(rf, base),
		From:         details.From,
		To:           details.To,
		VoteGranted:  details.VoteGranted != nil && *details.VoteGranted,
	}
}

func createTimeoutEntry(rf *Raft, base client.BaseLogEntry, details LogDetails) client.LogEntry {
	return client.TimeoutLogEntry{
		RaftLogEntry: createBaseRaftEntry(rf, base),
		Timeout:      getValueOrDefault(details.Timeout, 0),
	}
}

func createBaseRaftEntry(rf *Raft, base client.BaseLogEntry) client.RaftLogEntry {
	return client.RaftLogEntry{
		BaseLogEntry: base,
		RaftID:       rf.id,
		Term:         rf.currentTerm,
		State:        client.RfState(rf.state),
	}
}

func getValueOrDefault[T any](ptr *T, defaultValue T) T {
	if ptr == nil {
		return defaultValue
	}
	return *ptr
}

func getValueOrEmpty(ptr *string) string {
	return getValueOrDefault(ptr, "")
}

func (rf *Raft) dlog(event LogEventType, details LogDetails) {
	if DebugRF <= 0 {
		return
	}

	baseEntry := client.BaseLogEntry{
		Event:     string(event),
		Timestamp: time.Now(),
	}

	var logEntry client.LogEntry
	if creator, exists := logEntryCreators[event]; exists {
		logEntry = creator(rf, baseEntry, details)
	} else {
		logEntry = createBaseRaftEntry(rf, baseEntry)
	}

	if err := rf.writeLogEntry(logEntry); err != nil {
		log.Error().Err(err).Msg("Failed to write log entry")
	}
}

func (rf *Raft) logStateTransition(oldState, newState client.RfState) {
	rf.dlog(LogEventStateTransition, LogDetails{OldState: &oldState, NewState: &newState})
}
func (rf *Raft) logRequestVote(to int) {
	rf.dlog(LogEventRequestVote, LogDetails{From: &rf.id, To: &to})
}
func (rf *Raft) logReceiveVote(from int, granted bool) {
	rf.dlog(LogEventRecieveVote, LogDetails{From: &from, To: &rf.id, VoteGranted: &granted})
}
func (rf *Raft) logElectionTimeout(timeout int) {
	rf.dlog(LogEventElectionTimeout, LogDetails{Timeout: &timeout})
}
func (rf *Raft) logElectionTimerStopped() { rf.dlog(LogEventElectionTimerStopped, LogDetails{}) }
func (rf *Raft) logElectionTimerStarted() { rf.dlog(LogEventElectionTimerStarted, LogDetails{}) }
func (rf *Raft) logServerListening(address string) {
	rf.dlog(LogEventServerListening, LogDetails{Address: &address})
}
func (rf *Raft) logPeerConnection(address string, to *int) {
	rf.dlog(LogEventPeerConnection, LogDetails{Address: &address, To: to})
}
func (rf *Raft) logElectionWon()  { rf.dlog(LogEventElectionWon, LogDetails{}) }
func (rf *Raft) logElectionLost() { rf.dlog(LogEventElectionLost, LogDetails{}) }
func (rf *Raft) logVoteFailure(to int) {
	rf.dlog(LogEventVoteFailure, LogDetails{From: &rf.id, To: &to})
}

func (rf *Raft) writeLogEntry(entry client.LogEntry) error {
	rf.client.AddLog("Raft", rf.id, entry)
	return nil
}
