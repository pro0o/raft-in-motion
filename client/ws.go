package client

// import (
// 	"net/http"

// 	"github.com/gorilla/websocket"
// 	"github.com/rs/zerolog/log"
// )

// func HandleWebSocket(w http.ResponseWriter, r *http.Request) {
// 	conn, err := upgrader.Upgrade(w, r, nil)
// 	if err != nil {
// 		log.Error().Err(err).Msg("Upgrade error")
// 		return
// 	}

// 	memLogger := &MemoryLogger{}
// 	c := &Client{
// 		Conn:   conn,
// 		Send:   make(chan string),
// 		Closed: make(chan bool),
// 		State:  Active,
// 		Logger: memLogger,
// 	}

// 	LogClientConnection(true)
// 	go ReadLoop(c)
// 	go WriteLoop(c)
// }
