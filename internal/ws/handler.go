package ws

import (
	"fmt"
	"net/http"
	"strconv"

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
	simulate := r.URL.Query().Get("simulate")
	if simulate == "" {
		http.Error(w, "Missing simulate parameter", http.StatusBadRequest)
		return
	}

	simulateInt, err := strconv.Atoi(simulate)
	if err != nil || simulateInt != 6 {
		http.Error(w, "Invalid simulate parameter. Must be between 6", http.StatusBadRequest)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		logger.Error("Upgrade error", zap.Error(err))
		return
	}
	logger.Init()
	defer logger.Sync()

	memLogger := logger.NewMemoryLogger(100)
	logger.SetupLogger(memLogger)

	c := &client.Client{
		Conn:   conn,
		Send:   make(chan string),
		Closed: make(chan bool),
		State:  client.Active,
		Logger: memLogger,
	}

	switch simulateInt {
	case 6:
		logger.Info("Running Disconnect Leader Test")
		harness.DisconnectLeaderTest()
	default:
		http.Error(w, "Invalid simulation option", http.StatusBadRequest)
		return
	}

	client.LogClientConnection(true)
	go client.ReadLoop(c)
	go client.WriteLoop(c)
	go func() {
		<-c.Closed
		logger.Info("Client disconnected", zap.String("client", fmt.Sprintf("%p", c)))
		client.CleanUp(c)
	}()
}
