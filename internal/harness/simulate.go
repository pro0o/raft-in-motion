package harness

import (
	"fmt"
	"time"

	"github.com/pro0o/raft-in-motion/internal/client"

	"github.com/rs/zerolog/log"
)

func sleepMs(n int) {
	time.Sleep(time.Duration(n) * time.Millisecond)
}

func initClient() *client.Client {
	return &client.Client{
		Send:   make(chan string),
		Closed: make(chan bool),
		State:  client.Active,
	}
}

func setupHarness() {
	log.Info().Msg("Running setup harness test...")
	c := initClient()
	h := NewHarness(3, c)
	defer h.Shutdown()
	sleepMs(80)
	log.Info().Msg("Setup harness test completed")
}

func clientRequestBeforeConsensus() {
	log.Info().Msg("Running client request before consensus test...")
	c := initClient()
	h := NewHarness(3, c)
	defer h.Shutdown()
	sleepMs(10)

	c1 := h.NewClient(c)
	prevValue, found := h.CheckPut(c1, "llave", "cosa")
	log.Info().
		Str("key", "llave").
		Str("value", "cosa").
		Str("previousValue", prevValue).
		Bool("found", found).
		Msg("Put operation completed")

	sleepMs(80)
	log.Info().Msg("Client request before consensus test completed")
}

func basicPutGetSingleClient() {
	log.Info().Msg("Running basic put/get single client test...")
	c := initClient()
	h := NewHarness(3, c)
	// defer h.Shutdown()

	time.Sleep(5 * time.Second)

	var leader int
	for attempts := 0; attempts < 2; attempts++ {
		leader = h.CheckSingleLeader()
		if leader >= 0 {
			break
		}
		time.Sleep(time.Duration(attempts+1) * 300 * time.Millisecond)
	}

	if leader < 0 {
		log.Error().Msg("Test failed: No leader elected")
		return
	}

	log.Info().Int("leaderId", leader).Msg("Found leader")

	c1 := h.NewClient(c)
	prevValue, found := h.CheckPut(c1, "llave", "cosa")
	log.Info().
		Str("key", "llave").
		Str("value", "cosa").
		Str("previousValue", prevValue).
		Bool("found", found).
		Msg("Put operation completed")

	h.CheckGet(c1, "llave", "cosa")
	sleepMs(80)
	log.Info().Msg("Basic put/get single client test completed")
}

func Test5ServerConcurrentClientsPutsAndGets() {
	log.Info().Msg("Running 5-server concurrent clients puts and gets test...")
	c := initClient()
	h := NewHarness(5, c)
	// defer h.Shutdown()

	// Wait for leader election
	lid := h.CheckSingleLeader()
	log.Info().Int("leaderId", lid).Msg("Leader elected")

	// Number of concurrent operations
	n := 9

	// Channel to synchronize completion of PUT operations
	putDone := make(chan bool, n)

	// Concurrent PUT operations
	for i := 0; i < n; i++ {
		go func(i int) {
			defer func() { putDone <- true }()
			c := h.NewClient(initClient())
			prevValue, found := h.CheckPut(c, fmt.Sprintf("key%v", i), fmt.Sprintf("value%v", i))
			if found {
				log.Error().
					Int("index", i).
					Str("prevValue", prevValue).
					Msg("Unexpected key found")
				return
			}
			log.Info().
				Int("index", i).
				Str("key", fmt.Sprintf("key%v", i)).
				Str("value", fmt.Sprintf("value%v", i)).
				Msg("Put operation completed")
		}(i)
	}

	// Wait for all PUT operations to complete
	for i := 0; i < n; i++ {
		<-putDone
	}

	// Channel to synchronize completion of GET operations
	getDone := make(chan bool, n)

	// Concurrent GET operations
	for i := 0; i < n; i++ {
		go func(i int) {
			defer func() { getDone <- true }()
			c := h.NewClient(initClient())
			h.CheckGet(c, fmt.Sprintf("key%v", i), fmt.Sprintf("value%v", i))
			log.Info().
				Int("index", i).
				Str("key", fmt.Sprintf("key%v", i)).
				Msg("Get operation completed")
		}(i)
	}

	// Wait for all GET operations to complete
	for i := 0; i < n; i++ {
		<-getDone
	}

	// log.Info().Msg("5-server concurrent clients puts and gets test completed")
}

func crashFollowerTest() {
	log.Info().Msg("Running crash follower test...")
	c := initClient()
	h := NewHarness(3, c)
	// defer h.Shutdown()

	lid := h.CheckSingleLeader()
	time.Sleep(1 * time.Second)
	// log.Info().Int("leaderId", lid).Msg("Initial leader identified")

	// Submit some PUT commands
	n := 3
	for i := 0; i < n; i++ {
		c := h.NewClient(initClient())
		prevValue, found := h.CheckPut(c, fmt.Sprintf("key%v", i), fmt.Sprintf("value%v", i))
		if found {
			log.Error().
				Int("index", i).
				Str("prevValue", prevValue).
				Msg("Unexpected key found")
			return
		}
		log.Info().
			Int("index", i).
			Str("key", fmt.Sprintf("key%v", i)).
			Str("value", fmt.Sprintf("value%v", i)).
			Msg("Put operation completed")
	}

	// Crash a non-leader
	otherId := (lid + 1) % 3
	log.Info().
		Int("crashingId", otherId).
		Msg("Crashing follower service")
	h.CrashService(otherId)

	// Test direct leader communication
	log.Info().Msg("Testing direct leader communication...")
	for i := 0; i < n; i++ {
		c := h.NewClient(initClient())
		h.CheckGet(c, fmt.Sprintf("key%v", i), fmt.Sprintf("value%v", i))
		log.Info().
			Int("index", i).
			Str("key", fmt.Sprintf("key%v", i)).
			Msg("Direct leader get operation completed")
	}

	// Test communication with regithub.com/pro0o/raft-in-motion/internaling servers
	log.Info().Msg("Testing communication with all regithub.com/pro0o/raft-in-motion/internaling servers...")
	for i := 0; i < n; i++ {
		c := h.NewClient(initClient())
		h.CheckGet(c, fmt.Sprintf("key%v", i), fmt.Sprintf("value%v", i))
		log.Info().
			Int("index", i).
			Str("key", fmt.Sprintf("key%v", i)).
			Msg("Get operation through any server completed")
	}
	sleepMs(800)

	log.Info().Msg("Crash follower test completed")
}

func DisconnectLeaderTest() {
	log.Info().Msg("simulatingDisconnectLeader")
	c := initClient()
	h := NewHarness(3, c)
	defer h.Shutdown()

	lid := h.CheckSingleLeader()

	n := 4
	for i := 0; i < n; i++ {
		c := h.NewClient(initClient())
		h.CheckPut(c, fmt.Sprintf("key%v", i), fmt.Sprintf("value%v", i))
	}

	log.Info().Int("raftID", lid).Msg("disconnectingLeader")
	h.DisconnectServiceFromPeers(lid)
	sleepMs(300)

	newlid := h.CheckSingleLeader()
	if newlid == lid {
		log.Error().
			Int("raftID", lid).
			Msg("New leader is same as disconnected leader")
		return
	}
	log.Info().Int("raftID", lid).Msg("reconnectingOriginalleader")
	h.ReconnectServiceToPeers(lid)
	sleepMs(200)

	log.Info().Msg("disconnectLeaderTestCompleted")
}
