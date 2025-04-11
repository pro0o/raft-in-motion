package raft

import (
	"fmt"
	"math/rand"
	"net"
	"net/rpc"
	"os"
	"sync"
	"time"

	"github.com/pro0o/raft-in-motion/internal/client"

	"github.com/rs/zerolog/log"
)

type Server struct {
	mu sync.Mutex

	serverId int
	peerIds  []int

	rf       *Raft
	storage  Storage
	rpcProxy *RPCProxy

	rpcServer *rpc.Server
	listener  net.Listener

	commitChan  chan<- CommitEntry
	peerClients map[int]*rpc.Client

	ready  <-chan any
	quit   chan any
	wg     sync.WaitGroup
	client *client.Client
}

func NewServer(serverId int, peerIds []int, storage Storage, ready <-chan any, commitChan chan<- CommitEntry, c *client.Client) *Server {
	s := new(Server)
	s.serverId = serverId
	s.peerIds = peerIds
	s.peerClients = make(map[int]*rpc.Client)
	s.storage = storage
	s.ready = ready
	s.commitChan = commitChan
	s.quit = make(chan any)
	s.client = c

	defer func() {
		s.mu.Lock()
		s.mu.Unlock()
		s.rf = Make(s.serverId, s.peerIds, s, s.storage, s.ready, s.commitChan, c)
	}()
	return s
}

// Serve starts the RPC server in a separate goroutine,
// listening on an automatically assigned TCP port.
func (s *Server) Serve() {
	s.mu.Lock()
	s.rpcServer = rpc.NewServer()
	s.rpcProxy = NewProxy(s.rf)
	if err := s.rpcServer.RegisterName("Raft", s.rpcProxy); err != nil {
		log.Error().Err(err).Int("serverId", s.serverId).Msg("Failed to register Raft RPC proxy")
	}

	var err error
	s.listener, err = net.Listen("tcp", ":0")
	if err != nil {
		log.Error().Err(err).Msg("Failed to start TCP listener. Server shutting down.")
		s.mu.Unlock()
		return
	}
	log.Info().
		Int("raftID", s.serverId).
		Str("address", s.listener.Addr().String()).
		Msg("serverListening")

	s.mu.Unlock()

	s.wg.Add(1)
	go func() {
		defer s.wg.Done()
		for {
			conn, err := s.listener.Accept()
			if err != nil {
				select {
				case <-s.quit:
					return
				default:
					log.Error().Err(err).Msg("Accept error while listening for RPC connections")
				}
			} else {
				// log.Printf("Serve: Accepted new connection.")
				s.wg.Add(1)
				go func() {
					s.rpcServer.ServeConn(conn)
					s.wg.Done()
				}()
			}
		}
	}()
}

func (s *Server) Submit(cmd any) int {
	return s.rf.Submit(cmd)
}

func (s *Server) DisconnectAll() {
	s.mu.Lock()
	defer s.mu.Unlock()
	// log.Info().
	// 	Int("raftID", s.serverId).
	// 	Msg("disconnectionInitialized")

	for id := range s.peerClients {
		if s.peerClients[id] != nil {
			_ = s.peerClients[id].Close() // ignoring close error
			s.peerClients[id] = nil
		}
	}
	log.Info().
		Int("raftID", s.serverId).
		Msg("disconnectionComplete")
}

func (s *Server) Shutdown() {
	// log.Info().
	// 	Int("raftID", s.serverId).
	// 	Msg("shutdownInitialized")
	s.rf.Kill()

	close(s.quit)
	_ = s.listener.Close()
	s.wg.Wait()
	log.Info().
		Int("raftID", s.serverId).
		Msg("shutdownComplete")
}

func (s *Server) GetListenAddr() net.Addr {
	s.mu.Lock()
	defer s.mu.Unlock()
	// log.Printf("GetListenAddr: Fetching listen address for serverId %d", s.serverId) // Debugging point
	return s.listener.Addr()
}

func (s *Server) ConnectToPeer(peerId int, addr net.Addr) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.peerClients[peerId] == nil {
		client, err := rpc.Dial(addr.Network(), addr.String())
		if err != nil {
			log.Error().Err(err).Int("serverId", s.serverId).Int("peerId", peerId).Msg("Failed to connect to peer")
			return err
		}
		s.peerClients[peerId] = client
		log.Info().
			Int("raftID", s.serverId).
			Int("peer", peerId).
			Str("address", addr.String()).
			Msg("peerConnected")

	}
	return nil
}

