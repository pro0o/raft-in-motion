// main.go
package main

import (
	"context"
	"log"
	"main/client"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Upgrade error:", err)
		return
	}

	c := &client.Client{
		Conn:   conn,
		Send:   make(chan client.LogEntry),
		Closed: make(chan bool),
	}

	client.LogClientConnection(true)

	h := NewHarness(3, c)
	c1 := h.NewClient(c)

	// defer func() {
	// 	h.Shutdown()
	// 	client.CleanUp(c)
	// }()

	go client.ReadLoop(c)
	go client.WriteLoop(c)

	go func() {
		ctx, cancel := context.WithTimeout(h.ctx, 5*time.Second)
		defer cancel()

		_, _, err := c1.Get(ctx, "key")
		if err != nil {
			log.Printf("Error in Get operation for client %p: %v", c, err)
			return
		}

		log.Printf("Get operation succeeded for client %p", c)
	}()

	// Handle WebSocket connection closure.
	go func() {
		<-c.Closed
		log.Printf("Client %p disconnected", c)
		h.Shutdown()
		client.CleanUp(c)
	}()
}

func main() {
	http.HandleFunc("/ws", handleWebSocket)
	log.Println("WS Server started on :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal("ListenAndServe error:", err)
	}
}
