// SKELETON
package raft

import (
	"fmt"
	"main/client"
	"math/rand"
	"net"
	"net/rpc"
	"os"
	"sync"
	"time"

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

func (s *Server) Serve() {
	s.mu.Lock()
	s.rpcServer = rpc.NewServer()
	s.rpcProxy = NewProxy(s.rf)
	s.rpcServer.RegisterName("Raft", s.rpcProxy)

	var err error
	s.listener, err = net.Listen("tcp", ":0")
	if err != nil {
		log.Fatal().Err(err).Msgf("Failed to start listener")
	}
	log.Info().Int("serverId", s.serverId).Str("addr", s.listener.Addr().String()).Msg("Listening")
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
					log.Fatal().Err(err).Msg("Accept error")
				}
			}
			s.wg.Add(1)
			go func() {
				s.rpcServer.ServeConn(conn)
				s.wg.Done()
			}()
		}
	}()
}

func (s *Server) Submit(cmd any) int {
	return s.rf.Submit(cmd)
}

func (s *Server) DisconnectAll() {
	s.mu.Lock()
	defer s.mu.Unlock()
	for id := range s.peerClients {
		if s.peerClients[id] != nil {
			s.peerClients[id].Close()
			s.peerClients[id] = nil
		}
	}
}

func (s *Server) Shutdown() {
	s.rf.Kill()
	close(s.quit)
	s.listener.Close()
	s.wg.Wait()
}

func (s *Server) GetListenAddr() net.Addr {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.listener.Addr()
}

func (s *Server) ConnectToPeer(peerId int, addr net.Addr) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.peerClients[peerId] == nil {
		client, err := rpc.Dial(addr.Network(), addr.String())
		if err != nil {
			return err
		}
		s.peerClients[peerId] = client
	}
	return nil
}
func (s *Server) DisconnectPeer(peerId int) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.peerClients[peerId] != nil {
		err := s.peerClients[peerId].Close()
		s.peerClients[peerId] = nil
		if err != nil {
			log.Error().Err(err).Int("peerId", peerId).Msg("Failed to disconnect peer")
		}
		return err
	}
	return nil
}

func (s *Server) Call(id int, serviceMethod string, args any, reply any) error {
	s.mu.Lock()
	peer := s.peerClients[id]
	s.mu.Unlock()

	if peer == nil {
		log.Error().Int("clientId", id).Msg("Call client after it's closed")
		return fmt.Errorf("call client %d after it's closed", id)
	} else {
		return s.rpcProxy.Call(peer, serviceMethod, args, reply)
	}
}
func (s *Server) IsLeader() bool {
	_, _, isLeader := s.rf.Report()
	return isLeader
}

// RPCProxy acts as a proxy server for Raft's RPC methods, intercepting and manipulating RPC request
// before forwarding them to the Raft server.
// mainly willl be useful for simulating..
type RPCProxy struct {
	mu                 sync.Mutex
	rf                 *Raft
	numCallsBeforeDrop int
	//   -1: means we're not dropping any calls
	//    0: means we're dropping all calls now
	//   >0: means we'll start dropping calls after this number is made
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
		if dice == 9 {
			// rpp.rf.dlog("drop RequestVote")
			return fmt.Errorf("RPC failed")
		} else if dice == 8 {
			// rpp.rf.dlog("delay RequestVote")
			time.Sleep(75 * time.Millisecond)
		}
	} else {
		time.Sleep(time.Duration(1+rand.Intn(5)) * time.Millisecond)
	}
	return rpp.rf.RequestVote(args, reply)
}

func (rpp *RPCProxy) AppendEntries(args AppendEntriesArgs, reply *AppendEntriesReply) error {
	if len(os.Getenv("RAFT_UNRELIABLE_RPC")) > 0 {
		dice := rand.Intn(10)
		if dice == 9 {
			// rpp.rf.dlog("drop AppendEntries")
			return fmt.Errorf("RPC failed")
		} else if dice == 8 {
			// rpp.rf.dlog("delay AppendEntries")
			time.Sleep(75 * time.Millisecond)
		}
	} else {
		time.Sleep(time.Duration(1+rand.Intn(5)) * time.Millisecond)
	}
	return rpp.rf.AppendEntries(args, reply)
}

func (rpp *RPCProxy) Call(peer *rpc.Client, method string, args any, reply any) error {
	rpp.mu.Lock()
	if rpp.numCallsBeforeDrop == 0 {
		rpp.mu.Unlock()
		// rpp.rf.dlog("drop Call %s: %v", method, args)
		return fmt.Errorf("RPC failed")
	} else {
		if rpp.numCallsBeforeDrop > 0 {
			rpp.numCallsBeforeDrop--
		}
		rpp.mu.Unlock()
		return peer.Call(method, args, reply)
	}
}

func (rpp *RPCProxy) DropCallsAfterN(n int) {
	rpp.mu.Lock()
	defer rpp.mu.Unlock()

	rpp.numCallsBeforeDrop = n
}

func (rpp *RPCProxy) DontDropCalls() {
	rpp.mu.Lock()
	defer rpp.mu.Unlock()

	rpp.numCallsBeforeDrop = -1
}