// DisconnectPeer closes the connection to a specific peer.
func (s *Server) DisconnectPeer(peerId int) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.peerClients[peerId] != nil {
		err := s.peerClients[peerId].Close()
		s.peerClients[peerId] = nil
		if err != nil {
			log.Error().Err(err).Int("peer", peerId).Msg("Failed to disconnect from peer")
		} else {
			log.Info().Int("peer", peerId).Msg("peerDisconnected")
			// log.Printf("DisconnectPeer: Disconnected from peerId %d", peerId) // Debugging point
		}
		return err
	}
	return nil
}

// Call invokes an RPC on the specified peer.
func (s *Server) Call(id int, serviceMethod string, args any, reply any) error {
	s.mu.Lock()
	peer := s.peerClients[id]
	s.mu.Unlock()

	if peer == nil {
		// log.Error().Int("clientId", id).Msg("Attempted to call peer RPC after client connection was closed")
		return fmt.Errorf("call client %d after it's closed", id)
	}
	// log.Printf("Call: Calling method %s on peerId %d", serviceMethod, id) // Debugging point
	return s.rpcProxy.Call(peer, serviceMethod, args, reply)
}

// IsLeader returns true if this server's Raft instance is leader.
func (s *Server) IsLeader() bool {
	_, _, isLeader := s.rf.Report()
	// log.Printf("IsLeader: Checking if serverId %d is leader, result: %v", s.serverId, isLeader) // Debugging point
	return isLeader
}

type RPCProxy struct {
	mu                 sync.Mutex
	rf                 *Raft
	numCallsBeforeDrop int
	// -1: not dropping any calls
	//  0: dropping all calls now
	// >0: drop calls after the specified number
}

func (s *Server) Proxy() *RPCProxy {
	return s.rpcProxy
}

func NewProxy(rf *Raft) *RPCProxy {
	return &RPCProxy{
		rf:                 rf,
		numCallsBeforeDrop: -1,
	}
}

func (rpp *RPCProxy) RequestVote(args RequestVoteArgs, reply *RequestVoteReply) error {
	if len(os.Getenv("RAFT_UNRELIABLE_RPC")) > 0 {
		dice := rand.Intn(10)
		switch dice {
		case 9:
			return fmt.Errorf("RPC dropped by proxy")
		case 8:
			time.Sleep(75 * time.Millisecond)
		}
	} else {
		// Slight random delay to simulate network latency
		delay := time.Duration(1+rand.Intn(5)) * time.Millisecond
		time.Sleep(delay)
	}
	return rpp.rf.RequestVote(args, reply)
}

func (rpp *RPCProxy) AppendEntries(args AppendEntriesArgs, reply *AppendEntriesReply) error {
	// log.Printf("AppendEntries: Simulating AppendEntries RPC") // Debugging point
	if len(os.Getenv("RAFT_UNRELIABLE_RPC")) > 0 {
		dice := rand.Intn(10)
		switch dice {
		case 9:
			// Drop the RPC.
			return fmt.Errorf("RPC dropped by proxy")
		case 8:
			// Delay the RPC.
			time.Sleep(75 * time.Millisecond)
		}
	} else {
		// Slight random delay to simulate network latency
		delay := time.Duration(1+rand.Intn(5)) * time.Millisecond
		time.Sleep(delay)
	}
	return rpp.rf.AppendEntries(args, reply)
}

// Call checks if we should drop the call or forward it to the peer's RPC client.
func (rpp *RPCProxy) Call(peer *rpc.Client, method string, args any, reply any) error {
	// log.Printf("RPCProxy Call: Calling %s method on peer", method) // Debugging point
	rpp.mu.Lock()
	if rpp.numCallsBeforeDrop == 0 {
		rpp.mu.Unlock()
		return fmt.Errorf("RPC forcibly dropped by proxy")
	}
	if rpp.numCallsBeforeDrop > 0 {
		rpp.numCallsBeforeDrop--
	}
	rpp.mu.Unlock()

	// Forward the call to the peer if not dropped.
	return peer.Call(method, args, reply)
}

// DropCallsAfterN configures the proxy to start dropping all calls after N more calls.
func (rpp *RPCProxy) DropCallsAfterN(n int) {
	rpp.mu.Lock()
	defer rpp.mu.Unlock()
	rpp.numCallsBeforeDrop = n
	// log.Printf("DropCallsAfterN: Dropping calls after %d more calls", n) // Debugging point
}

// DontDropCalls configures the proxy to never drop calls.
func (rpp *RPCProxy) DontDropCalls() {
	rpp.mu.Lock()
	defer rpp.mu.Unlock()
	rpp.numCallsBeforeDrop = -1
	// log.Printf("DontDropCalls: No longer dropping RPC calls.") // Debugging point
}
