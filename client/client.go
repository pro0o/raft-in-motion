// main/client/client.go
package client

import (
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

type Client struct {
	Conn         *websocket.Conn
	Send         chan LogEntry
	Closed       chan bool
	Once         sync.Once
	Disconnected bool // Track if the client is disconnected
}

type LogState string

const (
	KV      LogState = "KV"
	Raft    LogState = "Raft"
	Client_ LogState = "Client"
)

type LogEntry struct {
	State     LogState `json:"state"`
	ID        int      `json:"id"`
	Args      []any    `json:"args"`
	Timestamp int64    `json:"timestamp"`
}

var activeClients = 0
var mu sync.Mutex

func LogClientConnection(connected bool) {
	mu.Lock()
	defer mu.Unlock()
	if connected {
		activeClients++
	} else {
		activeClients--
	}
	log.Printf("Clients connected: %d", activeClients)
}

func ReadLoop(c *Client) {
	defer CleanUp(c)
	for {
		_, _, err := c.Conn.ReadMessage()
		if err != nil {
			log.Printf("Client read error: %v", err)
			c.Disconnected = true
			break
		}
	}
}

func WriteLoop(c *Client) {
	defer CleanUp(c)
	for {
		select {
		case logEntry := <-c.Send:
			if c.Disconnected {
				log.Println("Client is disconnected, not sending log entry.")
				return
			}

			if err := c.Conn.WriteJSON(logEntry); err != nil {
				log.Printf("Error sending log to client: %v\n", err)
				return
			}
		case <-c.Closed:
			log.Println("Connection closed for client")
			return
		}
	}
}

func (c *Client) AddLog(state LogState, id int, args ...any) {
	if c.Disconnected {
		log.Println("Client is disconnected, not adding log entry.")
		return
	}

	logEntry := LogEntry{
		State:     state,
		ID:        id,
		Args:      args,
		Timestamp: time.Now().UnixNano(),
	}

	select {
	case c.Send <- logEntry:
	case <-time.After(2 * time.Second):
		log.Printf("Warning: log entry for client could not be sent immediately (timeout)")
	}
}

func CleanUp(c *Client) {
	c.Once.Do(func() {
		close(c.Closed)
		if err := c.Conn.Close(); err != nil {
			log.Printf("Error closing connection: %v", err)
		}
		LogClientConnection(false)
	})
}
