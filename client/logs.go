package client

import "time"

type RfState int

const (
	Follower RfState = iota
	Candidate
	Leader
	Dead
)

func (s RfState) String() string {
	switch s {
	case Follower:
		return "Follower"
	case Candidate:
		return "Candidate"
	case Leader:
		return "Leader"
	case Dead:
		return "Dead"
	default:
		panic("unreachable")
	}
}

type BaseLogEntry struct {
	Event     string    `json:"event"`
	Timestamp time.Time `json:"timestamp"`
}

type RaftLogEntry struct {
	BaseLogEntry
	RaftID int     `json:"raftID"`
	Term   int     `json:"term"`
	State  RfState `json:"state"`
}

type VoteLogEntry struct {
	RaftLogEntry
	VoteGranted bool `json:"voteGranted"`
	From        *int `json:"from,omitempty"`
	To          *int `json:"to,omitempty"`
}

type TimeoutLogEntry struct {
	RaftLogEntry
	Timeout int `json:"timeout"`
}

type KVLogEntry struct {
	BaseLogEntry
	KvID     int    `json:"kvID"`
	Key      string `json:"key"`
	Value    string `json:"value"`
	ClientID int    `json:"clientID"`
}

type ServerListeningLogEntry struct {
	BaseLogEntry
	RaftID  int    `json:"raftID"`
	Address string `json:"address"`
}

type PeerConnectionLogEntry struct {
	ServerListeningLogEntry
	To *int `json:"to,omitempty"`
}

type StateTransitionLogEntry struct {
	RaftLogEntry
	OldState RfState `json:"oldState"`
	NewState RfState `json:"newState"`
}

type LogEntry interface {
	IsLogEntry()
}

func (r RaftLogEntry) IsLogEntry()            {}
func (v VoteLogEntry) IsLogEntry()            {}
func (t TimeoutLogEntry) IsLogEntry()         {}
func (k KVLogEntry) IsLogEntry()              {}
func (s ServerListeningLogEntry) IsLogEntry() {}
func (p PeerConnectionLogEntry) IsLogEntry()  {}
func (s StateTransitionLogEntry) IsLogEntry() {}
