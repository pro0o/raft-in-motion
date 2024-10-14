package helper

import (
	"log"
	"time"
)

func Tlog(format string, a ...any) {
	format = "[TEST] " + format
	log.Printf(format, a...)
}

func SleepMs(n int) {
	time.Sleep(time.Duration(n) * time.Millisecond)
}
