// Test harness for testing the KV service and clients.
package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	"main/kv/client"
	"main/kv/server"
	"main/logstore"
	"main/raft"
)

func init() {
	log.SetFlags(log.Ltime | log.Lmicroseconds)
}

type Harness struct {
	n              int
	kvCluster      []*server.KVService
	kvServiceAddrs []string
	storage        []*raft.MapStorage
	connected      []bool
	alive          []bool
	ctx            context.Context
	ctxCancel      func()
}

func NewHarness(n int, logs *logstore.LogStore) *Harness {
	kvss := make([]*server.KVService, n)
	ready := make(chan any)
	connected := make([]bool, n)
	alive := make([]bool, n)
	storage := make([]*raft.MapStorage, n)

	// Create all KVService instances in this cluster.
	for i := range n {
		peerIds := make([]int, 0)
		for p := range n {
			if p != i {
				peerIds = append(peerIds, p)
			}
		}

		storage[i] = raft.NewMapStorage()
		kvss[i] = server.New(i, peerIds, storage[i], ready, logs)
		alive[i] = true
	}

	// Connect the Raft peers of the services to each other and close the ready
	// channel to signal to them it's all ready.
	for i := range n {
		for j := range n {
			if i != j {
				kvss[i].ConnectToRaftPeer(j, kvss[j].GetRaftListenAddr())
			}
		}
		connected[i] = true
	}
	close(ready)

	// Each KVService instance serves a REST API on a different port
	kvServiceAddrs := make([]string, n)
	for i := range n {
		port := 14200 + i
		kvss[i].ServeHTTP(port)

		kvServiceAddrs[i] = fmt.Sprintf("localhost:%d", port)
	}

	ctx, ctxCancel := context.WithCancel(context.Background())

	h := &Harness{
		n:              n,
		kvCluster:      kvss,
		kvServiceAddrs: kvServiceAddrs,
		connected:      connected,
		alive:          alive,
		storage:        storage,
		ctx:            ctx,
		ctxCancel:      ctxCancel,
	}
	return h
}

func (h *Harness) Shutdown() {
	for i := range h.n {
		h.kvCluster[i].DisconnectFromAllRaftPeers()
		h.connected[i] = false
	}

	http.DefaultClient.CloseIdleConnections()
	h.ctxCancel()

	for i := range h.n {
		if h.alive[i] {
			h.alive[i] = false
			if err := h.kvCluster[i].Shutdown(); err != nil {
				return
			}
		}
	}
}
func (h *Harness) NewClient(logs *logstore.LogStore) *client.KVClient {
	var addrs []string
	for i := range h.n {
		if h.alive[i] {
			addrs = append(addrs, h.kvServiceAddrs[i])
		}
	}
	return client.New(addrs, logs)
}

func (h *Harness) CheckSingleLeader() int {
	for r := 0; r < 8; r++ {
		leaderId := -1
		for i := range h.n {
			if h.connected[i] && h.kvCluster[i].IsLeader() {
				if leaderId < 0 {
					leaderId = i
				} else {
					return -1
				}
			}
		}
		if leaderId >= 0 {
			return leaderId
		}
		time.Sleep(150 * time.Millisecond)
	}

	return -1
}

// CheckPut sends a Put request through client c, and checks there are no
// errors. Returns (prevValue, keyFound).
func (h *Harness) CheckPut(c *client.KVClient, key, value string) (string, bool) {
	ctx, cancel := context.WithTimeout(h.ctx, 500*time.Millisecond)
	defer cancel()
	pv, f, err := c.Put(ctx, key, value)
	if err != nil {
		return pv, f
	}
	return pv, f
}

// CheckGet sends a Get request through client c, and checks there are
// no errors; it also checks that the key was found, and has the expected
// value.
func (h *Harness) CheckGet(c *client.KVClient, key string, wantValue string) {
	ctx, cancel := context.WithTimeout(h.ctx, 500*time.Millisecond)
	defer cancel()
	gv, f, err := c.Get(ctx, key)
	if err != nil {
		return
	}
	if !f {
		return
	}
	if gv != wantValue {
		return
	}
}
