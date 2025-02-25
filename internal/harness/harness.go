package harness

import (
	"context"
	"fmt"
	"math/rand/v2"
	"net/http"
	"strings"
	"sync/atomic"
	"time"

	clit "github.com/pro0o/raft-in-motion/internal/client"
	"github.com/pro0o/raft-in-motion/internal/kv/client"
	"github.com/pro0o/raft-in-motion/internal/kv/server"
	"github.com/pro0o/raft-in-motion/internal/logger"
	"github.com/pro0o/raft-in-motion/internal/raft"

	"github.com/rs/zerolog/log"
	"go.uber.org/zap"
)

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
	logger.Info("Creating new harness...")

	kvss := make([]*server.KVService, n)
	ready := make(chan any)
	connected := make([]bool, n)
	alive := make([]bool, n)
	storage := make([]*raft.MapStorage, n)

	ports := portManager.NextPortRange(n)

	for i := range kvss {
		peerIds := make([]int, 0)
		for p := range kvss {
			if p != i {
				peerIds = append(peerIds, p)
			}
		}

		storage[i] = raft.NewMapStorage()
		kvss[i] = server.New(i, peerIds, storage[i], ready, c)
		alive[i] = true
	}

	for i := range kvss {
		for j := range kvss {
			if i != j {
				kvss[i].ConnectToRaftPeer(j, kvss[j].GetRaftListenAddr())
			}
		}
		connected[i] = true
	}
	time.Sleep(500 * time.Millisecond)
	close(ready)

	kvServiceAddrs := make([]string, n)
	for i := range kvss {
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

	logger.Info("New harness created")

	return h
}

func (h *Harness) Shutdown() {
	for i := range h.kvCluster {
		h.kvCluster[i].DisconnectFromAllRaftPeers()
		h.connected[i] = false
	}

	http.DefaultClient.CloseIdleConnections()
	h.ctxCancel()

	for i := range h.kvCluster {
		if h.alive[i] {
			h.alive[i] = false
			if err := h.kvCluster[i].Shutdown(); err != nil {
				logger.Error("Error shutting down server", zap.Int("serverID", i), zap.Error(err))
			} else {
				logger.Info("Server shut down successfully", zap.Int("serverID", i))
			}
		}
	}

	logger.Info("Shutdown complete for Harness", zap.String("harness", fmt.Sprintf("%p", h)))
}

func (h *Harness) NewClient(c *clit.Client) *client.KVClient {
	var addrs []string
	for i := range h.kvCluster {
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
		time.Sleep(500 * time.Millisecond)
	}
	return -1
}

func (h *Harness) CheckPut(c *client.KVClient, key, value string) (string, bool) {
	ctx, cancel := context.WithTimeout(h.ctx, 300*time.Millisecond)
	defer cancel()
	pv, f, err := c.Put(ctx, key, value)
	if err != nil {
		logger.Error("Put error", zap.String("key", key), zap.String("value", value), zap.Error(err))
		return pv, f
	}
	return pv, f
}

func (h *Harness) CheckGet(c *client.KVClient, key string, wantValue string) {
	ctx, cancel := context.WithTimeout(h.ctx, 500*time.Millisecond)
	defer cancel()
	gv, f, err := c.Get(ctx, key)
	if err != nil {
		logger.Error("Get error", zap.String("key", key), zap.Error(err))
		return
	}
	if !f {
		logger.Warn("Key not found", zap.String("key", key))
		return
	}
	if gv != wantValue {
		logger.Warn("Value mismatch for key", zap.String("key", key), zap.String("got", gv), zap.String("want", wantValue))
	}
}

func (h *Harness) DisconnectServiceFromPeers(id int) {
	log.Info().
		Int("raftID", id).
		Msg("serviceDisconnecting")

	h.kvCluster[id].DisconnectFromAllRaftPeers()
	for j := 0; j < h.n; j++ {
		if j != id {
			h.kvCluster[j].DisconnectFromRaftPeer(id)
		}
	}
	h.connected[id] = false
	// log.Info().
	// 	Int("raftID", id).
	// 	Msg("serviceDisconnected")
}

