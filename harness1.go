// harness.go
package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"sync/atomic"
	"time"

	clit "main/client"
	"main/kv/client"
	"main/kv/server"
	"main/raft"
)

func init() {
	log.SetFlags(log.Ltime | log.Lmicroseconds)
}

// PortManager manages port allocation for multiple clients
type PortManager struct {
	basePort int32
}

func NewPortManager(initialPort int) *PortManager {
	return &PortManager{
		basePort: int32(initialPort),
	}
}

func (pm *PortManager) NextPortRange(count int) []int {
	start := atomic.AddInt32(&pm.basePort, int32(count))
	ports := make([]int, count)
	for i := 0; i < count; i++ {
		ports[i] = int(start) + i
	}
	return ports
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
	c              *clit.Client
}

var portManager = NewPortManager(14200)

func NewHarness(n int, c *clit.Client) *Harness {
	log.Printf("new harness being created...")
	kvss := make([]*server.KVService, n)
	ready := make(chan any)
	connected := make([]bool, n)
	alive := make([]bool, n)
	storage := make([]*raft.MapStorage, n)

	// Get unique ports for this client's cluster
	ports := portManager.NextPortRange(n)

	// Create all KVService instances in this cluster.
	for i := range n {
		peerIds := make([]int, 0)
		for p := range n {
			if p != i {
				peerIds = append(peerIds, p)
			}
		}

		storage[i] = raft.NewMapStorage()
		kvss[i] = server.New(i, peerIds, storage[i], ready, c)
		alive[i] = true
	}

	// Connect the Raft peers of the services to each other
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
		kvss[i].ServeHTTP(ports[i])
		kvServiceAddrs[i] = fmt.Sprintf("localhost:%d", ports[i])
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
		c:              c,
	}
	log.Printf("new harness has been created")
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
				log.Printf("[%d] Error shutting down server: %v", i, err)
			} else {
				log.Printf("Server %d shut down successfully", i)
			}
		}
	}
	log.Printf("Shutdown complete for Harness %p", h)
}

func (h *Harness) NewClient(c *clit.Client) *client.KVClient {
	var addrs []string
	for i := range h.n {
		if h.alive[i] {
			addrs = append(addrs, h.kvServiceAddrs[i])
		}
	}
	return client.New(addrs, c)
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

func (h *Harness) CheckPut(c *client.KVClient, key, value string) (string, bool) {
	ctx, cancel := context.WithTimeout(h.ctx, 500*time.Millisecond)
	defer cancel()
	pv, f, err := c.Put(ctx, key, value)
	if err != nil {
		log.Printf("Put error: %v", err)
		return pv, f
	}
	return pv, f
}

func (h *Harness) CheckGet(c *client.KVClient, key string, wantValue string) {
	ctx, cancel := context.WithTimeout(h.ctx, 500*time.Millisecond)
	defer cancel()
	gv, f, err := c.Get(ctx, key)
	if err != nil {
		log.Printf("Get error: %v", err)
		return
	}
	if !f {
		log.Printf("Key not found: %s", key)
		return
	}
	if gv != wantValue {
		log.Printf("Value mismatch for key %s: got %s, want %s", key, gv, wantValue)
		return
	}
}
