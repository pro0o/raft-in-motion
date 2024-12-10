package main

import (
	"context"
	"net/http"
	"os"
	"time"

	"main/client"

	"github.com/gorilla/websocket"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Error().Err(err).Msg("Upgrade error")
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

	go client.ReadLoop(c)
	go client.WriteLoop(c)

	go func() {
		ctx, cancel := context.WithTimeout(h.ctx, 5*time.Second)
		defer cancel()

		_, _, err := c1.Get(ctx, "key")
		if err != nil {
			log.Error().Err(err).Msgf("Error in Get operation for client %p", c)
			return
		}

		log.Info().Msgf("Get operation succeeded for client %p", c)
	}()

	go func() {
		<-c.Closed
		log.Info().Msgf("Client %p disconnected", c)
		h.Shutdown()
		client.CleanUp(c)
	}()
}

func main() {
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	zerolog.SetGlobalLevel(zerolog.InfoLevel)

	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr, TimeFormat: "3:04:05PM"})

	http.HandleFunc("/ws", handleWebSocket)
	log.Info().Msg("WS Server started on :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal().Err(err).Msg("ListenAndServe error")
	}
}
