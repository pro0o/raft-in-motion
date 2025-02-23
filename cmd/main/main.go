package main

import (
	"main/harness"
	"main/logger"
)

func main() {
	logger.Init()
	defer logger.Sync()

	memLogger := logger.NewMemoryLogger(150)
	logger.SetupLogger(memLogger)

	logger.Info("Running Disconnect Leader Test")
	harness.DisconnectLeaderTest()

	logger.Info("Stored Logs:")
	for _, entry := range memLogger.GetLogs() {
		logger.Info(string(entry.Data))
	}
}