func (h *Harness) ReconnectServiceToPeers(id int) {
	for j := 0; j < h.n; j++ {
		if j != id && h.alive[j] {
			if err := h.kvCluster[id].ConnectToRaftPeer(j, h.kvCluster[j].GetRaftListenAddr()); err != nil {
				log.Error().Err(err).Int("service_id", id).Int("peer_id", j).
					Msg("Failed to connect service to peer")
				return
			}
			if err := h.kvCluster[j].ConnectToRaftPeer(id, h.kvCluster[id].GetRaftListenAddr()); err != nil {
				log.Error().Err(err).Int("service_id", id).Int("peer_id", j).
					Msg("Failed to connect peer to service")
				return
			}
		}
	}
	h.connected[id] = true
	log.Info().
		Int("raftID", id).
		Msg("serviceReconnected")
}

func (h *Harness) CrashService(id int) {
	log.Info().
		Int("raftID", id).
		Msg("serviceCrashing")
	h.DisconnectServiceFromPeers(id)
	h.alive[id] = false
	if err := h.kvCluster[id].Shutdown(); err != nil {
		log.Error().Err(err).Int("service_id", id).Msg("Error while shutting down service")
		return
	}
	log.Info().
		Int("raftID", id).
		Msg("serviceCrashed")
}

func (h *Harness) RestartService(id int) {
	if h.alive[id] {
		logger.Error("Cannot restart: service is still alive", zap.Int("service_id", id))
		return
	}
	// log.Info().
	// 	Int("raftID", id).
	// 	Msg("serviceReconnecting")
	peerIds := make([]int, 0)
	for p := range h.n {
		if p != id {
			peerIds = append(peerIds, p)
		}
	}
	ready := make(chan any)

	// Create a new KVService instance with a client
	h.kvCluster[id] = server.New(id, peerIds, h.storage[id], ready, h.c)
	h.kvCluster[id].ServeHTTP(14200 + id)

	h.ReconnectServiceToPeers(id)
	close(ready)
	h.alive[id] = true

	time.Sleep(20 * time.Millisecond)
	log.Info().
		Int("raftID", id).
		Msg("serviceRestarted")
}

func (h *Harness) NewClientWithRandomAddrsOrder() *client.KVClient {
	var addrs []string
	for i := range h.kvCluster {
		if h.alive[i] {
			addrs = append(addrs, h.kvServiceAddrs[i])
		}
	}
	rand.Shuffle(len(addrs), func(i, j int) {
		addrs[i], addrs[j] = addrs[j], addrs[i]
	})
	return client.New(addrs, h.c)
}

func (h *Harness) NewClientSingleService(id int) *client.KVClient {
	addrs := h.kvServiceAddrs[id : id+1]
	return client.New(addrs, h.c)
}

func (h *Harness) CheckGetNotFound(c *client.KVClient, key string) {
	ctx, cancel := context.WithTimeout(h.ctx, 500*time.Millisecond)
	defer cancel()
	_, f, err := c.Get(ctx, key)
	if err != nil {
		logger.Error("Get error", zap.String("key", key), zap.Error(err))
		return
	}
	if f {
		logger.Warn("Key unexpectedly found", zap.String("key", key))
	}
}

func (h *Harness) CheckGetTimesOut(c *client.KVClient, key string) {
	ctx, cancel := context.WithTimeout(context.Background(), 300*time.Millisecond)
	defer cancel()
	_, _, err := c.Get(ctx, key)
	if err == nil || !strings.Contains(err.Error(), "deadline exceeded") {
		logger.Error("Expected deadline exceeded error", zap.String("key", key), zap.Error(err))
	}
}
