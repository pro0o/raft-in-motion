package main

import (
	"context"
	"net/http"
	"os"
	"strings"
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
		Send:   make(chan string),
		Closed: make(chan bool),
		State:  client.Active,
	}

	client.LogClientConnection(true)

	h := NewHarness(3, c)
	c1 := h.NewClient(c)

	// Start the read/write loops
	go client.ReadLoop(c)
	go client.WriteLoop(c)

	// --------------------------------------------------------
	// EXTRACT THE REQUEST TYPE: "/ws/put" or "/ws/get" or ...
	// --------------------------------------------------------
	// r.URL.Path might be "/ws/put" or "/ws/get" (depending on your route).
	// So we trim off the "/ws/" portion:
	action := strings.TrimPrefix(r.URL.Path, "/ws/")

	switch action {
	case "put":
		go func() {
			ctx, cancel := context.WithTimeout(h.ctx, 5*time.Second)
			defer cancel()

			_, _, err := c1.Put(ctx, "key", "value")
			if err != nil {
				log.Error().Err(err).Msgf("Error in Put operation for client %p", c)
				return
			}

			log.Info().Msgf("Put operation succeeded for client %p", c)
		}()
	case "get":
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
	default:
		log.Warn().Msg("No recognized action from URL path, skipping put/get calls.")
	}

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

	// IMPORTANT: Use "/ws/" so that URLs like "/ws/get" or "/ws/put" will be routed here.
	http.HandleFunc("/ws/", handleWebSocket)
	log.Info().Msg("WS Server started on :8081")
	if err := http.ListenAndServe(":8081", nil); err != nil {
		log.Fatal().Err(err).Msg("ListenAndServe error")
	}
}
