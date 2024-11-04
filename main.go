package main

import (
	"context"
	"fmt"
	"log"
	"main/logstore"
	"net/http"
	"sync"
	"time"
)

func sleepMs(n int) {
	time.Sleep(time.Duration(n) * time.Millisecond)
}

func main() {
	clientConnected := make(chan bool) // Channel to notify when a client connects
	logs := logstore.NewLogStore(clientConnected)
	var wg sync.WaitGroup

	// WebSocket server handler
	go func() {
		http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
			logs.HandleConnections(w, r)
		})
		fmt.Println("WebSocket server started at ws://localhost:8080/ws")
		err := http.ListenAndServe(":8080", nil)
		if err != nil {
			log.Fatal("ListenAndServe: ", err)
		}
	}()

	log.Println("Waiting for client to connect...")

	// Wait for the signal from LogStore when a client connects
	<-clientConnected
	fmt.Println("client-status rn:", clientConnected)
	log.Println("Client connected, proceeding with the rest of the program")

	// Proceed with the rest of the program once a client is connected
	h := NewHarness(3, logs)

	c1 := h.NewClient(logs)
	ctx, cancel := context.WithTimeout(h.ctx, 6000*time.Millisecond)
	defer cancel()

	sleepMs(5000)

	_, _, err := c1.Get(ctx, "key")
	if err != nil {
		log.Printf("Error in Get operation: %v", err)
		return
	}

	sleepMs(80)

	// Add a wait group to block and prevent abrupt shutdown
	wg.Add(1)
	wg.Wait() // Block here to keep the server running
}
