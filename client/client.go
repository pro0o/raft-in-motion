package client

import (
	"encoding/json"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/rs/zerolog/log"
)

type Client struct {
	Conn   *websocket.Conn
	Send   chan LogEntry
	Closed chan bool
	Once   sync.Once
	State  ClientState
}

type LogState string

const (
	KV      LogState = "KV"
	Raft    LogState = "Raft"
	Client_ LogState = "Client"
)

type ClientState int

const (
	Active ClientState = iota
	Disconnected
	Closed
)

var activeClients = 0
var mu sync.Mutex

func LogClientConnection(connected bool) {
	mu.Lock()
	defer mu.Unlock()
	if connected {
		activeClients++
	} else {
		if activeClients > 0 {
			activeClients--
		}
	}
	log.Info().Msgf("Clients connected: %d", activeClients)
}

func ReadLoop(c *Client) {
	defer CleanUp(c)
	for {
		_, _, err := c.Conn.ReadMessage()
		if err != nil {
			log.Error().Err(err).Msg("Client read error")
			c.State = Disconnected
			break
		}
	}
}

func (c *Client) WriteLoop() {
	defer CleanUp(c)

	go func() {
		for logEntry := range c.Send {
			if c.State == Disconnected || c.State == Closed {
				log.Warn().Msg("Client is disconnected or closed, not sending log entry.")
				return
			}

			jsonLog, err := json.Marshal(logEntry)
			if err != nil {
				log.Error().Err(err).Msg("Failed to marshal log entry")
				continue
			}

			log.Info().Msgf("Sending log to client: %s", string(jsonLog))

			if err := c.Conn.WriteMessage(websocket.TextMessage, jsonLog); err != nil {
				log.Error().Err(err).Msg("Error sending log to client")
				return
			}
		}
	}()

	for {
		select {
		case <-c.Closed:
			log.Warn().Msg("Connection closed for client")
			return
		}
	}
}

func (c *Client) AddLog(state LogState, raftID int, logEntry LogEntry) {
	if c.State == Disconnected || c.State == Closed {
		log.Warn().Msg("Client is disconnected or closed, not adding log entry.")
		return
	}
	log.Printf("to be marshalled log: %v", logEntry)

	select {
	case c.Send <- logEntry:
	case <-time.After(50 * time.Millisecond):
		// log.Warn().Msg("Warning: log entry for client could not be sent immediately (timeout)")
	}
}

func CleanUp(c *Client) {
	c.Once.Do(func() {
		close(c.Closed)
		if err := c.Conn.Close(); err != nil {
			log.Error().Err(err).Msg("Error closing connection")
		}
		LogClientConnection(false)
		c.State = Closed
	})
}
