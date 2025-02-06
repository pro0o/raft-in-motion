package main

import (
	"context"
	"net/http"
	"os"
	"strconv"
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
	// Parse rate from query parameters
	rate, err := strconv.Atoi(r.URL.Query().Get("rate"))
	if err != nil || rate <= 0 {
		log.Warn().Msg("Invalid or missing rate parameter, using default rate of 1")
		rate = 1
	}

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

	// Extract the request type
	action := strings.TrimPrefix(r.URL.Path, "/ws/")

	// Process requests based on rate
	go func() {
		for i := 0; i < rate; i++ {
			select {
			case <-c.Closed:
				return
			default:
				ctx, cancel := context.WithTimeout(h.ctx, 5*time.Second)

				switch action {
				case "put":
					_, _, err := c1.Put(ctx, "key", "value")
					if err != nil {
						log.Error().Err(err).Msgf("Error in Put operation %d for client %p", i+1, c)
					} else {
						log.Info().Msgf("Put operation %d succeeded for client %p", i+1, c)
					}
				case "get":
					_, _, err := c1.Get(ctx, "key")
					if err != nil {
						log.Error().Err(err).Msgf("Error in Get operation %d for client %p", i+1, c)
					} else {
						log.Info().Msgf("Get operation %d succeeded for client %p", i+1, c)
					}
				default:
					log.Warn().Msg("No recognized action from URL path, skipping operation.")
					cancel()
					return
				}

				cancel()

				// Add a small delay between requests to prevent overwhelming the system
				time.Sleep(50 * time.Millisecond)
			}
		}
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

	http.HandleFunc("/ws/", handleWebSocket)
	log.Info().Msg("WS Server started on :8081")
	if err := http.ListenAndServe(":8081", nil); err != nil {
		log.Fatal().Err(err).Msg("ListenAndServe error")
	}
}
