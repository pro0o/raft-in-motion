package logstore

import (
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// Define the LogState enum
type LogState int

const (
	KV LogState = iota
	Raft
	Client
)

func (ls LogState) String() string {
	switch ls {
	case KV:
		return "KV"
	case Raft:
		return "Raft"
	case Client:
		return "Client"
	default:
		return "Unknown"
	}
}

// Define LogEntry struct
type LogEntry struct {
	State     LogState `json:"state"`
	ID        int      `json:"id"`
	Args      any      `json:"args"`
	Timestamp int64    `json:"timestamp"`
}

// Define LogStore struct
type LogStore struct {
	mu          sync.Mutex
	logs        []LogEntry
	clients     map[*websocket.Conn]bool // Active WebSocket clients
	broadcast   chan LogEntry            // Channel to send new log entries
	upgrader    websocket.Upgrader       // Upgrader for WebSocket connections
	connectChan chan bool                // Channel to notify when a client connects
}

// Create a new LogStore
func NewLogStore(connectChan chan bool) *LogStore {
	return &LogStore{
		logs:      make([]LogEntry, 0),
		clients:   make(map[*websocket.Conn]bool),
		broadcast: make(chan LogEntry),
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true // Allow any origin
			},
		},
		connectChan: connectChan, // Store the channel for client connection notifications
	}
}

// Add a log and broadcast to WebSocket clients
func (ls *LogStore) AddLog(state LogState, id int, args ...any) {
	ls.mu.Lock()

	// Create log entry
	logEntry := LogEntry{
		State:     state,
		ID:        id,
		Args:      args,
		Timestamp: time.Now().UnixNano(),
	}
	ls.logs = append(ls.logs, logEntry)

	// Unlock before broadcasting
	ls.mu.Unlock()

	// Send the new log entry to the broadcast channel
	ls.broadcast <- logEntry
}
func (ls *LogStore) HandleConnections(w http.ResponseWriter, r *http.Request) {
	ws, err := ls.upgrader.Upgrade(w, r, nil)

	if err != nil {
		fmt.Println("Error upgrading to WebSocket:", err)
		return
	}
	defer ws.Close()

	// Register the new client
	ls.mu.Lock()
	ls.clients[ws] = true
	ls.mu.Unlock()

	fmt.Println("Client connected, sending logs through WebSocket")
	ls.connectChan <- true // Notify that a client has connected

	// Send existing logs to the new client
	ls.mu.Lock()
	for _, entry := range ls.logs {
		if err := ws.WriteJSON(entry); err != nil {
			fmt.Printf("Error sending existing log to client: %v\n", err)
			ws.Close()
			ls.mu.Unlock()
			ls.mu.Lock()
			delete(ls.clients, ws)
			ls.mu.Unlock()
			return
		}
	}
	ls.mu.Unlock()

	// Listen for incoming log entries and broadcast them to clients
	for {
		select {
		case logEntry := <-ls.broadcast:
			ls.mu.Lock()
			for client := range ls.clients {
				err := client.WriteJSON(logEntry)
				if err != nil {
					fmt.Printf("Error sending log to client: %v\n", err)
					client.Close()
					delete(ls.clients, client)
				}
			}
			ls.mu.Unlock()
		case <-r.Context().Done():
			fmt.Println("Connection closed")
			ls.mu.Lock()
			delete(ls.clients, ws)
			ls.mu.Unlock()
			return
		}
	}
}

// PrintLogs method for debugging purposes
func (ls *LogStore) PrintLogs() {
	ls.mu.Lock()
	defer ls.mu.Unlock()

	fmt.Printf("Here are the logs stored (Total: %d):\n", len(ls.logs))
	for _, entry := range ls.logs {
		timestamp := time.Unix(0, entry.Timestamp)
		formattedTimestamp := timestamp.Format("15:04:05.000000")
		fmt.Printf("Timestamp: %s, State: %v, ID: %d, Args: %v\n", formattedTimestamp, entry.State, entry.ID, entry.Args)
	}
}
