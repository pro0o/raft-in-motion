// basically kv-store(application layer) ==> interaction(through RPC) ==> RAFT
// and vice versa

package server

import (
	"context"
	"encoding/gob"
	"fmt"
	"log"
	"net"
	"net/http"
	"sync"
	"time"

	"main/kv/types"
	"main/logstore"
	"main/raft"

	"github.com/gorilla/websocket"
)

const DebugKV = 1

// KVService represents a key-value store service that operates as part of a Raft cluster.
// It provides HTTP endpoints for external requests and manages data consistency via
// Raft consensus. Each instance of KVService corresponds to a single node in the cluster.
type KVService struct {
	sync.Mutex

	id         int                           // The unique identifier of the service/node within the Raft cluster.
	rs         *raft.Server                  // The Raft server that manages this node's participation in the Raft protocol.
	commitChan chan raft.CommitEntry         // Channel to receive committed entries from the Raft log.
	commitSubs map[int]chan raft.CommitEntry // Active subscriptions waiting for specific log entries to commit.
	ds         *DataStore                    // The underlying key-value data store (state machine).
	srv        *http.Server                  // The HTTP server used to expose this service to external clients.
	logs       *logstore.LogStore
	wsConn     *websocket.Conn
}

// New initializes a new KVService instance for the given node ID and its peers.
// It registers the Command struct for gob encoding, sets up the commit channel,
// and creates a Raft server to handle Raft-related RPCs. It then launches the Raft server
// and returns the initialized KVService.
func New(id int, peerIds []int, storage raft.Storage, readyChan <-chan any, logs *logstore.LogStore, wsConn *websocket.Conn) *KVService {
	gob.Register(Command{})
	commitChan := make(chan raft.CommitEntry)

	// Raft server setup, this node will start accepting RPC connections from peers
	rs := raft.NewServer(id, peerIds, storage, readyChan, commitChan, logs, wsConn)
	rs.Serve()

	kvs := &KVService{
		id:         id,
		rs:         rs,
		commitChan: commitChan,
		ds:         NewDataStore(),
		commitSubs: make(map[int]chan raft.CommitEntry),
		logs:       logs,
		wsConn:     wsConn,
	}

	// Start the commit updater that handles updates to the replicated state machine.
	kvs.runUpdater()
	return kvs
}

func (kvs *KVService) IsLeader() bool {
	return kvs.rs.IsLeader()
}

func (kvs *KVService) ServeHTTP(port int) {
	if kvs.srv != nil {
		panic("ServeHTTP called with existing server")
	}
	mux := http.NewServeMux()
	mux.HandleFunc("POST /get/", kvs.handleGet)
	mux.HandleFunc("POST /put/", kvs.handlePut)

	kvs.srv = &http.Server{
		Addr:    fmt.Sprintf(":%d", port),
		Handler: mux,
	}

	go func() {
		kvs.kvlog("serving HTTP on %s", kvs.srv.Addr)
		if err := kvs.srv.ListenAndServe(); err != http.ErrServerClosed {
			log.Fatal(err)
		}
		kvs.srv = nil
	}()
}

// Shutdown gracefully shuts down the Raft server and the HTTP server.
// It first closes the Raft server and its commit channel, then it stops the HTTP server.
// The method waits for all shutdown operations to complete before returning.
func (kvs *KVService) Shutdown() error {
	kvs.kvlog("shutting down Raft server")
	kvs.rs.Shutdown()
	kvs.kvlog("closing commitChan")
	close(kvs.commitChan)

	if kvs.srv != nil {
		kvs.kvlog("shutting down HTTP server")
		ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
		defer cancel()
		kvs.srv.Shutdown(ctx)
		kvs.kvlog("HTTP shutdown complete")
		return nil
	}

	return nil
}

// handlePut processes "PUT" requests from clients, which store a key-value pair in the store.
// The key-value pair is submitted as a Raft command, which is replicated across the cluster.
// Once the command is committed, it updates the state machine, and the client receives a response.
func (kvs *KVService) handlePut(w http.ResponseWriter, req *http.Request) {
	pr := &types.PutRequest{}
	if err := readRequestJSON(req, pr); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	kvs.kvlog("HTTP PUT %v", pr)

	cmd := Command{
		Kind:  CommandPut,
		Key:   pr.Key,
		Value: pr.Value,
		Id:    kvs.id,
	}
	logIndex := kvs.rs.Submit(cmd)

	// If not the leader, respond with a "not leader" status.
	if logIndex < 0 {
		renderJSON(w, types.PutResponse{RespStatus: types.StatusNotLeader})
		return
	}

	sub := kvs.createCommitSubsciption(logIndex)
	select {
	case entry := <-sub:
		entryCmd := entry.Command.(Command)
		// Verify if the command was committed by this node.
		if entryCmd.Id == kvs.id {
			renderJSON(w, types.PutResponse{
				RespStatus: types.StatusOK,
				KeyFound:   entryCmd.ResultFound,
				PrevValue:  entryCmd.ResultValue,
			})
		} else {
			renderJSON(w, types.PutResponse{RespStatus: types.StatusFailedCommit})
		}
	case <-req.Context().Done():
		return
	}
}

