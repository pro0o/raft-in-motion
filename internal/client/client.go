package client

import (
	"encoding/json"
	"errors"
	"sync"
	"time"

	"github.com/pro0o/raft-in-motion/internal/logger"

	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

var ErrMaxClientsReached = errors.New("maximum number of clients reached")

const MaxClients = 3

type Client struct {
	Conn         *websocket.Conn
	Send         chan string
	Closed       chan bool
	Once         sync.Once
	State        ClientState
	Logger       *logger.MemoryLogger
	mu           sync.Mutex
	LastActivity time.Time
}

type ClientState int

const (
	Active ClientState = iota
	Disconnected
	Closed
)

var activeClients = 0
var mu sync.Mutex

const IdleTimeout = 5 * time.Second

func CanAcceptNewClient() bool {
	mu.Lock()
	defer mu.Unlock()
	return activeClients < MaxClients
}

func LogClientConnection(connected bool) {
	mu.Lock()
	defer mu.Unlock()

	if connected {
		if activeClients >= MaxClients {
			logger.Warn("Attempted to connect client beyond limit", zap.Int("maxClients", MaxClients))
			return
		}
		activeClients++
	} else {
		if activeClients > 0 {
			activeClients--
		}
	}
	logger.Info("Active Clients", zap.Int("activeClients", activeClients), zap.Int("maxClients", MaxClients))
}

// NewClient creates a new client if the connection limit hasn't been reached
func NewClient(conn *websocket.Conn, log *logger.MemoryLogger) (*Client, error) {
	if !CanAcceptNewClient() {
		return nil, ErrMaxClientsReached
	}

	client := &Client{
		Conn:         conn,
		Send:         make(chan string),
		Closed:       make(chan bool),
		State:        Active,
		Logger:       log,
		LastActivity: time.Now(),
	}

	// Log connection after successful client creation
	LogClientConnection(true)

	return client, nil
}

func ReadLoop(c *Client) {
	defer CleanUp(c)
	for {
		_, msg, err := c.Conn.ReadMessage()
		if err != nil {
			logger.Error("Client read error", zap.Error(err))
			c.State = Disconnected
			break
		}

		c.mu.Lock()
		c.LastActivity = time.Now()
		c.mu.Unlock()

		c.Logger.Write([]byte(msg))
		logger.Info("Received", zap.String("message", string(msg)))
	}
}

func WriteLoop(c *Client) {
	defer CleanUp(c)

	logTicker := time.NewTicker(2 * time.Second)
	logTicker.Stop()

	idleChecker := time.NewTicker(1 * time.Second)
	defer idleChecker.Stop()

	tickerActive := false
	tickerControl := make(chan bool)

	if c.Logger.HasLogs() {
		logTicker = time.NewTicker(2 * time.Second)
		tickerActive = true
	}

	defer logTicker.Stop()

	go func() {
		checkTicker := time.NewTicker(1 * time.Second)
		defer checkTicker.Stop()

		for {
			select {
			case <-checkTicker.C:
				hasLogs := c.Logger.HasLogs()

				if hasLogs && !tickerActive {
					tickerControl <- true
				}

			case <-c.Closed:
				return
			}
		}
	}()

	for {
		select {
		case <-idleChecker.C:
			c.mu.Lock()
			idle := time.Since(c.LastActivity) >= IdleTimeout
			c.mu.Unlock()

			if idle && c.State == Active {
				logger.Info("Closing idle client connection", zap.Duration("idle_time", time.Since(c.LastActivity)))
				return
			}

		case <-logTicker.C:
			c.mu.Lock()
			c.LastActivity = time.Now()
			c.mu.Unlock()

			logs := c.Logger.GetAndFlushLogs(10)

			if len(logs) == 0 {
				logger.Info("No new logs to send")
				logTicker.Stop()
				tickerActive = false
				continue
			}

			logMessages := make([]map[string]interface{}, len(logs))
			for i, entry := range logs {
				var logData map[string]interface{}
				if err := json.Unmarshal(entry.Data, &logData); err != nil {
					logger.Error("Failed to unmarshal log entry", zap.Error(err))
					continue
				}
				logMessages[i] = logData
			}

			logMessageJSON, err := json.Marshal(logMessages)
			if err != nil {
				logger.Error("Failed to marshal log messages to JSON", zap.Error(err))
				continue
			}

			logSize := len(logMessageJSON)
			logger.Info("Sending log batch", zap.Int("size_bytes", logSize))

			c.mu.Lock()
			err = c.Conn.WriteMessage(websocket.TextMessage, logMessageJSON)
			c.mu.Unlock()

			if err != nil {
				logger.Error("Error sending log batch", zap.Error(err))
				return
			}

			logger.Info("Sent log batch to client", zap.Int("count", len(logs)))

		case startTicker := <-tickerControl:
			if startTicker && !tickerActive {
				logTicker = time.NewTicker(2 * time.Second)
				tickerActive = true
				logger.Info("Restarted log ticker due to new logs")
			}

		case <-c.Closed:
			logger.Info("Client closed connection, exiting write loop")
			return
		}
	}
}

func CleanUp(c *Client) {
	c.Once.Do(func() {
		select {
		case <-c.Closed:
		default:
			close(c.Closed)
		}

		if err := c.Conn.Close(); err != nil {
			logger.Error("Error closing connection", zap.Error(err))
		}
		LogClientConnection(false)
		c.State = Closed
	})
}

func GetActiveClientCount() int {
	mu.Lock()
	defer mu.Unlock()
	return activeClients
}
