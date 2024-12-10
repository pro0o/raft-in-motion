package client

import (
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

type LogEntry struct {
	State     LogState `json:"state"`
	ID        int      `json:"id"`
	Args      []any    `json:"args"`
	Timestamp int64    `json:"timestamp"`
}

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

func WriteLoop(c *Client) {
	defer CleanUp(c)
	for {
		select {
		case logEntry := <-c.Send:
			if c.State == Disconnected || c.State == Closed {
				log.Warn().Msg("Client is disconnected or closed, not sending log entry.")
				return
			}

			if err := c.Conn.WriteJSON(logEntry); err != nil {
				log.Error().Err(err).Msg("Error sending log to client")
				return
			}
		case <-c.Closed:
			log.Warn().Msg("Connection closed for client")
			return
		}
	}
}

func (c *Client) AddLog(state LogState, id int, args ...any) {
	if c.State == Disconnected || c.State == Closed {
		log.Warn().Msg("Client is disconnected or closed, not adding log entry.")
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
		log.Warn().Msg("Warning: log entry for client could not be sent immediately (timeout)")
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
