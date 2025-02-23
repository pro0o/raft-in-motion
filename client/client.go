package client

import (
	"net/http"
	"sync"
	"time"

	"main/logger"

	"github.com/gorilla/websocket"
	"github.com/rs/zerolog/log"
)

type Client struct {
	Conn   *websocket.Conn
	Send   chan string
	Closed chan bool
	Once   sync.Once
	State  ClientState
	Logger *logger.MemoryLogger
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
	log.Printf("Clients connected: %d", activeClients)
}

func ReadLoop(c *Client) {
	defer CleanUp(c)
	for {
		_, msg, err := c.Conn.ReadMessage()
		if err != nil {
			log.Error().Err(err).Msg("Client read error")
			c.State = Disconnected
			break
		}
		c.Logger.Write([]byte(msg))
		log.Info().Msgf("Received: %s", msg)
	}
}

func WriteLoop(c *Client) {
	defer CleanUp(c)
	for {
		select {
		case msg := <-c.Send:
			c.Logger.Write([]byte(msg))
			if err := c.Conn.WriteMessage(websocket.TextMessage, []byte(msg)); err != nil {
				log.Error().Err(err).Msg("Error sending message")
				return
			}
		case <-c.Closed:
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
			log.Error().Err(err).Msg("Error closing connection")
		}
		LogClientConnection(false)
		c.State = Closed
	})
}

func KeepAlive(c *Client) {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				log.Error().Err(err).Msg("Ping failed, closing connection")
				CleanUp(c)
				return
			}
		case <-c.Closed:
			return
		}
	}
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Error().Err(err).Msg("Upgrade error")
		return
	}

	memLogger := logger.NewMemoryLogger(150)
	c := &Client{
		Conn:   conn,
		Send:   make(chan string),
		Closed: make(chan bool),
		State:  Active,
		Logger: memLogger,
	}

	LogClientConnection(true)
	go ReadLoop(c)
	go WriteLoop(c)
	go KeepAlive(c)
	go func() {
		<-c.Closed
		log.Info().Msgf("Client %p disconnected", c)
		// h.Shutdown()
		CleanUp(c)
	}()
}
