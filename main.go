package main

import (
	"context"
	"fmt"
	"log"
	"main/logstore"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

func handleClient(ws *websocket.Conn, logs *logstore.LogStore, wg *sync.WaitGroup) {
	defer func() {
		wg.Done()
		// ws.Close() // Ensure websocket is properly closed
	}()
	log.Printf("hello from handleClient()")
	h := NewHarness(3, logs, ws)
	c1 := h.NewClient(logs, ws)

	ctx, cancel := context.WithTimeout(h.ctx, 5000*time.Millisecond)
	defer cancel()

	// Using blank identifier for unused returns
	_, _, err := c1.Get(ctx, "key")
	if err != nil {
		log.Printf("Error in Get operation for client %p: %v", ws, err)
		return
	}

	// Create done channel for graceful shutdown
	done := make(chan struct{})
	defer close(done)

	// Handle client disconnection in a separate goroutine
	go func() {
		select {
		case <-done:
			return
		case disconnectedWs := <-logs.GetDisconnectChan():
			if disconnectedWs == ws {
				log.Printf("Client %p has disconnected. Shutting down client handler...", ws)
				h.Shutdown() // Call shutdown when the client disconnects
				return
			}
		}
	}()
}

func main() {
	logs := logstore.NewLogStore()
	var wg sync.WaitGroup

	// Create server shutdown channel
	serverShutdown := make(chan struct{})

	// Start HTTP server in a separate goroutine
	go func() {
		mux := http.NewServeMux()
		mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
			ws, err := logs.HandleConnections(w, r)
			log.Printf("hello from go http start server")
			if err != nil {
				log.Println("Failed to establish WebSocket connection:", err)
				return
			}
			log.Printf("New WebSocket connection established: %p\n", ws)
		})

		server := &http.Server{
			Addr:    ":8080",
			Handler: mux,
		}

		fmt.Println("WebSocket server started at ws://localhost:8080/ws")

		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("ListenAndServe error: %v\n", err)
		}
	}()

	// Handle new client connections in the main loop
	connectChan := logs.GetConnectChan()
	for {
		select {
		case ws := <-connectChan:
			log.Printf("Starting handler for client: %p\n", ws)
			wg.Add(1)
			go handleClient(ws, logs, &wg)
		case <-serverShutdown:
			log.Println("Server shutting down...")
			wg.Wait()
			return
		}
	}
}
