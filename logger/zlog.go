package logger

import (
	"container/ring"
	"fmt"
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
	writeCount  int
}

func NewMemoryLogger(maxLogs int) *MemoryLogger {
	if maxLogs <= 0 {
		maxLogs = 150 // bufffer sizee
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

	entry := LogEntry{
		Data: logCopy,
	}

	if ml.logs.Value == nil {
		ml.currentSize++
	}

	ml.logs.Value = entry
	ml.logs = ml.logs.Next()
	ml.writeCount++
	fmt.Printf("Current count is:%d\n", ml.writeCount)

	return len(p), nil
}

func (ml *MemoryLogger) GetLogs() []LogEntry {
	ml.mu.RLock()
	defer ml.mu.RLock()

	result := make([]LogEntry, 0, ml.currentSize)
	ml.logs.Do(func(v interface{}) {
		if v != nil {
			result = append(result, v.(LogEntry))
		}
	})
	return result
}

func (ml *MemoryLogger) RemoveOldestN(n int) {
	ml.mu.Lock()
	defer ml.mu.Unlock()

	if n > ml.currentSize {
		n = ml.currentSize
	}

	// Move the ring forward by n positions
	for i := 0; i < n; i++ {
		ml.logs.Value = nil
		ml.logs = ml.logs.Next()
	}
	ml.currentSize -= n
}

func SetupLogger(memLogger *MemoryLogger) {
	zerolog.TimeFieldFormat = time.RFC3339
	log.Logger = zerolog.New(memLogger).With().Timestamp().Logger()
	zerolog.SetGlobalLevel(zerolog.InfoLevel)
	zerolog.SetGlobalLevel(zerolog.DebugLevel)
}
