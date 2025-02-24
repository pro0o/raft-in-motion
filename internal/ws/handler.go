package ws

import (
	"fmt"
	"net/http"

	"github.com/pro0o/raft-in-motion/internal/client"
	"github.com/pro0o/raft-in-motion/internal/harness"
	"github.com/pro0o/raft-in-motion/internal/logger"

	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		logger.Error("Upgrade error", zap.Error(err))
		return
	}
	logger.Init()
	defer logger.Sync()

	memLogger := logger.NewMemoryLogger(150)
	logger.SetupLogger(memLogger)

	c := &client.Client{
		Conn:   conn,
		Send:   make(chan string),
		Closed: make(chan bool),
		State:  client.Active,
		Logger: memLogger,
	}

	logger.Info("Running Disconnect Leader Test")

	harness.DisconnectLeaderTest()
	client.LogClientConnection(true)
	go client.ReadLoop(c)
	go client.WriteLoop(c)
	go func() {
		<-c.Closed
		logger.Info("Client disconnected", zap.String("client", fmt.Sprintf("%p", c)))
		client.CleanUp(c)
	}()
}
