package logger

import (
	"container/ring"
	"sync"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

type LogEntry struct {
	Data []byte
}

type MemoryLogger struct {
	maxLogs     int
	logs        *ring.Ring
	mu          sync.RWMutex
	currentSize int
}

func NewMemoryLogger(maxLogs int) *MemoryLogger {
	logger.Info("New MemLog created.")
	if maxLogs <= 0 {
		maxLogs = 150
	}
	return &MemoryLogger{
		maxLogs: maxLogs,
		logs:    ring.New(maxLogs),
	}
}

func (ml *MemoryLogger) Write(p []byte) (n int, err error) {
	ml.mu.Lock()
	defer ml.mu.Unlock()

	logCopy := make([]byte, len(p))
	copy(logCopy, p)

	entry := LogEntry{Data: logCopy}

	if ml.currentSize < ml.maxLogs {
		ml.currentSize++
	}

	ml.logs.Value = entry
	ml.logs = ml.logs.Next()
	// fmt.Printf("Current logs size is:%d\n", ml.currentSize)

	return len(p), nil
}

func (ml *MemoryLogger) GetAndFlushLogs(limit int) []LogEntry {
	if limit <= 0 {
		return []LogEntry{}
	}

	ml.mu.Lock()
	defer ml.mu.Unlock()

	if ml.currentSize == 0 {
		return []LogEntry{}
	}

	count := min(limit, ml.currentSize)
	result := make([]LogEntry, 0, count)

	oldestPos := ml.logs.Move(-ml.currentSize)

	for i := 0; i < count; i++ {
		if oldestPos.Value == nil {
			break
		}

		entry, _ := oldestPos.Value.(LogEntry)
		result = append(result, entry)

		oldestPos.Value = nil
		oldestPos = oldestPos.Next()
	}

	ml.currentSize -= len(result)

	return result
}

func (ml *MemoryLogger) HasLogs() bool {
	ml.mu.RLock()
	defer ml.mu.RUnlock()
	return ml.currentSize > 0
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func SetupLogger(memLogger *MemoryLogger) {
	zerolog.TimeFieldFormat = time.RFC3339
	log.Logger = zerolog.New(memLogger).With().Timestamp().Logger()
	zerolog.SetGlobalLevel(zerolog.InfoLevel)
	zerolog.SetGlobalLevel(zerolog.DebugLevel)
}
