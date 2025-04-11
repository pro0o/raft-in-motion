package main

import (
	"net/http"

	"github.com/pro0o/raft-in-motion/internal/logger"
	"github.com/pro0o/raft-in-motion/internal/ws"

	"go.uber.org/zap"
)

func main() {
	logger.Init()
	defer logger.Sync()

	http.HandleFunc("/ws", ws.HandleWebSocket)

	logger.Info("Starting server on :8081")
	err := http.ListenAndServe(":8081", nil)
	if err != nil {
		logger.Error("Failed to start server", zap.Error(err))
	}
}