// handleGet processes "GET" requests from clients, retrieving the value for a given key.
// The request is submitted as a Raft command, and the result is returned to the client once committed.
func (kvs *KVService) handleGet(w http.ResponseWriter, req *http.Request) {
	gr := &types.GetRequest{}
	if err := readRequestJSON(req, gr); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	kvs.kvlog("HTTP GET %v", gr)

	cmd := Command{
		Kind: CommandGet,
		Key:  gr.Key,
		Id:   kvs.id,
	}
	logIndex := kvs.rs.Submit(cmd)

	if logIndex < 0 {
		renderJSON(w, types.GetResponse{RespStatus: types.StatusNotLeader})
		return
	}

	sub := kvs.createCommitSubsciption(logIndex)
	select {
	case entry := <-sub:
		entryCmd := entry.Command.(Command)
		if entryCmd.Id == kvs.id {
			renderJSON(w, types.GetResponse{
				RespStatus: types.StatusOK,
				KeyFound:   entryCmd.ResultFound,
				Value:      entryCmd.ResultValue,
			})
		} else {
			renderJSON(w, types.GetResponse{RespStatus: types.StatusFailedCommit})
		}
	case <-req.Context().Done():
		return
	}
}

// runUpdater continuously listens for committed entries from the Raft commit channel.
// For each committed entry, it applies the change to the data store (state machine)
// and notifies the respective commit subscriber (if any).
func (kvs *KVService) runUpdater() {
	go func() {
		for entry := range kvs.commitChan {
			cmd := entry.Command.(Command)

			// Process the command according to its type.
			switch cmd.Kind {
			case CommandGet:
				cmd.ResultValue, cmd.ResultFound = kvs.ds.Get(cmd.Key)
			case CommandPut:
				cmd.ResultValue, cmd.ResultFound = kvs.ds.Put(cmd.Key, cmd.Value)
			default:
				panic(fmt.Errorf("unexpected command %v", cmd))
			}

			newEntry := raft.CommitEntry{
				Command: cmd,
				Index:   entry.Index,
				Term:    entry.Term,
			}

			if sub := kvs.popCommitSubscription(entry.Index); sub != nil {
				sub <- newEntry
				close(sub)
			}
		}
	}()
}

// createCommitSubscription sets up a subscription for a specific log index.
// It allows the handler to be notified when the Raft log entry at that index is committed.
// The result is a single-use channel that will deliver the entry when ready.
func (kvs *KVService) createCommitSubsciption(logIndex int) chan raft.CommitEntry {
	kvs.Lock()
	defer kvs.Unlock()

	if _, exists := kvs.commitSubs[logIndex]; exists {
		panic(fmt.Sprintf("duplicate commit subscription for logIndex=%d", logIndex))
	}

	ch := make(chan raft.CommitEntry, 1)
	kvs.commitSubs[logIndex] = ch
	return ch
}

// popCommitSubscription retrieves and removes the subscription for the given log index.
// If no subscription exists for that index, it returns nil.
func (kvs *KVService) popCommitSubscription(logIndex int) chan raft.CommitEntry {
	kvs.Lock()
	defer kvs.Unlock()

	ch := kvs.commitSubs[logIndex]
	delete(kvs.commitSubs, logIndex)
	return ch
}

// kvlog logs a message if the DebugKV flag is enabled.
func (kvs *KVService) kvlog(format string, args ...any) {
	if DebugKV > 0 {
		formattedMsg := fmt.Sprintf("[kv %d] ", kvs.id) + fmt.Sprintf(format, args...)
		kvs.logs.AddLog(kvs.wsConn, logstore.KV, kvs.id, formattedMsg)
	}
}

// Testing functions for simulating network behavior in tests.
func (kvs *KVService) ConnectToRaftPeer(peerId int, addr net.Addr) error {
	return kvs.rs.ConnectToPeer(peerId, addr)
}

func (kvs *KVService) DisconnectFromAllRaftPeers() {
	kvs.rs.DisconnectAll()
}

func (kvs *KVService) DisconnectFromRaftPeer(peerId int) error {
	return kvs.rs.DisconnectPeer(peerId)
}

func (kvs *KVService) GetRaftListenAddr() net.Addr {
	return kvs.rs.GetListenAddr()
}
