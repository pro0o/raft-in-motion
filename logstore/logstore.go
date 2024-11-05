// main/logstore/logstore.go
package logstore

import (
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

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

type LogEntry struct {
	State     LogState `json:"state"`
	ID        int      `json:"id"`
	Args      any      `json:"args"`
	Timestamp int64    `json:"timestamp"`
}

type LogStore struct {
	mu             sync.RWMutex
	upgrader       websocket.Upgrader
	connectChan    chan *websocket.Conn
	clients        map[*websocket.Conn]bool
	disconnectChan chan *websocket.Conn
}

func NewLogStore() *LogStore {
	return &LogStore{
		clients:        make(map[*websocket.Conn]bool),
		connectChan:    make(chan *websocket.Conn, 10),
		disconnectChan: make(chan *websocket.Conn, 10),
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true
			},
		},
	}
}

func (ls *LogStore) AddLog(ws *websocket.Conn, state LogState, id int, args ...any) {
	logEntry := LogEntry{
		State:     state,
		ID:        id,
		Args:      args,
		Timestamp: time.Now().UnixNano(),
	}
	ls.mu.Lock()
	defer ls.mu.Unlock()
	if err := ws.WriteJSON(logEntry); err != nil {
		ls.disconnectChan <- ws
		delete(ls.clients, ws)
		// ws.Close()
		log.Printf("Error sending log to client: %v\n", err)
		return
	}
}

func (ls *LogStore) HandleConnections(w http.ResponseWriter, r *http.Request) (*websocket.Conn, error) {
	log.Printf("hello from handle conncection")
	ws, err := ls.upgrader.Upgrade(w, r, nil)
	// log.Printf("ws detail:", ws)
	if err != nil {
		return nil, fmt.Errorf("error upgrading to WebSocket: %v", err)
	}

	ls.mu.Lock()
	ls.clients[ws] = true
	ls.mu.Unlock()
	fmt.Printf("Client connected: %p\n", ws)
	ls.connectChan <- ws

	go ls.handleMessages(ws)

	return ws, nil
}

func (ls *LogStore) handleMessages(ws *websocket.Conn) {
	defer func() {
		// Ensure cleanup on disconnect
		ls.mu.Lock()
		delete(ls.clients, ws)
		ls.mu.Unlock()
		ls.disconnectChan <- ws // Notify of disconnection
		// ws.Close()              // Close the WebSocket connection
		log.Printf("Client disconnected: %p\n", ws)
	}()

	for {
		// Monitor for messages or connection closure
		messageType, _, err := ws.ReadMessage()
		if err != nil || messageType == websocket.CloseMessage {
			return
		}
	}
}

func (ls *LogStore) GetDisconnectChan() chan *websocket.Conn {
	return ls.disconnectChan
}

func (ls *LogStore) GetConnectChan() chan *websocket.Conn {
	return ls.connectChan
}
